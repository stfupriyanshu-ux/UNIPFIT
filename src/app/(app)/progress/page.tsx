'use client';
import Link from 'next/link';
import { useState } from 'react';
import Ring from '@/components/Ring';
import { Card, EmptyState, ErrorBanner, Field, Loading, PageTitle, Select } from '@/components/ui';
import { fmtHours, prettyDate, useApi } from '@/lib/client';
import { project } from '@/lib/whatif';

export default function ProgressPage() {
  const ch = useApi<any[]>('/api/challenges');
  const timer = useApi<any>('/api/timer');
  const goals = useApi<any[]>('/api/goals');
  const ms = useApi<any[]>('/api/milestones');
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const ins = useApi<any>(`/api/insights?period=${period}`);
  const [pick, setPick] = useState('');
  const [rate, setRate] = useState(80);
  const [mins, setMins] = useState(0);

  if (ch.loading) return <Loading />;
  if (ch.error) return <ErrorBanner message={ch.error} onRetry={ch.reload} />;
  const active = (ch.data ?? []).filter((c) => c.status === 'active' && c.stats.phase !== 'upcoming');
  const target = active.find((c) => c.id === pick) ?? active[0];
  const totalDone = (ch.data ?? []).reduce((a, c) => a + c.stats.completed, 0);
  const best = Math.max(0, ...(ch.data ?? []).map((c) => c.stats.longestStreak));
  const t = timer.data?.totals;
  const w = target ? project({ totalDays: target.stats.totalDays, elapsedDays: target.stats.elapsedDays, completed: target.stats.completed, futureRatePct: rate, dailyFocusMinutes: mins }) : null;

  return (
    <div className="grid gap-5">
      <PageTitle title="Progress" sub="What you've actually done." />
      <div className="grid grid-cols-3 gap-2 text-center">
        {[['Days done', totalDays(totalDone)], ['Best streak', String(best)], ['Focus total', fmtHours(t?.lifetime ?? 0)]].map(([l, v]) => (
          <div key={l} className="rounded-2xl border border-line bg-surface p-3"><div className="font-display text-2xl font-extrabold tabular">{v}</div><div className="text-xs text-muted">{l}</div></div>))}
      </div>

      {active.length === 0 ? <EmptyState title="Nothing to chart yet" body="Check in for a few days and your progress will appear here." /> : (
        <Card className="grid gap-4">
          <h2 className="font-display text-xl font-bold">Challenges</h2>
          {active.map((c) => (
            <Link key={c.id} href={`/challenges/${c.id}`} className="flex items-center gap-4">
              <Ring pct={c.stats.completionPct} size={60} stroke={7}><span className="text-sm font-bold tabular">{Math.round(c.stats.completionPct)}%</span></Ring>
              <div className="min-w-0 flex-1"><p className="truncate font-semibold">{c.title}</p>
                <p className="text-sm text-muted tabular">{c.stats.completed} of {c.stats.totalDays} days. Streak {c.stats.currentStreak}, best {c.stats.longestStreak}. {c.stats.adherencePct}% of days so far.</p></div>
            </Link>))}
        </Card>
      )}

      <Card>
        <h2 className="mb-3 font-display text-xl font-bold">Focus time</h2>
        <div className="grid grid-cols-4 gap-2 text-center">
          {[['Today', t?.today], ['Week', t?.week], ['Month', t?.month], ['All time', t?.lifetime]].map(([l, v]) => (
            <div key={l as string} className="rounded-xl bg-raised p-2"><div className="text-[11px] text-muted">{l}</div><div className="font-display font-bold tabular">{fmtHours((v as number) ?? 0)}</div></div>))}
        </div>
      </Card>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-xl font-bold">Insights</h2>
          <div role="tablist" className="flex gap-1">{(['week', 'month'] as const).map((p) => (
            <button key={p} role="tab" aria-selected={period === p} onClick={() => setPeriod(p)} className={`min-h-9 rounded-full px-3 text-sm font-semibold ${period === p ? 'bg-brand text-brand-ink' : 'bg-raised'}`}>{p === 'week' ? '7 days' : '30 days'}</button>))}</div>
        </div>
        {ins.loading ? <Loading /> : ins.data?.empty ? <p className="text-sm text-muted">Not enough data yet. Insights appear once you've logged some days.</p> : (
          <ul className="grid gap-3">{ins.data?.items.map((i: any, k: number) => <li key={k}><p className="font-semibold">{i.title}</p><p className="text-sm text-muted">{i.text}</p></li>)}</ul>
        )}
      </Card>

      {target && w && (
        <Card className="grid gap-4">
          <div><h2 className="font-display text-xl font-bold">What if...</h2><p className="text-sm text-muted">An estimate based on your numbers so far, not a prediction.</p></div>
          {active.length > 1 && <Field label="Challenge"><Select value={target.id} onChange={(e) => setPick(e.target.value)}>{active.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</Select></Field>}
          <Field label={`If I complete ${rate}% of my remaining ${w.remainingDays} days`}>
            <input type="range" min={0} max={100} step={5} value={rate} onChange={(e) => setRate(Number(e.target.value))} className="w-full accent-[var(--brand)]" />
          </Field>
          <Field label={`Focus minutes per completed day: ${mins}`}>
            <input type="range" min={0} max={240} step={15} value={mins} onChange={(e) => setMins(Number(e.target.value))} className="w-full accent-[var(--brand)]" />
          </Field>
          <div className="rounded-xl bg-raised p-3 text-sm">
            <p>Estimated finish: <b className="tabular">{w.projectedCompleted} of {target.stats.totalDays} days ({w.projectedCompletionPct}%)</b>.</p>
            <p className="mt-1 text-muted">At your current pace of {w.currentPacePct}%, you'd land around {w.atCurrentPaceCompleted} days.</p>
            {[75, 90].map((p) => { const n = w.neededRateFor(p); return <p key={p} className="text-muted">To reach {p}%: {n === null ? 'no longer possible' : `about ${n}% of remaining days`}.</p>; })}
            {mins > 0 && <p className="text-muted">That's roughly {w.projectedFocusHours} focus hours more.</p>}
          </div>
        </Card>
      )}

      {goals.data && goals.data.length > 0 && (
        <Card><div className="mb-2 flex justify-between"><h2 className="font-display text-xl font-bold">Goals</h2><Link href="/goals" className="text-sm font-semibold text-brand">Manage</Link></div>
          <ul className="grid gap-3">{goals.data.slice(0, 4).map((g) => (
            <li key={g.id}><div className="flex justify-between text-sm"><span className="font-semibold">{g.title}</span><span className="tabular">{Math.round(g.progress_pct)}%</span></div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-raised"><div className="h-full bg-sun" style={{ width: `${g.progress_pct}%` }} /></div></li>))}</ul></Card>
      )}

      {ms.data && ms.data.filter((m) => m.achieved_at).length > 0 && (
        <Card><h2 className="mb-2 font-display text-xl font-bold">Milestones reached</h2>
          <ul className="grid gap-1.5">{ms.data.filter((m) => m.achieved_at).slice(0, 12).map((m) => <li key={m.id} className="flex justify-between gap-3 text-sm"><span>{m.title}</span><span className="shrink-0 text-muted">{prettyDate(m.achieved_at.slice(0, 10), { month: 'short', day: 'numeric' })}</span></li>)}</ul></Card>
      )}
    </div>
  );
}
const totalDays = (n: number) => String(n);
