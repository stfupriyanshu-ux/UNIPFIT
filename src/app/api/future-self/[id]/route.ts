import { route, unwrap, json } from '@/lib/api';

/** RLS only lets you delete a message after it has unlocked. */
export const DELETE = route(async ({ supabase, params }) => {
  unwrap(await supabase.from('future_self').delete().eq('id', params.id).select('id').single());
  return json({ ok: true });
});
