export const Flame = ({ className = '' }: { className?: string }) => (
  <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 2c.6 3-1.5 4.5-3 6.8C7.5 11 7 12.5 7 14.5a5 5 0 0 0 10 0c0-2-.8-3.5-2-5-.2 1.5-.9 2.3-1.8 2.5C12.7 8.5 13 5 12 2z" />
  </svg>
);

/** The three numbers every challenge shows. */
export function StatRow({ completed, missed, streak, className = '' }: { completed: number; missed: number; streak: number; className?: string }) {
  const cell = (n: number, l: string, extra = '') => (
    <div className={`rounded-xl bg-raised px-3 py-2 ${extra}`}>
      <div className="font-display text-2xl font-bold leading-none tabular">{n}</div>
      <div className="mt-1 text-xs text-muted">{l}</div>
    </div>
  );
  return (
    <div className={`grid grid-cols-3 gap-2 ${className}`}>
      {cell(completed, 'completed')}{cell(missed, 'missed')}{cell(streak, 'streak')}
    </div>
  );
}
