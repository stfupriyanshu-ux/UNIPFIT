'use client';
import Link from 'next/link';
import Ring from '@/components/Ring';
import CheckInCard, { type ChallengeCardData } from '@/components/CheckInCard';
import { Button, EmptyState, ErrorBanner, Loading } from '@/components/ui';
import { fmtHours, prettyDate, useApi } from '@/lib/client';

const LINKS = [
  { href: '/focus', label: 'Focus' }, { href: '/tasks', label: 'Tasks' }, { href: '/goals', label: 'Goals' },
  { href: '/routines', label: 'Routines' }, { href: '/future-self', label: 'Future self' }, { href: '/coach', label: 'Coach' },
];

export default function HomePage() {
  const ch = useApi<ChallengeCardData[]>('/api/challenges');
  const timer = useApi<any>('/api/timer');
  const tasks = useApi<any[]>('/api/tasks');
  const me = useApi<any>('/api/profile');

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const name = me.data?.display_name?.split(' ')[0];

  if (ch.loading) return <Loading />;
  if (ch.error) return <ErrorBanner message={ch.error} onRetry={ch.reload} />;
  const all = ch.data ?? [];
  const live = all.filter((c) => c.status === 'active' && c.stats.phase === 'active');
  const checked = live.filter((c) => c.stats.checkedInToday).length;
  const open = tasks.data?.filter((t) => !t.done).length ?? 0;
  const reload = () => { ch.reload(); timer.reload(); };

  return (
    <div className="grid gap-5">
      <header>
        <h1 className="font-display text-3xl font-bold">{greeting}{name ? `, ${name}` : ''}</h1>
        <p className="text-sm text-muted">{prettyDate(new Intl.DateTimeFormat('en-CA').format(new Date()), { weekday: 'long', month: 'long', day: 'numeric' })}</p>
      </header>

      {all.length === 0 ? (
        <EmptyState title="Make your Day 1 promise" body="Pick something you want to do every day, set how long, and record why it matters to you." action={<Link href="/challenges/new"><Button>Start a challenge</Button></Link>} />
      ) : (
        <>
          <section className="flex items-center gap-5 rounded-3xl bg-brand p-5 text-brand-ink" aria-label="Today at a glance">
            <Ring pct={live.length ? (checked / live.length) * 100 : 0} size={104} stroke={11} label={`${checked} of ${live.length} checked in`}>
              <span className="font-display text-3xl font-extrabold tabular">{checked}<span className="text-base opacity-70">/{live.length}</span></span>
            </Ring>
            <div className="min-w-0">
              <p className="font-display text-2xl font-bold leading-tight">{live.length === 0 ? 'Nothing due today' : checked === live.length ? 'All checked in. Well done.' : 'Check in to keep going'}</p>
              <p className="mt-1 text-sm opacity-80">Focus today: {fmtHours(timer.data?.totals.today ?? 0)}. Tasks left: {open}.</p>
            </div>
          </section>

          <div className="grid gap-3">
            {all.filter((c) => c.status !== 'completed').map((c) => <CheckInCard key={c.id} c={c} onChanged={reload} />)}
          </div>
        </>
      )}

      <nav aria-label="More tools" className="grid grid-cols-3 gap-2 md:grid-cols-6">
        {LINKS.map((l) => <Link key={l.href} href={l.href} className="grid min-h-12 place-items-center rounded-xl border border-line bg-surface text-sm font-semibold hover:bg-raised">{l.label}</Link>)}
      </nav>
    </div>
  );
}
