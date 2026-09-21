import { route, readBody, unwrap, unwrapList, json, ApiError } from '@/lib/api';
import { mediaCreate } from '@/lib/schemas';
import { MEDIA_RULES, EXT, baseMime } from '@/lib/media';

export const GET = route(async ({ supabase, req }) => {
  const sp = new URL(req.url).searchParams;
  let q = supabase.from('media_files').select('id, purpose, mime_type, size_bytes, challenge_id, note_date, created_at').eq('status', 'ready').order('created_at', { ascending: false });
  if (sp.get('challenge_id')) q = q.eq('challenge_id', sp.get('challenge_id')!);
  if (sp.get('purpose')) q = q.eq('purpose', sp.get('purpose')!);
  return json(unwrapList(await q.limit(200)));
});

/** Step 1 of upload: validate type/size, reserve a row, hand back a one-time signed upload URL. */
export const POST = route(async ({ supabase, user, req }) => {
  const b = await readBody(req, mediaCreate);
  const rule = MEDIA_RULES[b.purpose];
  const mime = baseMime(b.mime);
  if (!rule.mimes.includes(mime)) throw new ApiError(415, `That file type isn't allowed. Use: ${rule.mimes.map((m) => EXT[m]).join(', ')}.`);
  if (b.size > rule.maxBytes) throw new ApiError(413, `File is too large (max ${Math.round(rule.maxBytes / 1048576)} MB).`);
  if (['promise', 'strict_photo'].includes(b.purpose)) {
    if (!b.challenge_id) throw new ApiError(422, 'challenge_id is required.');
    unwrap(await supabase.from('challenges').select('id').eq('id', b.challenge_id).single()); // RLS: must be yours
  }
  const path = `${user.id}/${b.purpose}/${crypto.randomUUID()}.${EXT[mime]}`;
  const row = unwrap(await supabase.from('media_files').insert({
    user_id: user.id, purpose: b.purpose, bucket: rule.bucket, storage_path: path, mime_type: mime, size_bytes: b.size,
    challenge_id: b.challenge_id ?? null, note_date: b.note_date ?? null, status: 'pending',
  }).select('id, bucket, storage_path').single());
  const { data, error } = await supabase.storage.from(rule.bucket).createSignedUploadUrl(path);
  if (error || !data) {
    await supabase.from('media_files').delete().eq('id', row.id);
    throw new ApiError(500, 'Could not start the upload.');
  }
  return json({ id: row.id, bucket: rule.bucket, path, token: data.token, mime }, 201);
});
