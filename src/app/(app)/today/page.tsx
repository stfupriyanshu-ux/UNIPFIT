'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import CheckInCard, { type ChallengeCardData } from '@/components/CheckInCard';
import { Button, Card, EmptyState, ErrorBanner, Input, Loading, PageTitle, Textarea } from '@/components/ui';
import { api, localToday, prettyDate, toast, useApi } from '@/lib/client';

export default function TodayPage() {
  const today = localToday();
  const ch = useApi<ChallengeCardData[]>('/api/challenges');
  const tasks = useApi<any[]>('/api/tasks');
  const routines = useApi<any[]>('/api/routines');
  const notes = useApi<any[]>(`/api/notes?date=${today}`);
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { setNote(notes.data?.find((n) => n.challenge_id === null)?.content ?? ''); }, [notes.data]);
  if (ch.loading) return <Loading />;
  if (ch.error) return <ErrorBanner message={ch.error} onRetry={ch.reload} />;

  const live = (ch.data ?? []).filter((c) => c.status === 'active' && c.stats.phase === 'active');
  const dueRoutines = (routines.data ?? []).filter((r) => r.active && r.scheduledToday);

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    try { await api('/api/tasks', { body: { title, due_date: today } }); setTitle(''); tasks.reload(); } catch (err) { toast((err as Error).message, 'error'); }
  }
  const toggle = async (url: string, reload: () => void) => { try { await api(url, { body: {} }); reload(); } catch (e) { toast((e as Error).message, 'error'); } };
  async function saveNote() {
    setBusy(true);
    try { await api('/api/notes', { method: 'PUT', body: { challenge_id: null, note_date: today, content: note } }); toast('Note saved'); notes.reload(); }
    catch (e) { toast((e as Error).message, 'error'); } finally { setBusy(false); }
  }

  return (
    <div className="grid gap-5">
      <PageTitle title="Today" sub={prettyDate(today, { weekday: 'long', month: 'long', day: 'numeric' })} right={<Link href="/focus"><Button small variant="sun">Focus</Button></Link>} />

      <section aria-label="Check-ins" className="grid gap-3">
        {live.length === 0 ? <EmptyState title="No challenges due" body="Start a challenge and it will show up here every day." action={<Link href="/challenges/new"><Button>New challenge</Button></Link>} />
          : live.map((c) => <CheckInCard key={c.id} c={c} onChanged={ch.reload} />)}
      </section>

      <Card>
        <div className="mb-3 flex items-center justify-between"><h2 className="font-display text-xl font-bold">Tasks</h2><Link href="/tasks" className="text-sm font-semibold text-brand">All tasks</Link></div>
        <ul className="grid gap-1">
          {(tasks.data ?? []).map((t) => (
            <li key={t.id}>
              <button onClick={() => toggle(`/api/tasks/${t.id}/complete`, tasks.reload)} aria-pressed={t.done} className="flex min-h-11 w-full items-center gap-3 text-left">
                <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-md border-2 ${t.done ? 'border-done bg-done text-white' : 'border-line'}`}>{t.done && '✓'}</span>
                <span className={t.done ? 'text-muted line-through' : ''}>{t.title}</span>
              </button>
            </li>
          ))}
        </ul>
        {tasks.data?.length === 0 && <p className="text-sm text-muted">Nothing on your list today.</p>}
        <form onSubmit={addTask} className="mt-3 flex gap-2"><Input aria-label="New task" placeholder="Add a task" maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} /><Button type="submit">Add</Button></form>
      </Card>

      {dueRoutines.length > 0 && (
        <Card>
          <div className="mb-3 flex items-center justify-between"><h2 className="font-display text-xl font-bold">Routines</h2><Link href="/routines" className="text-sm font-semibold text-brand">Manage</Link></div>
          <ul className="grid gap-1">{dueRoutines.map((r) => (
            <li key={r.id}>
              <button onClick={() => toggle(`/api/routines/${r.id}/log`, routines.reload)} aria-pressed={r.doneToday} className="flex min-h-11 w-full items-center gap-3 text-left">
                <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 ${r.doneToday ? 'border-done bg-done text-white' : 'border-line'}`}>{r.doneToday && '✓'}</span>
                <span className={r.doneToday ? 'text-muted line-through' : ''}>{r.title}</span>
              </button>
            </li>
          ))}</ul>
        </Card>
      )}

      <Card>
        <h2 className="mb-2 font-display text-xl font-bold">Today's note</h2>
        <Textarea aria-label="Today's note" placeholder="What's on your mind?" maxLength={5000} value={note} onChange={(e) => setNote(e.target.value)} />
        <Button className="mt-2" small onClick={saveNote} busy={busy} disabled={!note.trim()}>Save note</Button>
      </Card>
    </div>
  );
}
