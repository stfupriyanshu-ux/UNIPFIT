'use client';
import Link from 'next/link';
import { useState } from 'react';
import CheckInCard, { type ChallengeCardData } from '@/components/CheckInCard';
import { Button, EmptyState, ErrorBanner, Loading, PageTitle } from '@/components/ui';
import { useApi } from '@/lib/client';

const TABS = ['active', 'paused', 'completed'] as const;

export default function ChallengesPage() {
  const { data, error, loading, reload } = useApi<ChallengeCardData[]>('/api/challenges');
  const [tab, setTab] = useState<(typeof TABS)[number]>('active');
  const shown = (data ?? []).filter((c) => c.status === tab);
  return (
    <>
      <PageTitle title="Challenges" sub="Every promise you're keeping." right={<Link href="/challenges/new"><Button small>New challenge</Button></Link>} />
      <div role="tablist" aria-label="Challenge status" className="mb-4 flex gap-2">
        {TABS.map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
            className={`min-h-9 rounded-full px-4 text-sm font-semibold capitalize ${tab === t ? 'bg-brand text-brand-ink' : 'bg-raised'}`}>{t}</button>
        ))}
      </div>
      {loading ? <Loading /> : error ? <ErrorBanner message={error} onRetry={reload} /> : shown.length === 0 ? (
        <EmptyState title={tab === 'active' ? 'No active challenges' : `Nothing ${tab} yet`}
          body={tab === 'active' ? 'Start with one promise you can keep every single day.' : 'Challenges you mark this way will show up here.'}
          action={tab === 'active' ? <Link href="/challenges/new"><Button>Start a challenge</Button></Link> : undefined} />
      ) : <div className="grid gap-3">{shown.map((c) => <CheckInCard key={c.id} c={c} onChanged={reload} />)}</div>}
    </>
  );
}
