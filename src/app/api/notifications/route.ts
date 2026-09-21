import { route, readBody, unwrap, unwrapList, json } from '@/lib/api';
import { z } from 'zod';

const log = z.object({
  kind: z.enum(['morning', 'check_in', 'goal', 'streak', 'milestone', 'future_self', 'system']),
  title: z.string().trim().min(1).max(120), body: z.string().trim().max(300).default(''),
});
export const GET = route(async ({ supabase }) =>
  json(unwrapList(await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(50))));

/** The browser logs a reminder here when it actually fires one (also powers the in-app inbox). */
export const POST = route(async ({ supabase, user, req }) => {
  const b = await readBody(req, log);
  return json(unwrap(await supabase.from('notifications').insert({ ...b, user_id: user.id }).select().single()), 201);
});
export const PATCH = route(async ({ supabase, user }) => {
  const { error } = await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id', user.id).is('read_at', null);
  if (error) unwrap({ data: null, error });
  return json({ ok: true });
});
