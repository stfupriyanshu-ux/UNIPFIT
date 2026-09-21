'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, ErrorBanner, Field, Input, PageTitle, Textarea, Toggle } from '@/components/ui';
import { api, localToday } from '@/lib/client';

const PRESETS = [30, 66, 100, 365];

export default function NewChallenge() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [days, setDays] = useState(365);
  const [start, setStart] = useState(localToday());
  const [message, setMessage] = useState('');
  const [strict, setStrict] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    if (!title.trim()) { setError('Give your challenge a name.'); return; }
    if (!Number.isInteger(days) || days < 1 || days > 3650) { setError('Choose between 1 and 3650 days.'); return; }
    setBusy(true);
    try {
      const c = await api<{ id: string }>('/api/challenges', { body: { title, duration_days: days, start_date: start, day_one_message: message, strict_mode: strict } });
      router.replace(`/challenges/${c.id}?setup=1`);
    } catch (err) { setError((err as Error).message); setBusy(false); }
  }
  return (
    <>
      <PageTitle title="New challenge" sub="Make the promise. Then keep it." />
      <form onSubmit={submit} className="grid gap-4">
        {error && <ErrorBanner message={error} />}
        <Card className="grid gap-4">
          <Field label="What will you do every day?"><Input required maxLength={120} placeholder="Gym for 365 days" value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
          <div>
            <span className="mb-1 block text-sm font-semibold">For how many days?</span>
            <div className="mb-2 flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button type="button" key={p} aria-pressed={days === p} onClick={() => setDays(p)}
                  className={`min-h-9 rounded-full px-4 text-sm font-semibold ${days === p ? 'bg-brand text-brand-ink' : 'bg-raised'}`}>{p} days</button>
              ))}
            </div>
            <Input type="number" min={1} max={3650} inputMode="numeric" aria-label="Number of days" value={days} onChange={(e) => setDays(Number(e.target.value))} />
          </div>
          <Field label="Start date" hint="Starting today is best. You can start up to 30 days back."><Input type="date" required value={start} onChange={(e) => setStart(e.target.value)} /></Field>
        </Card>
        <Card className="grid gap-4">
          <Field label="Your Day 1 message" hint="Strict Mode shows this back to you on a day you want to quit.">
            <Textarea maxLength={2000} placeholder="Dear future me, today I promise..." value={message} onChange={(e) => setMessage(e.target.value)} />
          </Field>
          <div className="flex items-center justify-between gap-4">
            <div><p className="font-semibold">Strict Mode</p><p className="text-sm text-muted">If you answer No, you'll first see your own promise and be asked why.</p></div>
            <Toggle checked={strict} onChange={setStrict} label="Strict Mode" />
          </div>
        </Card>
        <Button type="submit" busy={busy}>Start Day 1</Button>
      </form>
    </>
  );
}
