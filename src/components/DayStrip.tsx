import { addDays } from '@/lib/dates';

interface Props { start: string; total: number; checkIns: { check_date: string; status: string }[]; today: string }

/** One square per day of the challenge: your whole promise at a glance. */
export default function DayStrip({ start, total, checkIns, today }: Props) {
  const by = new Map(checkIns.map((c) => [c.check_date, c.status]));
  const cells = Array.from({ length: total }, (_, i) => {
    const d = addDays(start, i), s = by.get(d);
    let cls = 'border border-line'; // future
    if (s === 'yes') cls = 'bg-done';
    else if (s === 'no') cls = 'bg-miss';
    else if (s === 'skipped') cls = 'border border-dashed border-muted';
    else if (d < today) cls = 'bg-raised';
    if (d === today) cls += ' ring-2 ring-sun ring-offset-1 ring-offset-surface';
    return <span key={d} title={`${d}${s ? ` · ${s}` : ''}`} className={`aspect-square rounded-[3px] ${cls}`} />;
  });
  const done = checkIns.filter((c) => c.status === 'yes').length;
  return (
    <div role="img" aria-label={`${done} of ${total} days completed`}
      className="grid gap-[3px]" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${total > 120 ? 14 : 22}px, 1fr))` }}>
      {cells}
    </div>
  );
}
