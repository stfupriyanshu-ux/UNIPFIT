import { route, unwrap, json, ApiError } from '@/lib/api';

/** Undo a check-in, but only for today (history can't be rewritten). */
export const DELETE = route(async ({ supabase, params, today }) => {
  const row = unwrap(await supabase.from('check_ins').select('id, check_date').eq('id', params.id).single());
  if (row.check_date !== today) throw new ApiError(422, 'Only today\'s check-in can be undone.');
  unwrap(await supabase.from('check_ins').delete().eq('id', params.id).select('id').single());
  return json({ ok: true });
});
