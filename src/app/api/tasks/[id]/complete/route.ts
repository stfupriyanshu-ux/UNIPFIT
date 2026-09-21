import { route, readBody, unwrap, json } from '@/lib/api';
import { z } from 'zod';
import { isoDate } from '@/lib/schemas';

/** Toggle complete/uncomplete for a date (default today). */
export const POST = route(async ({ supabase, user, params, req, today }) => {
  const body = await readBody(req, z.object({ date: isoDate.optional() }).default({}));
  const date = body.date ?? today;
  unwrap(await supabase.from('tasks').select('id').eq('id', params.id).single());
  const { data: existing } = await supabase.from('task_completions').select('id').eq('task_id', params.id).eq('completion_date', date).maybeSingle();
  if (existing) {
    unwrap(await supabase.from('task_completions').delete().eq('id', existing.id).select('id').single());
    return json({ done: false });
  }
  unwrap(await supabase.from('task_completions').insert({ user_id: user.id, task_id: params.id, completion_date: date }).select('id').single());
  return json({ done: true });
});
