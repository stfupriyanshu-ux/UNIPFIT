'use client';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import Calendar from '@/components/Calendar';
import DayStrip from '@/components/DayStrip';
import { MediaImage, MediaPlayer } from '@/components/MediaViews';
import Ring from '@/components/Ring';
import { StatRow } from '@/components/Stats';
import { Card, ErrorBanner, Loading } from '@/components/ui';
import { fmtHours, localToday, prettyDate, useApi } from '@/lib/client';

export default function ReportPage() {
  const { id } = useParams<{ id: string }>();
  const preview = useSearchParams().get('preview') === '1';
  const { data: r, error, loading, reload } = useApi<any>(`/api/challenges/${id}/report${preview ? '?preview=1' : ''}`);
  if (loading) return <Loading />;
  if (error || !r) return <ErrorBanner message={error ?? 'Not found'} onRetry={reload} />;
  const c = r.challenge, s = r.stats;

  if (!r.available) return (
    <div className="grid gap-4">
      <Link href={`/challenges/${id}`} className="text-sm font-semibold text-brand">‹ {c.title}</Link>
      <Card><h1 className="font-display text-2xl font-bold">Your report unlocks on {prettyDate(c.end_date)}</h1>
        <p className="mt-1 text-muted">{r.daysLeft} days to go. Keep showing up.</p>
        <Link href={`/challenges/${id}/report?preview=1`} className="mt-3 inline-block font-semibold text-brand underline">Preview it now</Link></Card>
    </div>
  );

  return (
    <div className="grid gap-5">
      <Link href={`/challenges/${id}`} className="text-sm font-semibold text-brand">‹ {c.title}</Link>
      {r.preview && <p role="note" className="rounded-xl border border-sun p-3 text-sm">This is a preview. The final report is fixed when the challenge ends.</p>}
      <header>
        <h1 className="font-display text-3xl font-bold">{c.title}</h1>
        <p className="text-muted">{prettyDate(c.start_date)} to {prettyDate(c.end_date)}</p>
      </header>

      <Card className="flex items-center gap-5">
        <Ring pct={s.completionPct} size={110} stroke={12}><span className="font-display text-3xl font-extrabold tabular">{Math.round(s.completionPct)}%</span></Ring>
        <div>
          <p className="font-display text-2xl font-bold tabular">{s.completed} of {s.totalDays} days</p>
          <p className="text-sm text-muted tabular">Longest streak {s.longestStreak}. Current {s.currentStreak}. Focus time {fmtHours(r.focusSeconds)}.</p>
        </div>
      </Card>
      <StatRow completed={s.completed} missed={s.missed} streak={s.longestStreak} />

      <Card>
        <h2 className="font-display text-xl font-bold">Where it began</h2>
        <p className="mt-1 text-sm text-muted">Your Day 1 message, {prettyDate(c.start_date)}</p>
        <blockquote className="mt-2 rounded-xl bg-raised p-4 text-lg leading-relaxed">{r.dayOneMessage || 'You started without a message. The promise was still made.'}</blockquote>
        {r.promiseMediaId && <div className="mt-3"><MediaPlayer id={r.promiseMediaId} label="Your Day 1 promise" /></div>}
      </Card>

      <Card><h2 className="mb-3 font-display text-xl font-bold">Every day</h2><DayStrip start={c.start_date} total={s.totalDays} checkIns={r.checkIns} today={localToday()} /></Card>
      <Card><h2 className="mb-3 font-display text-xl font-bold">Calendar</h2><Calendar start={c.start_date} end={c.end_date} today={localToday()} checkIns={r.checkIns} selected={null} onSelect={() => {}} /></Card>

      {r.monthly.length > 0 && (
        <Card><h2 className="mb-3 font-display text-xl font-bold">Month by month</h2>
          <ul className="grid gap-3">{r.monthly.map((m: any) => {
            const t = m.yes + m.no + m.skipped;
            return (
              <li key={m.month}>
                <div className="mb-1 flex justify-between text-sm"><span className="font-semibold">{new Date(m.month + '-01T12:00:00').toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</span><span className="text-muted tabular">{m.yes} done, {m.no} missed</span></div>
                <div className="flex h-2.5 overflow-hidden rounded-full bg-raised" aria-hidden="true">
                  <span className="bg-done" style={{ width: `${(m.yes / t) * 100}%` }} /><span className="bg-miss" style={{ width: `${(m.no / t) * 100}%` }} />
                </div>
              </li>
            );
          })}</ul></Card>
      )}

      {r.milestones.length > 0 && <Card><h2 className="mb-2 font-display text-xl font-bold">Milestones</h2><ul className="grid gap-1.5">{r.milestones.map((m: any, i: number) => <li key={i} className="text-sm">{m.title}</li>)}</ul></Card>}

      <Card>
        <h2 className="mb-3 font-display text-xl font-bold">Timeline</h2>
        <ol className="grid gap-3 border-l-2 border-line pl-4">
          {r.timeline.map((t: any, i: number) => (
            <li key={i} className="relative">
              <span className={`absolute -left-[23px] top-1.5 h-3 w-3 rounded-full ${t.type === 'missed' ? 'bg-miss' : t.type === 'milestone' ? 'bg-sun' : 'bg-brand'}`} aria-hidden="true" />
              <p className="text-xs text-muted">{t.date && prettyDate(t.date)}</p><p className="text-sm">{t.text}</p>
            </li>
          ))}
        </ol>
      </Card>

      {r.notes.length > 0 && (
        <Card><h2 className="mb-3 font-display text-xl font-bold">Your notes</h2>
          <ul className="grid gap-3">{r.notes.map((n: any) => <li key={n.note_date}><p className="text-xs text-muted">{prettyDate(n.note_date)}</p><p className="whitespace-pre-wrap text-sm">{n.content}</p></li>)}</ul></Card>
      )}
      {r.photoIds.length > 0 && (
        <Card><h2 className="mb-3 font-display text-xl font-bold">Photos</h2>
          <div className="grid grid-cols-3 gap-2">{r.photoIds.map((p: any) => <MediaImage key={p.id} id={p.id} alt={p.date ? `Photo from ${p.date}` : 'Challenge photo'} className="aspect-square w-full rounded-xl object-cover" />)}</div></Card>
      )}
    </div>
  );
}
