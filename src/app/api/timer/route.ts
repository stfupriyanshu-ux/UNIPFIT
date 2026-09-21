import type { SupabaseClient } from '@supabase/supabase-js';
import { route, readBody, unwrap, unwrapList, fetchAll, json, ApiError } from '@/lib/api';
import { timerAction } from '@/lib/schemas';
import { startOfMonth, startOfWeek } from '@/lib/dates';

interface Session {
  id: string; task_id: string | null; session_date: string; start_time: string; end_time: string | null;
  paused_at: string | null; paused_seconds: number; duration_seconds: number | null; status: 'running' | 'paused' | 'stopped';
}
const elapsed = (s: Session, now = Date.now()) => {
  const end = s.end_time ? Date.parse(s.end_time) : now;
  const pausedNow = s.paused_at && !s.end_time ? now - Date.parse(s.paused_at) : 0;
  return Math.max(0, Math.floor((end - Date.parse(s.start_time) - s.paused_seconds * 1000 - pausedNow) / 1000));
};

async function snapshot(supabase: SupabaseClient, today: string) {
  const active = unwrapList<Session>(await supabase.from('timer_sessions').select('*').in('status', ['running', 'paused']).limit(1))[0] ?? null;
  const stopped = await fetchAll<{ session_date: string; duration_seconds: number }>((f, t) =>
    supabase.from('timer_sessions').select('session_date, duration_seconds').eq('status', 'stopped').order('session_date').range(f, t));
  const week = startOfWeek(today), month = startOfMonth(today);
  const sum = (pred: (d: string) => boolean) => stopped.filter((s) => pred(s.session_date)).reduce((a, s) => a + (s.duration_seconds ?? 0), 0);
  const live = active ? elapsed(active) : 0;
  const recent = unwrapList<Session>(await supabase.from('timer_sessions').select('*').eq('status', 'stopped').order('start_time', { ascending: false }).limit(20));
  const taskIds = [...new Set([...recent.map((s) => s.task_id), active?.task_id].filter((x): x is string => !!x))];
  const tasks = taskIds.length ? unwrapList<{ id: string; title: string }>(await supabase.from('tasks').select('id, title').in('id', taskIds)) : [];
  const task = tasks.find((t) => t.id === active?.task_id) ?? null;
  return {
    active: active ? { ...active, elapsed_seconds: live, task } : null,
    totals: { today: sum((d) => d === today) + live, week: sum((d) => d >= week) + live, month: sum((d) => d >= month) + live, lifetime: sum(() => true) + live },
    recent: recent.map((s) => ({ ...s, task_title: tasks.find((t) => t.id === s.task_id)?.title ?? null })),
    serverNow: new Date().toISOString(),
  };
}

export const GET = route(async ({ supabase, today }) => json(await snapshot(supabase, today)));

/** START -> PAUSE -> RESUME -> STOP, all persisted with server timestamps. */
export const POST = route(async ({ supabase, user, req, today }) => {
  const b = await readBody(req, timerAction);
  const nowIso = new Date().toISOString(), now = Date.now();
  const active = unwrapList<Session>(await supabase.from('timer_sessions').select('*').in('status', ['running', 'paused']).limit(1))[0];

  if (b.action === 'start') {
    if (active) throw new ApiError(409, 'A timer is already running. Finish it first.');
    unwrap(await supabase.from('timer_sessions').insert({
      user_id: user.id, task_id: b.task_id ?? null, session_date: today, start_time: nowIso, status: 'running',
    }).select('id').single());
  } else {
    if (!active) throw new ApiError(409, 'No timer is running.');
    if (b.action === 'pause') {
      if (active.status !== 'running') throw new ApiError(409, 'Timer is already paused.');
      unwrap(await supabase.from('timer_sessions').update({ status: 'paused', paused_at: nowIso }).eq('id', active.id).eq('status', 'running').select('id').single());
    } else if (b.action === 'resume') {
      if (active.status !== 'paused' || !active.paused_at) throw new ApiError(409, 'Timer is not paused.');
      const add = Math.max(0, Math.floor((now - Date.parse(active.paused_at)) / 1000));
      unwrap(await supabase.from('timer_sessions').update({ status: 'running', paused_at: null, paused_seconds: active.paused_seconds + add })
        .eq('id', active.id).eq('status', 'paused').select('id').single());
    } else {
      const pausedExtra = active.paused_at ? Math.max(0, Math.floor((now - Date.parse(active.paused_at)) / 1000)) : 0;
      const paused_seconds = active.paused_seconds + pausedExtra;
      const duration = Math.max(0, Math.floor((now - Date.parse(active.start_time)) / 1000) - paused_seconds);
      unwrap(await supabase.from('timer_sessions').update({
        status: 'stopped', end_time: nowIso, paused_at: null, paused_seconds, duration_seconds: duration,
      }).eq('id', active.id).neq('status', 'stopped').select('id').single());
    }
  }
  return json(await snapshot(supabase, today));
});
