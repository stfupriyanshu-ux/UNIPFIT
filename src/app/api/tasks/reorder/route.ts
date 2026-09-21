import { route, readBody, unwrap, json } from '@/lib/api';
import { z } from 'zod';
import { uuid } from '@/lib/schemas';

export const POST = route(async ({ supabase, req }) => {
  const { ids } = await readBody(req, z.object({ ids: z.array(uuid).min(1).max(500) }));
  await Promise.all(ids.map(async (id, i) => unwrap(await supabase.from('tasks').update({ position: i + 1 }).eq('id', id).select('id').single())));
  return json({ ok: true });
});
