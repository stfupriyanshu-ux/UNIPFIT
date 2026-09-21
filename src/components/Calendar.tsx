'use client';
import { useState } from 'react';
import { addDays, weekday } from '@/lib/dates';

interface Props {
  start: string; end: string; today: string;
  checkIns: { check_date: string; status: string }[];
  noteDates?: Set<string>;
  selected: string | null; onSelect: (d: string) => void;
}

/** Month calendar showing each day's status. */
export default function Calendar({ start, end, today, checkIns, noteDates, selected, onSelect }: Props) {
  const initial = (today >= start && today <= end ? today : start).slice(0, 7);
  const [month, setMonth] = useState(initial);
  const by = new Map(checkIns.map((c) => [c.check_date, c.status]));
  const first = `${month}-01`;
  const lead = weekday(first); // 0 = Sunday
  const [y, m] = month.split('-').map(Number);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const shift = (n: number) => { const d = new Date(Date.UTC(y, m - 1 + n, 1)); setMonth(d.toISOString().slice(0, 7)); };
  const label = new Date(first + 'T12:00:00').toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const canPrev = first > start.slice(0, 7) + '-01', canNext = addDays(first, daysInMonth) <= end;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <button onClick={() => shift(-1)} disabled={!canPrev} aria-label="Previous month" className="grid h-9 w-9 place-items-center rounded-lg bg-raised disabled:opacity-30">‹</button>
        <h3 className="font-display text-lg font-bold">{label}</h3>
        <button onClick={() => shift(1)} disabled={!canNext} aria-label="Next month" className="grid h-9 w-9 place-items-center rounded-lg bg-raised disabled:opacity-30">›</button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted">{['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <span key={i}>{d}</span>)}</div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {Array.from({ length: lead }, (_, i) => <span key={'l' + i} />)}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const d = `${month}-${String(i + 1).padStart(2, '0')}`;
          const inRange = d >= start && d <= end, s = by.get(d);
          let cls = 'text-ink';
          if (!inRange) cls = 'text-muted opacity-40';
          else if (s === 'yes') cls = 'bg-done text-white';
          else if (s === 'no') cls = 'bg-miss text-white';
          else if (s === 'skipped') cls = 'border border-dashed border-muted';
          else if (d < today) cls = 'bg-raised';
          else cls = 'border border-line';
          return (
            <button key={d} disabled={!inRange} onClick={() => onSelect(d)} aria-label={`${d}${s ? ', ' + s : ''}`} aria-pressed={selected === d}
              className={`relative grid aspect-square place-items-center rounded-lg text-sm font-semibold tabular ${cls} ${d === today ? 'ring-2 ring-sun' : ''} ${selected === d ? 'outline outline-2 outline-brand' : ''}`}>
              {i + 1}
              {noteDates?.has(d) && <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-sun" aria-hidden="true" />}
            </button>
          );
        })}
      </div>
      <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-done" />Done</span>
        <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-miss" />Missed</span>
        <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-sm border border-dashed border-muted" />Skipped</span>
        <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-raised" />Not logged</span>
      </p>
    </div>
  );
}
