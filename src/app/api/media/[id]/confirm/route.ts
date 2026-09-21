import { route, readBody, unwrap, unwrapList, json, ApiError } from '@/lib/api';
import { mediaConfirm } from '@/lib/schemas';
import { MEDIA_RULES } from '@/lib/media';
import { createAdminClient } from '@/lib/supabase/admin';

/** Step 2: verify the object really landed (size + type) before it counts. Handles "replace" rules per purpose. */
export const POST = route(async ({ supabase, user, params, req }) => {
  const { duration_seconds } = await readBody(req, mediaConfirm);
  const m = unwrap(await supabase.from('media_files').select('*').eq('id', params.id).single());
  const admin = createAdminClient();
  const dir = m.storage_path.split('/').slice(0, -1).join('/');
  const file = m.storage_path.split('/').pop()!;
  const { data: found } = await admin.storage.from(m.bucket).list(dir, { search: file, limit: 5 });
  const obj = found?.find((f) => f.name === file);
  const size = Number((obj?.metadata as { size?: number } | undefined)?.size ?? 0);
  const rule = MEDIA_RULES[m.purpose as keyof typeof MEDIA_RULES];
  if (!obj || size <= 0 || size > rule.maxBytes) {
    await admin.storage.from(m.bucket).remove([m.storage_path]);
    await supabase.from('media_files').delete().eq('id', m.id);
    throw new ApiError(422, 'The upload did not complete. Try again.');
  }
  unwrap(await supabase.from('media_files').update({ status: 'ready', size_bytes: size }).eq('id', m.id).select('id').single());

  // Replace semantics: one promise / one strict photo per challenge, one avatar per user.
  const removeOld = async (rows: { id: string; bucket: string; storage_path: string }[]) => {
    for (const r of rows) {
      await admin.storage.from(r.bucket).remove([r.storage_path]);
      await supabase.from('media_files').delete().eq('id', r.id);
    }
  };
  if (m.purpose === 'promise') {
    const old = unwrapList(await supabase.from('media_files').select('id, bucket, storage_path').eq('challenge_id', m.challenge_id).eq('purpose', 'promise').neq('id', m.id));
    await removeOld(old);
    unwrap(await supabase.from('promise_recordings').insert({ user_id: user.id, challenge_id: m.challenge_id, media_file_id: m.id, duration_seconds: duration_seconds ?? null }).select('id').single());
  } else if (m.purpose === 'strict_photo') {
    await removeOld(unwrapList(await supabase.from('media_files').select('id, bucket, storage_path').eq('challenge_id', m.challenge_id).eq('purpose', 'strict_photo').neq('id', m.id)));
  } else if (m.purpose === 'avatar') {
    await removeOld(unwrapList(await supabase.from('media_files').select('id, bucket, storage_path').eq('purpose', 'avatar').neq('id', m.id)));
    unwrap(await supabase.from('profiles').update({ avatar_media_id: m.id }).eq('user_id', user.id).select('user_id').single());
  }
  return json({ id: m.id, purpose: m.purpose });
});
