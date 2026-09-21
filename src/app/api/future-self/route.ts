import { route, readBody, unwrap, json, ApiError } from '@/lib/api';
import { futureCreate } from '@/lib/schemas';

/** Locked entries come back with message = null (enforced inside the database, not here). */
export const GET = route(async ({ supabase }) => json(unwrap(await supabase.rpc('list_future_self')) ?? []));

export const POST = route(async ({ supabase, user, req, today }) => {
  const b = await readBody(req, futureCreate);
  if (b.deliver_on <= today) throw new ApiError(422, 'Pick a date in the future.');
  for (const id of [b.photo_media_id, b.media_id].filter((x): x is string => !!x)) {
    unwrap(await supabase.from('media_files').select('id').eq('id', id).eq('status', 'ready').single()); // RLS: must be your own upload
  }
  // No .select(): locked rows cannot be read back, by design.
  const { error } = await supabase.from('future_self').insert({ ...b, user_id: user.id });
  if (error) unwrap({ data: null, error });
  return json({ ok: true, deliver_on: b.deliver_on }, 201);
});
