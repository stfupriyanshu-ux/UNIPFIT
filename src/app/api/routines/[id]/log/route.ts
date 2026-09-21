import { route, unwrap, json } from '@/lib/api';

/** Toggle today's completion for a routine. */
export const POST = route(async ({ supabase, user, params, today }) => {
  unwrap(await supabase.from('routines').select('id').eq('id', params.id).single());
  const { data: existing } = await supabase.from('routine_logs').select('id').eq('routine_id', params.id).eq('log_date', today).maybeSingle();
  if (existing) {
    unwrap(await supabase.from('routine_logs').delete().eq('id', existing.id).select('id').single());
    return json({ done: false });
  }
  unwrap(await supabase.from('routine_logs').insert({ user_id: user.id, routine_id: params.id, log_date: today }).select('id').single());
  return json({ done: true });
});
