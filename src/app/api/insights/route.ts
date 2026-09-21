import { route, unwrapList, fetchAll, json } from '@/lib/api';
import { addDays, diffDays, weekday } from '@/lib/dates';

const DAYS = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'];
const hm = (s: number) => (s >= 3600 ? `${(s / 3600).toFixed(1)} h` : `${Math.round(s / 60)} min`);

/** Weekly / monthly insights. Every sentence is built from stored rows; nothing is guessed. */
export const GET = route(async ({ supabase, req, today }) => {
  const period = new URL(req.url).searchParams.get('period') === 'month' ? 'month' : 'week';
  const len = period === 'week' ? 7 : 30;
  const start = addDays(today, -(len - 1)), prevStart = addDays(start, -len), prevEnd = addDays(start, -1);

  const challenges = unwrapList<{ id: string; title: string; start_date: string; end_date: string }>(
    await supabase.from('challenges').select('id, title, start_date, end_date').eq('status', 'active'));
  const checkIns = await fetchAll<{ challenge_id: string; check_date: string; status: string; miss_reason: string | null }>((f, t) =>
    supabase.from('check_ins').select('challenge_id, check_date, status, miss_reason').gte('check_date', start).lte('check_date', today).order('check_date').range(f, t));
  const sessions = await fetchAll<{ session_date: string; duration_seconds: number }>((f, t) =>
    supabase.from('timer_sessions').select('session_date, duration_seconds').eq('status', 'stopped').gte('session_date', prevStart).order('session_date').range(f, t));
  const done = unwrapList<{ completion_date: string }>(await supabase.from('task_completions').select('completion_date').gte('completion_date', start).lte('completion_date', today).limit(5000));
  const rlogs = unwrapList<{ log_date: string }>(await supabase.from('routine_logs').select('log_date').gte('log_date', start).lte('log_date', today).limit(5000));

  const items: { title: string; text: string }[] = [];
  for (const c of challenges) {
    const from = c.start_date > start ? c.start_date : start, to = c.end_date < today ? c.end_date : today;
    if (to < from) continue;
    const days = diffDays(to, from) + 1;
    const mine = checkIns.filter((x) => x.challenge_id === c.id);
    const yes = mine.filter((x) => x.status === 'yes'), no = mine.filter((x) => x.status === 'no');
    if (!mine.length) { items.push({ title: c.title, text: `No check-ins in the last ${days} days.` }); continue; }
    let text = `You completed ${yes.length} of ${days} days (${Math.round((yes.length / days) * 100)}%).`;
    if (yes.length >= 3) {
      const byDow = new Map<number, number>();
      yes.forEach((y) => byDow.set(weekday(y.check_date), (byDow.get(weekday(y.check_date)) ?? 0) + 1));
      const [best, n] = [...byDow.entries()].sort((a, b) => b[1] - a[1])[0];
      text += ` Your strongest day was ${DAYS[best]} (${n} completed).`;
    }
    if (no.length) {
      const reasons = new Map<string, number>();
      no.forEach((x) => { const r = (x.miss_reason ?? '').trim().toLowerCase(); if (r) reasons.set(r, (reasons.get(r) ?? 0) + 1); });
      const top = [...reasons.entries()].sort((a, b) => b[1] - a[1])[0];
      text += ` You logged ${no.length} missed ${no.length === 1 ? 'day' : 'days'}${top ? `; most common reason: "${top[0]}"` : ''}.`;
    }
    items.push({ title: c.title, text });
  }
  const cur = sessions.filter((s) => s.session_date >= start).reduce((a, s) => a + (s.duration_seconds ?? 0), 0);
  const prev = sessions.filter((s) => s.session_date >= prevStart && s.session_date <= prevEnd).reduce((a, s) => a + (s.duration_seconds ?? 0), 0);
  if (cur || prev) items.push({ title: 'Focus time', text: `${hm(cur)} tracked this ${period}${prev ? ` vs ${hm(prev)} the ${period} before.` : '.'}` });
  if (done.length || rlogs.length) items.push({ title: 'Tasks & routines', text: `${done.length} tasks and ${rlogs.length} routine check-offs completed.` });

  return json({ period, from: start, to: today, items, empty: items.length === 0 });
});
