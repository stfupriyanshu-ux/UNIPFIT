import { route, readBody, unwrap, unwrapList, json, ApiError } from '@/lib/api';
import { noteUpsert } from '@/lib/schemas';

export const GET = route(async ({ supabase, req }) => {
  const sp = new URL(req.url).searchParams;
  let q = supabase.from('daily_notes').select('*').order('note_date', { ascending: false }).limit(400);
  if (sp.get('challenge_id')) q = q.eq('challenge_id', sp.get('challenge_id')!);
  if (sp.get('date')) q = q.eq('note_date', sp.get('date')!);
  const notes = unwrapList(await q);
  const photos = notes.length
    ? unwrapList(await supabase.from('media_files').select('id, note_date, challenge_id').eq('purpose', 'note_photo').eq('status', 'ready'))
    : [];
  return json(notes.map((n) => ({ ...n, photos: photos.filter((p) => p.note_date === n.note_date && p.challenge_id === n.challenge_id).map((p) => p.id) })));
});

/** One note per (challenge, day): PUT creates or replaces it. */
export const PUT = route(async ({ supabase, user, req, today }) => {
  const b = await readBody(req, noteUpsert);
  if (b.note_date > today) throw new ApiError(422, 'Notes can be for today or earlier.');
  const { data: existing } = await supabase.from('daily_notes').select('id').eq('user_id', user.id).eq('note_date', b.note_date)
    .filter('challenge_id', b.challenge_id ? 'eq' : 'is', b.challenge_id ?? null).maybeSingle();
  const row = existing
    ? unwrap(await supabase.from('daily_notes').update({ content: b.content }).eq('id', existing.id).select().single())
    : unwrap(await supabase.from('daily_notes').insert({ user_id: user.id, challenge_id: b.challenge_id, note_date: b.note_date, content: b.content }).select().single());
  return json(row);
});
