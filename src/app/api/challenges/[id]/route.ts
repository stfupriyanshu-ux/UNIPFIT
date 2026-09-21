import { route, readBody, unwrap, unwrapList, fetchAll, json, ApiError } from '@/lib/api';
import { challengeUpdate } from '@/lib/schemas';
import { computeStats, type CheckInLite } from '@/lib/streaks';
import { createAdminClient } from '@/lib/supabase/admin';

export const GET = route(async ({ supabase, params, today }) => {
  const challenge = unwrap(await supabase.from('challenges').select('*').eq('id', params.id).single());
  const checkIns = await fetchAll<CheckInLite & { id: string; miss_reason: string | null; checked_at: string }>((f, t) =>
    supabase.from('check_ins').select('id, check_date, status, miss_reason, checked_at').eq('challenge_id', params.id).order('check_date').range(f, t));
  const media = unwrapList(await supabase.from('media_files').select('id, purpose, mime_type, status').eq('challenge_id', params.id).eq('status', 'ready').in('purpose', ['promise', 'strict_photo']));
  const promise = unwrapList(await supabase.from('promise_recordings').select('id, media_file_id, duration_seconds, created_at').eq('challenge_id', params.id))[0] ?? null;
  const milestones = unwrapList(await supabase.from('milestones').select('id, title, achieved_at').eq('challenge_id', params.id).order('achieved_at'));
  return json({
    challenge, checkIns, stats: computeStats(challenge, checkIns, today), milestones,
    promise: promise ? { ...promise, mime_type: media.find((m) => m.id === promise.media_file_id)?.mime_type ?? null } : null,
    strictPhotoId: media.find((m) => m.purpose === 'strict_photo')?.id ?? null,
  });
});

export const PATCH = route(async ({ supabase, params, req }) => {
  const b = await readBody(req, challengeUpdate);
  if (b.end_date) {
    const c = unwrap(await supabase.from('challenges').select('start_date').eq('id', params.id).single());
    const last = unwrapList(await supabase.from('check_ins').select('check_date').eq('challenge_id', params.id).order('check_date', { ascending: false }).limit(1))[0];
    if (b.end_date < c.start_date || (last && b.end_date < last.check_date)) throw new ApiError(422, 'End date cannot be before your start or your latest check-in.');
  }
  return json(unwrap(await supabase.from('challenges').update(b).eq('id', params.id).select().single()));
});

export const DELETE = route(async ({ supabase, params }) => {
  // Remove stored files first (DB rows cascade), after RLS confirms the challenge is the caller's.
  unwrap(await supabase.from('challenges').select('id').eq('id', params.id).single());
  const files = unwrapList(await supabase.from('media_files').select('bucket, storage_path').eq('challenge_id', params.id));
  const admin = createAdminClient();
  for (const bucket of ['promises', 'photos', 'future-self']) {
    const paths = files.filter((f) => f.bucket === bucket).map((f) => f.storage_path);
    if (paths.length) await admin.storage.from(bucket).remove(paths);
  }
  unwrap(await supabase.from('challenges').delete().eq('id', params.id).select('id').single());
  return json({ ok: true });
});
