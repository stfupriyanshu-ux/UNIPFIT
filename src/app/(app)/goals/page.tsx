'use client';
import { useState } from 'react';
import { Button, Card, EmptyState, ErrorBanner, Field, Input, Loading, PageTitle, Textarea } from '@/components/ui';
import { api, prettyDate, toast, useApi } from '@/lib/client';

export default function GoalsPage() {
  const { data, error, loading, reload } = useApi<any[]>('/api/goals');
  const [f, setF] = useState({ title: '', target_value: '100', unit: '', deadline: '', description: '' });
  const run = async (fn: () => Promise<unknown>, ok?: string) => { try { await fn(); if (ok) toast(ok); reload(); } catch (e) { toast((e as Error).message, 'error'); } };

  const add = (e: React.FormEvent) => { e.preventDefault(); return run(async () => {
    await api('/api/goals', { body: { title: f.title, description: f.description, target_value: Number(f.target_value), unit: f.unit, deadline: f.deadline || null } });
    setF({ title: '', target_value: '100', unit: '', deadline: '', description: '' });
  }, 'Goal added'); };

  return (
    <>
      <PageTitle title="Goals" sub="Bigger than a habit. Measured by you." />
      <form onSubmit={add} className="mb-5 grid gap-3 rounded-2xl border border-line bg-surface p-4">
        <Field label="Goal"><Input required maxLength={120} placeholder="Read 24 books" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Target"><Input type="number" min={1} required value={f.target_value} onChange={(e) => setF({ ...f, target_value: e.target.value })} /></Field>
          <Field label="Unit"><Input maxLength={20} placeholder="books" value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })} /></Field>
          <Field label="Deadline"><Input type="date" value={f.deadline} onChange={(e) => setF({ ...f, deadline: e.target.value })} /></Field>
        </div>
        <Field label="Why it matters (optional)"><Textarea className="min-h-16" maxLength={1000} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
        <Button type="submit">Add goal</Button>
      </form>

      {loading ? <Loading /> : error ? <ErrorBanner message={error} onRetry={reload} /> : !data?.length ? <EmptyState title="No goals yet" body="Set a target and track it as you go." /> : (
        <div className="grid gap-3">{data.map((g) => <GoalCard key={g.id} g={g} run={run} />)}</div>
      )}
    </>
  );
}

function GoalCard({ g, run }: { g: any; run: (fn: () => Promise<unknown>, ok?: string) => Promise<void> }) {
  const [val, setVal] = useState(String(g.current_value));
  const [ms, setMs] = useState('');
  const [msVal, setMsVal] = useState('');
  return (
    <Card className="grid gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0"><h2 className="font-display text-xl font-bold">{g.title}</h2>
          <p className="text-sm text-muted tabular">{g.current_value} of {g.target_value} {g.unit}{g.deadline ? `, due ${prettyDate(g.deadline)}` : ''}{g.status === 'completed' ? '. Completed!' : ''}</p></div>
        <span className="font-display text-2xl font-extrabold tabular">{Math.round(g.progress_pct)}%</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-raised" role="progressbar" aria-valuenow={g.progress_pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${g.title} progress`}>
        <div className="h-full bg-sun transition-all" style={{ width: `${g.progress_pct}%` }} />
      </div>
      <div className="flex gap-2">
        <Input type="number" min={0} aria-label="Current progress" value={val} onChange={(e) => setVal(e.target.value)} />
        <Button small onClick={() => run(() => api(`/api/goals/${g.id}`, { method: 'PATCH', body: { current_value: Number(val) } }), 'Progress updated')}>Update</Button>
      </div>
      {g.milestones.length > 0 && (
        <ul className="grid gap-1.5">{g.milestones.map((m: any) => (
          <li key={m.id} className="flex items-center gap-2 text-sm">
            <button aria-label={m.achieved_at ? `Mark ${m.title} not done` : `Mark ${m.title} done`} aria-pressed={!!m.achieved_at}
              onClick={() => run(() => api(`/api/milestones/${m.id}`, { method: 'PATCH', body: { achieved: !m.achieved_at } }))}
              className={`grid h-6 w-6 shrink-0 place-items-center rounded-md border-2 ${m.achieved_at ? 'border-done bg-done text-white' : 'border-line'}`}>{m.achieved_at && '✓'}</button>
            <span className={`flex-1 ${m.achieved_at ? 'text-muted line-through' : ''}`}>{m.title}{m.target_value != null ? ` (${m.target_value})` : ''}</span>
            <button aria-label={`Delete ${m.title}`} onClick={() => run(() => api(`/api/milestones/${m.id}`, { method: 'DELETE' }))} className="px-2 text-muted">×</button>
          </li>))}</ul>
      )}
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); run(async () => { await api('/api/milestones', { body: { goal_id: g.id, title: ms, target_value: msVal ? Number(msVal) : null } }); setMs(''); setMsVal(''); }); }}>
        <Input aria-label="New milestone" placeholder="Add milestone" maxLength={120} required value={ms} onChange={(e) => setMs(e.target.value)} />
        <Input aria-label="Milestone value" type="number" min={0} className="!w-24" placeholder="At" value={msVal} onChange={(e) => setMsVal(e.target.value)} />
        <Button small type="submit" variant="ghost">Add</Button>
      </form>
      <Button small variant="ghost" onClick={() => confirm('Delete this goal?') && run(() => api(`/api/goals/${g.id}`, { method: 'DELETE' }), 'Goal deleted')}>Delete goal</Button>
    </Card>
  );
}
