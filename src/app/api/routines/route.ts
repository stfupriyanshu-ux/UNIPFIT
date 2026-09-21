import { route, readBody, unwrap, unwrapList, fetchAll, json } from '@/lib/api';
import { routineCreate } from '@/lib/schemas';
import { addDays, weekday } from '@/lib/dates';

const scheduled = (r: { frequency: string; days_of_week: number[] }, date: string) =>
  r.frequency === 'daily' || r.days_of_week.length === 0 || r.days_of_week.includes(weekday(date));

/** Routines with today's status and a 30-day completion percentage computed from routine_logs. */
export const GET = route(async ({ supabase, today }) => {
  const routines = unwrapList(await supabase.from('routines').select('*').order('created_at'));
  const from = addDays(today, -29);
  const logs = await fetchAll<{ routine_id: string; log_date: string }>((f, t) =>
    supabase.from('routine_logs').select('routine_id, log_date').gte('log_date', from).lte('log_date', today).order('log_date').range(f, t));
  return json(routines.map((r) => {
    const start = r.created_at.slice(0, 10) > from ? r.created_at.slice(0, 10) : from;
    let due = 0;
    for (let d = start; d <= today; d = addDays(d, 1)) if (scheduled(r, d)) due++;
    const mine = logs.filter((l) => l.routine_id === r.id && l.log_date >= start && scheduled(r, l.log_date));
    return {
      ...r, scheduledToday: scheduled(r, today), doneToday: logs.some((l) => l.routine_id === r.id && l.log_date === today),
      completionPct30d: due ? Math.min(100, Math.round((mine.length / due) * 100)) : 0, doneCount30d: mine.length, dueCount30d: due,
    };
  }));
});

export const POST = route(async ({ supabase, user, req }) => {
  const b = await readBody(req, routineCreate);
  return json(unwrap(await supabase.from('routines').insert({ ...b, user_id: user.id }).select().single()), 201);
});
