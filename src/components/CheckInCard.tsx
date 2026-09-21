'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Button, ErrorBanner } from '@/components/ui';
import Ring from '@/components/Ring';
import ReasonPicker from '@/components/ReasonPicker';
import StrictScreen from '@/components/StrictScreen';
import { Flame, StatRow } from '@/components/Stats';
import { api, prettyDate, toast } from '@/lib/client';
import { notifyMilestone } from '@/lib/notify';
import type { Stats } from '@/lib/streaks';

export interface ChallengeCardData {
  id: string; title: string; strict_mode: boolean; status: string; start_date: string; end_date: string; stats: Stats;
}

export default function CheckInCard({ c, onChanged }: { c: ChallengeCardData; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [sheet, setSheet] = useState<'miss' | 'strict' | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [popped, setPopped] = useState(false);
  const s = c.stats;

  async function yes() {
    setBusy(true); setError(null);
    try {
      const r = await api<{ stats: Stats; newMilestones: string[] }>('/api/check-ins', { body: { challenge_id: c.id, status: 'yes' } });
      setPopped(true);
      toast(`Day ${r.stats.dayNumber} done. ${r.stats.currentStreak} in a row.`);
      r.newMilestones.forEach((m) => { toast(`Milestone: ${m}`); notifyMilestone(m); });
      onChanged();
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function miss() {
    if (!reason.trim()) { setError('Tell us what got in the way, even in a few words.'); return; }
    setBusy(true); setError(null);
    try {
      await api('/api/check-ins', { body: { challenge_id: c.id, status: 'no', reason: reason.trim() } });
      toast('Saved. Tomorrow is a fresh start.'); setSheet(null); setReason(''); onChanged();
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  return (
    <article className="rounded-2xl border border-line bg-surface p-4" aria-label={c.title}>
      <div className="flex items-center gap-4">
        <Ring pct={s.completionPct} size={76} stroke={8}><span className="font-display text-lg font-bold tabular">{Math.round(s.completionPct)}%</span></Ring>
        <div className="min-w-0 flex-1">
          <Link href={`/challenges/${c.id}`} className="block truncate font-display text-xl font-bold">{c.title}</Link>
          <p className="font-display text-2xl font-extrabold tabular">
            {s.phase === 'upcoming' ? `Starts ${prettyDate(c.start_date, { month: 'short', day: 'numeric' })}` : <>Day {s.dayNumber} <span className="text-muted">/ {s.totalDays}</span></>}
          </p>
        </div>
        <span className={`flex items-center gap-1 text-sm font-bold text-sun ${popped ? 'animate-pop' : ''}`} title="Current streak"><Flame />{s.currentStreak}</span>
      </div>
      <StatRow className="mt-3" completed={s.completed} missed={s.missed} streak={s.currentStreak} />

      <div className="mt-3">
        {c.status !== 'active' ? <p className="text-sm text-muted">This challenge is {c.status}. Resume it to keep checking in.</p>
          : s.phase === 'upcoming' ? <p className="text-sm text-muted">Check-ins open on {prettyDate(c.start_date)}.</p>
          : s.phase === 'ended' ? <Link href={`/challenges/${c.id}/report`} className="font-semibold text-brand underline">See your final report</Link>
          : s.checkedInToday ? <p className="rounded-xl bg-raised px-3 py-2.5 text-center text-sm font-semibold text-done">Checked in for today</p>
          : (
            <>
              <p className="mb-2 text-sm font-semibold">Did you do it today?</p>
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={yes} busy={busy} className="!bg-done !text-white">Yes</Button>
                <Button onClick={() => { setError(null); setSheet(c.strict_mode ? 'strict' : 'miss'); }} variant="ghost" disabled={busy}>No</Button>
              </div>
            </>
          )}
        {error && !sheet && <div className="mt-2"><ErrorBanner message={error} /></div>}
      </div>

      {sheet === 'miss' && (
        <div role="dialog" aria-modal="true" aria-label="Why did you miss today?" className="fixed inset-0 z-[60] grid items-end bg-black/50 md:place-items-center" onClick={() => setSheet(null)}>
          <div className="animate-rise mx-auto w-full max-w-lg rounded-t-3xl bg-surface p-5 safe-bottom md:rounded-3xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-xl font-bold">What got in the way?</h3>
            <p className="mb-3 text-sm text-muted">Be honest. No judgment, just useful data for tomorrow.</p>
            <ReasonPicker value={reason} onChange={setReason} />
            {error && <div className="mt-2"><ErrorBanner message={error} /></div>}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button variant="ghost" onClick={() => setSheet(null)}>Cancel</Button>
              <Button onClick={miss} busy={busy}>Save</Button>
            </div>
          </div>
        </div>
      )}
      {sheet === 'strict' && <StrictScreen challenge={c} onClose={() => setSheet(null)} onSaved={() => { setSheet(null); onChanged(); }} />}
    </article>
  );
}
