import { route, readBody, unwrap, unwrapList, json } from '@/lib/api';
import { milestoneCreate } from '@/lib/schemas';

export const GET = route(async ({ supabase }) =>
  json(unwrapList(await supabase.from('milestones').select('*').order('achieved_at', { ascending: false, nullsFirst: false }).limit(200))));

export const POST = route(async ({ supabase, user, req }) => {
  const b = await readBody(req, milestoneCreate);
  return json(unwrap(await supabase.from('milestones').insert({ ...b, user_id: user.id }).select().single()), 201);
});
