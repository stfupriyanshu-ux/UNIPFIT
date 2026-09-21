'use client';
import { useState } from 'react';
import { Button, Card, EmptyState, ErrorBanner, Field, Input, Loading, PageTitle, Select } from '@/components/ui';
import { api, toast, useApi } from '@/lib/client';

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function TasksPage() {
  const { data, error, loading, reload } = useApi<any[]>('/api/tasks?all=1');
  const [title, setTitle] = useState('');
  const [repeat, setRepeat] = useState('none');
  const [days, setDays] = useState<number[]>([]);
  const [due, setDue] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  const run = async (fn: () => Promise<unknown>) => { try { await fn(); reload(); } catch (e) { toast((e as Error).message, 'error'); } };
  async function add(e: React.FormEvent) {
    e.preventDefault();
    await run(async () => {
      await api('/api/tasks', { body: { title, repeat, repeat_days: repeat === 'weekly' ? days : [], due_date: due || null } });
      setTitle(''); setDue(''); setDays([]); setRepeat('none');
    });
  }
  const move = (i: number, dir: -1 | 1) => {
    if (!data) return;
    const ids = data.map((t) => t.id); const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    run(() => api('/api/tasks/reorder', { body: { ids } }));
  };

  return (
    <>
      <PageTitle title="Tasks" sub="Everything you plan to do." />
      <form onSubmit={add} className="mb-5 grid gap-3 rounded-2xl border border-line bg-surface p-4">
        <Field label="New task"><Input required maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Read 20 pages" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Repeats"><Select value={repeat} onChange={(e) => setRepeat(e.target.value)}><option value="none">Does not repeat</option><option value="daily">Every day</option><option value="weekly">Weekly</option></Select></Field>
          <Field label="Date (optional)"><Input type="date" value={due} onChange={(e) => setDue(e.target.value)} /></Field>
        </div>
        {repeat === 'weekly' && (
          <div className="flex flex-wrap gap-2" role="group" aria-label="Repeat on">
            {DOW.map((d, i) => <button type="button" key={d} aria-pressed={days.includes(i)} onClick={() => setDays(days.includes(i) ? days.filter((x) => x !== i) : [...days, i])}
              className={`min-h-9 rounded-full px-3 text-sm font-semibold ${days.includes(i) ? 'bg-brand text-brand-ink' : 'bg-raised'}`}>{d}</button>)}
          </div>
        )}
        <Button type="submit">Add task</Button>
      </form>

      {loading ? <Loading /> : error ? <ErrorBanner message={error} onRetry={reload} /> : !data?.length ? <EmptyState title="No tasks yet" body="Add your first task above." /> : (
        <ul className="grid gap-2">
          {data.map((t, i) => (
            <li key={t.id}><Card className="flex items-center gap-2 !p-3">
              <div className="flex flex-col">
                <button aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)} className="h-6 w-8 text-muted disabled:opacity-30">▲</button>
                <button aria-label="Move down" disabled={i === data.length - 1} onClick={() => move(i, 1)} className="h-6 w-8 text-muted disabled:opacity-30">▼</button>
              </div>
              <div className="min-w-0 flex-1">
                {editing === t.id ? (
                  <form onSubmit={(e) => { e.preventDefault(); run(async () => { await api(`/api/tasks/${t.id}`, { method: 'PATCH', body: { title: draft } }); setEditing(null); }); }} className="flex gap-2">
                    <Input autoFocus aria-label="Task title" value={draft} maxLength={200} onChange={(e) => setDraft(e.target.value)} /><Button small type="submit">Save</Button>
                  </form>
                ) : (
                  <button onClick={() => { setEditing(t.id); setDraft(t.title); }} className="block w-full truncate text-left font-semibold" aria-label={`Edit ${t.title}`}>{t.title}</button>
                )}
                <p className="text-xs text-muted">{t.repeat === 'none' ? (t.due_date ?? 'No date') : t.repeat === 'daily' ? 'Every day' : `Weekly: ${t.repeat_days.map((d: number) => DOW[d]).join(', ') || 'same weekday'}`}</p>
              </div>
              <Button small variant="ghost" onClick={() => confirm('Delete this task?') && run(() => api(`/api/tasks/${t.id}`, { method: 'DELETE' }))}>Delete</Button>
            </Card></li>
          ))}
        </ul>
      )}
    </>
  );
}
