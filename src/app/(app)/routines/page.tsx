'use client';
import { useState } from 'react';
import { Button, Card, EmptyState, ErrorBanner, Field, Input, Loading, PageTitle, Select, Toggle } from '@/components/ui';
import { api, toast, useApi } from '@/lib/client';

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function RoutinesPage() {
  const { data, error, loading, reload } = useApi<any[]>('/api/routines');
  const [title, setTitle] = useState('');
  const [freq, setFreq] = useState('daily');
  const [days, setDays] = useState<number[]>([]);
  const [time, setTime] = useState('');
  const run = async (fn: () => Promise<unknown>) => { try { await fn(); reload(); } catch (e) { toast((e as Error).message, 'error'); } };

  return (
    <>
      <PageTitle title="Routines" sub="Small things, done on repeat." />
      <form onSubmit={(e) => { e.preventDefault(); run(async () => { await api('/api/routines', { body: { title, frequency: freq, days_of_week: freq === 'weekly' ? days : [], time_of_day: time || null } }); setTitle(''); setDays([]); setTime(''); }); }}
        className="mb-5 grid gap-3 rounded-2xl border border-line bg-surface p-4">
        <Field label="Routine"><Input required maxLength={120} placeholder="Morning stretch" value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="How often"><Select value={freq} onChange={(e) => setFreq(e.target.value)}><option value="daily">Every day</option><option value="weekly">Certain days</option></Select></Field>
          <Field label="Time (optional)"><Input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></Field>
        </div>
        {freq === 'weekly' && <div className="flex flex-wrap gap-2" role="group" aria-label="Days">{DOW.map((d, i) => (
          <button type="button" key={d} aria-pressed={days.includes(i)} onClick={() => setDays(days.includes(i) ? days.filter((x) => x !== i) : [...days, i])}
            className={`min-h-9 rounded-full px-3 text-sm font-semibold ${days.includes(i) ? 'bg-brand text-brand-ink' : 'bg-raised'}`}>{d}</button>))}</div>}
        <Button type="submit">Add routine</Button>
      </form>

      {loading ? <Loading /> : error ? <ErrorBanner message={error} onRetry={reload} /> : !data?.length ? <EmptyState title="No routines yet" body="Add something you want to do on a rhythm." /> : (
        <div className="grid gap-3">{data.map((r) => (
          <Card key={r.id} className="grid gap-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0"><h2 className="truncate font-display text-lg font-bold">{r.title}</h2>
                <p className="text-xs text-muted">{r.frequency === 'daily' ? 'Every day' : r.days_of_week.map((d: number) => DOW[d]).join(', ') || 'Weekly'}{r.time_of_day ? `, ${r.time_of_day.slice(0, 5)}` : ''}</p></div>
              <Toggle checked={r.active} label={`${r.title} active`} onChange={(v) => run(() => api(`/api/routines/${r.id}`, { method: 'PATCH', body: { active: v } }))} />
            </div>
            <div>
              <div className="mb-1 flex justify-between text-sm"><span className="text-muted">Last 30 days</span><span className="font-semibold tabular">{r.completionPct30d}% ({r.doneCount30d}/{r.dueCount30d})</span></div>
              <div className="h-2 overflow-hidden rounded-full bg-raised"><div className="h-full bg-done" style={{ width: `${r.completionPct30d}%` }} /></div>
            </div>
            <div className="flex gap-2">
              {r.scheduledToday && <Button small variant={r.doneToday ? 'ghost' : 'primary'} onClick={() => run(() => api(`/api/routines/${r.id}/log`, { body: {} }))}>{r.doneToday ? 'Done today (undo)' : 'Mark done today'}</Button>}
              <Button small variant="ghost" onClick={() => confirm('Delete this routine and its history?') && run(() => api(`/api/routines/${r.id}`, { method: 'DELETE' }))}>Delete</Button>
            </div>
          </Card>))}</div>
      )}
    </>
  );
}
