import { route, readBody, unwrap, json } from '@/lib/api';
import { milestoneUpdate } from '@/lib/schemas';

export const PATCH = route(async ({ supabase, params, req }) => {
  const { achieved, ...rest } = await readBody(req, milestoneUpdate);
  const patch: Record<string, unknown> = { ...rest };
  if (achieved !== undefined) patch.achieved_at = achieved ? new Date().toISOString() : null;
  return json(unwrap(await supabase.from('milestones').update(patch).eq('id', params.id).select().single()));
});
export const DELETE = route(async ({ supabase, params }) => {
  unwrap(await supabase.from('milestones').delete().eq('id', params.id).select('id').single());
  return json({ ok: true });
});
