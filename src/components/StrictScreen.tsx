'use client';
import { useEffect, useState } from 'react';
import { Button, ErrorBanner, Loading } from '@/components/ui';
import { MediaImage, MediaPlayer } from '@/components/MediaViews';
import ReasonPicker from '@/components/ReasonPicker';
import { api, toast, useApi } from '@/lib/client';

interface Props { challenge: { id: string; title: string }; onClose: () => void; onSaved: () => void }

/**
 * Strict Mode accountability screen. Shown when the user answers NO on a strict challenge.
 * It plays THEIR OWN promise, asks why, and never insults, threatens or shames.
 */
export default function StrictScreen({ challenge, onClose, onSaved }: Props) {
  const { data, loading } = useApi<any>(`/api/challenges/${challenge.id}`);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', k);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', k); document.body.style.overflow = ''; };
  }, [onClose]);

  async function send(kind: 'no' | 'skip' | 'pause') {
    setError(null);
    if (kind !== 'skip' && !reason.trim()) { setError('Tell us what got in the way, even in a few words.'); return; }
    setBusy(kind);
    try {
      if (kind === 'pause') await api(`/api/challenges/${challenge.id}`, { method: 'PATCH', body: { strict_mode: false } });
      await api('/api/check-ins', { body: kind === 'skip'
        ? { challenge_id: challenge.id, status: 'skipped' }
        : { challenge_id: challenge.id, status: 'no', reason: reason.trim() } });
      toast(kind === 'skip' ? 'Today skipped. Tomorrow is a fresh start.' : kind === 'pause' ? 'Strict Mode paused for this challenge. Missed day saved.' : 'Saved. Tomorrow is a fresh start.');
      onSaved();
    } catch (e) { setError((e as Error).message); setBusy(null); }
  }

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="strict-title" className="fixed inset-0 z-[60] overflow-y-auto bg-bg safe-top">
      <div className="mx-auto grid max-w-lg gap-5 px-5 py-8">
        <div>
          <p className="text-sm font-semibold text-muted">{challenge.title}</p>
          <h2 id="strict-title" className="font-display text-3xl font-bold leading-tight">You made a promise to yourself.</h2>
        </div>
        {loading && <Loading />}
        {data && (
          <>
            {data.challenge.day_one_message && (
              <blockquote className="rounded-2xl border border-line bg-surface p-4 text-lg leading-relaxed">{data.challenge.day_one_message}</blockquote>
            )}
            {data.promise && <MediaPlayer id={data.promise.media_file_id} label="Your promise" />}
            {data.strictPhotoId && <MediaImage id={data.strictPhotoId} alt="A photo you chose for this challenge" className="max-h-72 w-full rounded-2xl object-cover" />}
            {!data.challenge.day_one_message && !data.promise && !data.strictPhotoId && (
              <p className="rounded-2xl border border-line bg-surface p-4 text-muted">Add a message, recording or photo to this challenge and it will show up here when you need it.</p>
            )}
          </>
        )}
        <div>
          <h3 className="mb-2 font-display text-xl font-bold">What got in the way today?</h3>
          <ReasonPicker value={reason} onChange={setReason} />
        </div>
        {error && <ErrorBanner message={error} />}
        <div className="grid gap-2">
          <Button onClick={onClose} variant="sun">I can still do this today</Button>
          <Button onClick={() => send('no')} busy={busy === 'no'} variant="ghost">Save today as missed</Button>
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={() => send('skip')} busy={busy === 'skip'} variant="ghost" small>Skip today</Button>
            <Button onClick={() => send('pause')} busy={busy === 'pause'} variant="ghost" small>Pause Strict Mode</Button>
          </div>
          <p className="text-xs text-muted">Skipping is a rest day: it won't count as a miss or add to your streak. Pausing turns Strict Mode off for this challenge, and today is saved as missed.</p>
        </div>
      </div>
    </div>
  );
}
