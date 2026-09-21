import { route, readBody, unwrap, unwrapList, fetchAll, json, ApiError } from '@/lib/api';
import { checkInCreate } from '@/lib/schemas';
import { computeStats, type CheckInLite } from '@/lib/streaks';
import { awardChallengeMilestones } from '@/lib/milestones';

export const GET = route(async ({ supabase, req }) => {
  const id = new URL(req.url).searchParams.get('challenge_id');
  if (!id) throw new ApiError(400, 'challenge_id is required.');
  return json(unwrapList(await supabase.from('check_ins').select('*').eq('challenge_id', id).order('check_date')));
});

export const POST = route(async ({ supabase, user, req, today }) => {
  const b = await readBody(req, checkInCreate);
  const challenge = unwrap(await supabase.from('challenges').select('*').eq('id', b.challenge_id).single());
  const date = b.date ?? today;
  if (date > today) throw new ApiError(422, 'You can only check in for today or earlier.');
  if (date < challenge.start_date || date > challenge.end_date) throw new ApiError(422, 'That date is outside this challenge.');
  if (challenge.status !== 'active') throw new ApiError(422, 'Resume this challenge before checking in.');

  // unique(challenge_id, check_date) makes duplicates impossible even under races -> 409
  const { data, error } = await supabase.from('check_ins').insert({
    user_id: user.id, challenge_id: b.challenge_id, check_date: date, status: b.status,
    miss_reason: b.status === 'no' ? b.reason : null, checked_at: new Date().toISOString(),
  }).select().single();
  if (error?.code === '23505') throw new ApiError(409, 'You already checked in for that day.');
  const checkIn = unwrap({ data, error });

  const all = await fetchAll<CheckInLite>((f, t) =>
    supabase.from('check_ins').select('check_date, status').eq('challenge_id', b.challenge_id).order('check_date').range(f, t));
  const stats = computeStats(challenge, all, today);
  const newMilestones = b.status === 'yes' ? await awardChallengeMilestones(supabase, user.id, challenge, stats) : [];
  return json({ checkIn, stats, newMilestones }, 201);
});
