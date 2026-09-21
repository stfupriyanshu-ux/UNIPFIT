import { route, unwrap, unwrapList, fetchAll, json } from '@/lib/api';
import { computeStats, type CheckInLite } from '@/lib/streaks';

type Ci = CheckInLite & { miss_reason: string | null };

/** Final report. Unlocks when the challenge ends (or is marked completed); ?preview=1 shows it early. */
export const GET = route(async ({ supabase, params, req, today }) => {
  const preview = new URL(req.url).searchParams.get('preview') === '1';
  const challenge = unwrap(await supabase.from('challenges').select('*').eq('id', params.id).single());
  const checkIns = await fetchAll<Ci>((f, t) =>
    supabase.from('check_ins').select('check_date, status, miss_reason').eq('challenge_id', params.id).order('check_date').range(f, t));
  const stats = computeStats(challenge, checkIns, today);
  const available = stats.phase === 'ended' || challenge.status === 'completed' || preview;
  if (!available) return json({ available: false, challenge, stats, daysLeft: stats.daysLeft });

  const notes = unwrapList(await supabase.from('daily_notes').select('note_date, content').eq('challenge_id', params.id).order('note_date'));
  const milestones = unwrapList<{ title: string; achieved_at: string | null }>(await supabase.from('milestones').select('title, achieved_at').eq('challenge_id', params.id).not('achieved_at', 'is', null).order('achieved_at'));
  const media = unwrapList<{ id: string; purpose: string; note_date: string | null }>(await supabase.from('media_files').select('id, purpose, note_date').eq('challenge_id', params.id).eq('status', 'ready'));
  const promise = unwrapList<{ media_file_id: string; duration_seconds: number | null }>(await supabase.from('promise_recordings').select('media_file_id, duration_seconds').eq('challenge_id', params.id))[0] ?? null;
  const sessions = await fetchAll<{ duration_seconds: number }>((f, t) =>
    supabase.from('timer_sessions').select('duration_seconds').eq('status', 'stopped').gte('session_date', challenge.start_date).lte('session_date', challenge.end_date).order('session_date').range(f, t));

  const monthly = new Map<string, { month: string; yes: number; no: number; skipped: number }>();
  for (const c of checkIns) {
    const m = c.check_date.slice(0, 7);
    const row = monthly.get(m) ?? { month: m, yes: 0, no: 0, skipped: 0 };
    row[c.status] += 1; monthly.set(m, row);
  }
  const timeline = [
    { date: challenge.start_date, type: 'start', text: challenge.day_one_message || 'Day 1. The promise was made.' },
    ...milestones.map((m) => ({ date: (m.achieved_at ?? '').slice(0, 10), type: 'milestone', text: m.title })),
    ...checkIns.filter((c) => c.status === 'no').map((c) => ({ date: c.check_date, type: 'missed', text: c.miss_reason ?? 'Missed' })),
    ...(stats.phase === 'ended' ? [{ date: challenge.end_date, type: 'end', text: `Finished with ${stats.completed} of ${stats.totalDays} days completed.` }] : []),
  ].sort((a, b) => a.date.localeCompare(b.date));

  return json({
    available: true, preview: preview && stats.phase !== 'ended', challenge, stats,
    dayOneMessage: challenge.day_one_message, promiseMediaId: promise?.media_file_id ?? null,
    focusSeconds: sessions.reduce((a, s) => a + (s.duration_seconds ?? 0), 0),
    checkIns, notes, milestones, monthly: [...monthly.values()], timeline,
    photoIds: media.filter((m) => m.purpose === 'note_photo' || m.purpose === 'strict_photo').map((m) => ({ id: m.id, date: m.note_date })),
  });
});
