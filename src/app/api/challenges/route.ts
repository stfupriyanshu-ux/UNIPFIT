import { route, readBody, unwrap, unwrapList, fetchAll, json, ApiError } from '@/lib/api';
import { challengeCreate } from '@/lib/schemas';
import { addDays } from '@/lib/dates';
import { computeStats, type CheckInLite } from '@/lib/streaks';

export const GET = route(async ({ supabase, today }) => {
  const challenges = unwrapList(await supabase.from('challenges').select('*').neq('status', 'archived').order('created_at', { ascending: false }));
  const ids = challenges.map((c) => c.id);
  const checkIns = ids.length
    ? await fetchAll<CheckInLite & { challenge_id: string }>((f, t) =>
        supabase.from('check_ins').select('challenge_id, check_date, status').in('challenge_id', ids).order('check_date').range(f, t))
    : [];
  return json(challenges.map((c) => ({
    ...c,
    stats: computeStats(c, checkIns.filter((x) => x.challenge_id === c.id), today),
  })));
});

export const POST = route(async ({ supabase, user, req, today }) => {
  const b = await readBody(req, challengeCreate);
  const start = b.start_date ?? today;
  if (start < addDays(today, -30)) throw new ApiError(422, 'Start date can be at most 30 days ago.');
  const row = unwrap(await supabase.from('challenges').insert({
    user_id: user.id, title: b.title, description: b.description, day_one_message: b.day_one_message,
    start_date: start, end_date: addDays(start, b.duration_days - 1), strict_mode: b.strict_mode,
  }).select().single());
  return json({ ...row, stats: computeStats(row, [], today) }, 201);
});
