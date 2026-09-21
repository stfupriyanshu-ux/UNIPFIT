import { z } from 'zod';
import { route, readBody, unwrap, unwrapList, fetchAll, json, ApiError, type Ctx } from '@/lib/api';
import { aiChat, isoDate } from '@/lib/schemas';
import { computeStats, type CheckInLite } from '@/lib/streaks';
import { addDays, startOfWeek } from '@/lib/dates';

const PERSONALITIES = {
  supportive: 'Warm, encouraging and gentle. Celebrate effort, normalise setbacks, suggest one small next step.',
  coach: 'Direct, practical and motivating like a good sports coach. Focus on the plan and the next action.',
  strict: 'Firm, no-nonsense and high-standards, but always respectful. Hold the user to their own promise. Never insult, threaten, shame or mock.',
  friend: 'Casual, upbeat and conversational, like a close friend who is on their side.',
} as const;

const TOOLS = [{
  name: 'add_tasks',
  description: 'Create tasks for the user. Use when the user asks to add/schedule tasks (in any language, e.g. "kal gym aur maths add kar do").',
  input_schema: {
    type: 'object',
    properties: {
      tasks: { type: 'array', minItems: 1, maxItems: 10, items: { type: 'object', properties: {
        title: { type: 'string', description: 'Short task title' },
        due_date: { type: 'string', description: 'YYYY-MM-DD. "kal"/"tomorrow" = today + 1 day.' },
        repeat: { type: 'string', enum: ['none', 'daily', 'weekly'] },
      }, required: ['title'] } },
    },
    required: ['tasks'],
  },
}];

const toolInput = z.object({ tasks: z.array(z.object({
  title: z.string().trim().min(1).max(200), due_date: isoDate.optional(), repeat: z.enum(['none', 'daily', 'weekly']).optional(),
})).min(1).max(10) });

/** ONLY real stored data goes into the model's context. */
async function buildContext({ supabase, today }: Ctx) {
  const challenges = unwrapList<any>(await supabase.from('challenges').select('id, title, start_date, end_date, status, strict_mode').eq('status', 'active'));
  const cis = challenges.length ? await fetchAll<CheckInLite & { challenge_id: string; miss_reason: string | null }>((f, t) =>
    supabase.from('check_ins').select('challenge_id, check_date, status, miss_reason').in('challenge_id', challenges.map((c) => c.id)).order('check_date').range(f, t)) : [];
  const goals = unwrapList<any>(await supabase.from('goals').select('title, target_value, current_value, unit, deadline, status').eq('status', 'active'));
  const routines = unwrapList<any>(await supabase.from('routines').select('title, frequency, days_of_week').eq('active', true));
  const tasks = unwrapList<any>(await supabase.from('tasks').select('title, due_date, repeat').eq('archived', false).order('position').limit(40));
  const sessions = unwrapList<any>(await supabase.from('timer_sessions').select('session_date, duration_seconds').eq('status', 'stopped').gte('session_date', startOfWeek(today)));
  const notes = unwrapList<any>(await supabase.from('daily_notes').select('note_date, content').order('note_date', { ascending: false }).limit(5));
  return {
    today,
    challenges: challenges.map((c) => {
      const mine = cis.filter((x) => x.challenge_id === c.id);
      const s = computeStats(c, mine, today);
      return { title: c.title, day: `${s.dayNumber}/${s.totalDays}`, completed: s.completed, missed: s.missed, currentStreak: s.currentStreak,
        longestStreak: s.longestStreak, completionPct: s.completionPct, checkedInToday: s.checkedInToday, strictMode: c.strict_mode,
        recentMissReasons: mine.filter((x) => x.status === 'no').slice(-3).map((x) => x.miss_reason) };
    }),
    goals, routines, tasks,
    focusSecondsThisWeek: sessions.reduce((a: number, s: any) => a + (s.duration_seconds ?? 0), 0),
    recentNotes: notes,
  };
}

export const GET = route(async ({ supabase }) =>
  json(unwrapList(await supabase.from('ai_conversations').select('id, role, content, actions, created_at').order('created_at', { ascending: false }).limit(40)).reverse()));

export const POST = route(async (ctx) => {
  const { supabase, user, req, today } = ctx;
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new ApiError(503, 'The AI coach is not configured on this server.');
  const b = await readBody(req, aiChat);

  const profile = unwrap(await supabase.from('profiles').select('ai_personality, display_name, privacy').eq('user_id', user.id).single());
  const personality = (b.personality ?? profile.ai_personality) as keyof typeof PERSONALITIES;

  const since = new Date(Date.now() - 3600_000).toISOString();
  const { count } = await supabase.from('ai_conversations').select('id', { count: 'exact', head: true }).eq('role', 'user').gte('created_at', since);
  if ((count ?? 0) >= 30) throw new ApiError(429, 'You have reached the hourly limit for coach messages. Try again a bit later.');

  const useData = profile.privacy?.ai_uses_my_data !== false;
  const context = useData ? await buildContext(ctx) : null;
  const system = [
    `You are the AI coach inside UNIVZERO, a free accountability app. Style: ${PERSONALITIES[personality]}`,
    `The user's name is ${profile.display_name || 'unknown'}. Today is ${today}. Reply in the language the user writes in (Hinglish is fine).`,
    'Use ONLY the JSON data below when talking about the user\'s activity. If something is not in the data, say you do not have it. NEVER invent check-ins, streaks, numbers, tasks or history.',
    'Never shame, insult, threaten or guilt-trip. Keep replies short (under ~120 words). Only call add_tasks when the user clearly asks to add tasks, then confirm what you created.',
    useData ? `USER DATA:\n${JSON.stringify(context)}` : 'The user has turned off data sharing with the coach, so you have no access to their activity. Say so if asked about it.',
  ].join('\n\n');

  const history = unwrapList<{ role: 'user' | 'assistant'; content: string }>(
    await supabase.from('ai_conversations').select('role, content').order('created_at', { ascending: false }).limit(10)).reverse();
  while (history.length && history[0].role !== 'user') history.shift();
  const messages: { role: string; content: unknown }[] = [...history, { role: 'user', content: b.message }];

  const actions: { type: 'tasks_created'; titles: string[] }[] = [];
  let reply = '';
  for (let turn = 0; turn < 3; turn++) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: process.env.AI_MODEL || 'claude-sonnet-5', max_tokens: 700, system, messages, tools: TOOLS }),
    });
    if (!res.ok) { console.error('[ai]', res.status, await res.text().catch(() => '')); throw new ApiError(502, 'The AI coach is unavailable right now. Try again shortly.'); }
    const data = await res.json() as { content: { type: string; text?: string; id?: string; name?: string; input?: unknown }[] };
    const uses = data.content.filter((c) => c.type === 'tool_use');
    reply = data.content.filter((c) => c.type === 'text').map((c) => c.text).join('\n').trim();
    if (!uses.length) break;

    messages.push({ role: 'assistant', content: data.content });
    const results: unknown[] = [];
    for (const u of uses) {
      const parsed = u.name === 'add_tasks' ? toolInput.safeParse(u.input) : null;
      if (!parsed?.success) { results.push({ type: 'tool_result', tool_use_id: u.id, is_error: true, content: 'Invalid input.' }); continue; }
      const last = unwrapList<{ position: number }>(await supabase.from('tasks').select('position').order('position', { ascending: false }).limit(1))[0];
      let pos = last?.position ?? 0;
      const rows = parsed.data.tasks.map((t) => ({
        user_id: user.id, title: t.title, due_date: t.due_date && t.due_date >= addDays(today, -1) ? t.due_date : today,
        repeat: t.repeat ?? 'none', position: ++pos,
      }));
      const { error } = await supabase.from('tasks').insert(rows); // user-scoped client: RLS applies
      if (error) { results.push({ type: 'tool_result', tool_use_id: u.id, is_error: true, content: 'Could not save tasks.' }); continue; }
      actions.push({ type: 'tasks_created', titles: rows.map((r) => r.title) });
      results.push({ type: 'tool_result', tool_use_id: u.id, content: JSON.stringify({ created: rows.map((r) => ({ title: r.title, due_date: r.due_date })) }) });
    }
    messages.push({ role: 'user', content: results });
  }
  if (!reply) reply = actions.length ? 'Done. I added those tasks.' : 'I could not come up with a reply. Try rephrasing.';

  await supabase.from('ai_conversations').insert([
    { user_id: user.id, personality, role: 'user', content: b.message },
    { user_id: user.id, personality, role: 'assistant', content: reply, actions },
  ]);
  return json({ reply, actions });
});
