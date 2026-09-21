import { route, unwrap, fetchAll, json } from '@/lib/api';

const TABLES = ['profiles', 'challenges', 'check_ins', 'daily_notes', 'goals', 'milestones', 'routines', 'routine_logs', 'tasks',
  'task_completions', 'timer_sessions', 'media_files', 'promise_recordings', 'notifications', 'ai_conversations'];

/** Everything you own, as JSON. Sealed future-self messages stay sealed (message = null) until their date. */
export const GET = route(async ({ supabase, user }) => {
  const out: Record<string, unknown> = { exported_at: new Date().toISOString(), user: { id: user.id, email: user.email } };
  for (const t of TABLES) out[t] = await fetchAll((f, to) => supabase.from(t).select('*').range(f, to));
  out.future_self = unwrap(await supabase.rpc('list_future_self')) ?? [];
  return new Response(JSON.stringify(out, null, 2), {
    headers: { 'Content-Type': 'application/json', 'Content-Disposition': 'attachment; filename="univzero-export.json"' },
  });
});
