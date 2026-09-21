import { route, readBody, unwrap, unwrapList, json } from '@/lib/api';
import { taskCreate } from '@/lib/schemas';
import { isTaskVisibleOn } from '@/lib/taskSchedule';

/** ?date=YYYY-MM-DD (default today) -> tasks that apply that day, with done flag. ?all=1 -> every task. */
export const GET = route(async ({ supabase, req, today }) => {
  const sp = new URL(req.url).searchParams;
  const date = sp.get('date') ?? today;
  const tasks = unwrapList(await supabase.from('tasks').select('*').eq('archived', false).order('position').order('created_at'));
  const comps = unwrapList(await supabase.from('task_completions').select('task_id, completion_date').limit(20000));
  const doneBy = new Map<string, Set<string>>();
  for (const c of comps) { if (!doneBy.has(c.task_id)) doneBy.set(c.task_id, new Set()); doneBy.get(c.task_id)!.add(c.completion_date); }
  const out = tasks
    .map((t) => ({ ...t, done: doneBy.get(t.id)?.has(date) ?? false }))
    .filter((t) => sp.get('all') === '1' || isTaskVisibleOn(t, date, doneBy.get(t.id) ?? new Set()));
  return json(out);
});

export const POST = route(async ({ supabase, user, req }) => {
  const b = await readBody(req, taskCreate);
  const last = unwrapList(await supabase.from('tasks').select('position').order('position', { ascending: false }).limit(1))[0];
  return json(unwrap(await supabase.from('tasks').insert({ ...b, user_id: user.id, position: (last?.position ?? 0) + 1 }).select().single()), 201);
});
