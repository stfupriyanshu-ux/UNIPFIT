import { route, unwrap, unwrapList, json, ApiError } from '@/lib/api';
import { createAdminClient } from '@/lib/supabase/admin';

/** Short-lived signed URL for private media. Future-self media stays sealed until its date. */
export const GET = route(async ({ supabase, params }) => {
  const m = unwrap(await supabase.from('media_files').select('id, bucket, storage_path, purpose, mime_type, status').eq('id', params.id).single());
  if (m.status !== 'ready') throw new ApiError(404, 'Not found.');
  if (m.purpose.startsWith('future_')) {
    const rows = unwrap(await supabase.rpc('list_future_self')) as { locked: boolean; photo_media_id: string | null; media_id: string | null }[];
    if (!rows.some((r) => !r.locked && (r.photo_media_id === m.id || r.media_id === m.id))) throw new ApiError(403, 'This is sealed until its date.');
  }
  const { data, error } = await createAdminClient().storage.from(m.bucket).createSignedUrl(m.storage_path, 3600);
  if (error || !data) throw new ApiError(500, 'Could not load that file.');
  return json({ url: data.signedUrl, mime_type: m.mime_type });
});

export const DELETE = route(async ({ supabase, params }) => {
  const m = unwrap(await supabase.from('media_files').select('id, bucket, storage_path, purpose').eq('id', params.id).single());
  await createAdminClient().storage.from(m.bucket).remove([m.storage_path]);
  unwrap(await supabase.from('media_files').delete().eq('id', m.id).select('id').single()); // promise_recordings cascades
  return json({ ok: true });
});
