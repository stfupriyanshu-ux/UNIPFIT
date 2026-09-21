'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Calendar from '@/components/Calendar';
import CheckInCard from '@/components/CheckInCard';
import DayStrip from '@/components/DayStrip';
import { MediaImage } from '@/components/MediaViews';
import PhotoUpload from '@/components/PhotoUpload';
import Recorder from '@/components/Recorder';
import { Button, Card, ErrorBanner, Field, Input, Loading, Textarea, Toggle } from '@/components/ui';
import { api, prettyDate, toast, useApi } from '@/lib/client';
import { localToday } from '@/lib/client';

export default function ChallengeDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const setup = useSearchParams().get('setup') === '1';
  const { data, error, loading, reload } = useApi<any>(`/api/challenges/${id}`);
  const notes = useApi<any[]>(`/api/notes?challenge_id=${id}`);
  const [selected, setSelected] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', day_one_message: '', end_date: '' });
  const [formError, setFormError] = useState<string | null>(null);

  const c = data?.challenge;
  const today = localToday();
  useEffect(() => { if (c && !selected) setSelected(today >= c.start_date && today <= c.end_date ? today : c.start_date); }, [c, selected, today]);
  useEffect(() => { setNoteText(notes.data?.find((n) => n.note_date === selected)?.content ?? ''); }, [selected, notes.data]);
  useEffect(() => { if (c) setForm({ title: c.title, description: c.description, day_one_message: c.day_one_message, end_date: c.end_date }); }, [c]);

  if (loading) return <Loading />;
  if (error || !data) return <ErrorBanner message={error ?? 'Not found'} onRetry={reload} />;
  const s = data.stats;
  const day = data.checkIns.find((x: any) => x.check_date === selected);
  const dayNote = notes.data?.find((n) => n.note_date === selected);
  const todayCheckIn = data.checkIns.find((x: any) => x.check_date === today);
  const refresh = () => { reload(); notes.reload(); };

  async function patch(body: object, msg?: string) {
    try { await api(`/api/challenges/${id}`, { method: 'PATCH', body }); if (msg) toast(msg); reload(); return true; }
    catch (e) { toast((e as Error).message, 'error'); return false; }
  }
  async function saveEdit(e: React.FormEvent) {
    e.preventDefault(); setFormError(null);
    try {
      await api(`/api/challenges/${id}`, { method: 'PATCH', body: { title: form.title, description: form.description, day_one_message: form.day_one_message, end_date: form.end_date } });
      toast('Challenge updated'); setEditing(false); reload();
    } catch (err) { setFormError((err as Error).message); }
  }
  async function remove() {
    if (!confirm(`Delete "${c.title}" and all its check-ins, notes and recordings? This cannot be undone.`)) return;
    try { await api(`/api/challenges/${id}`, { method: 'DELETE' }); toast('Challenge deleted'); router.replace('/challenges'); }
    catch (e) { toast((e as Error).message, 'error'); }
  }
  async function undo() {
    try { await api(`/api/check-ins/${todayCheckIn.id}`, { method: 'DELETE' }); toast('Today\'s check-in removed'); reload(); }
    catch (e) { toast((e as Error).message, 'error'); }
  }
  async function saveNote() {
    setSavingNote(true);
    try { await api('/api/notes', { method: 'PUT', body: { challenge_id: id, note_date: selected, content: noteText } }); toast('Note saved'); notes.reload(); }
    catch (e) { toast((e as Error).message, 'error'); } finally { setSavingNote(false); }
  }

  return (
    <div className="grid gap-5">
      <div>
        <Link href="/challenges" className="text-sm font-semibold text-brand">‹ Challenges</Link>
        <div className="mt-1 flex items-start justify-between gap-3">
          <h1 className="font-display text-3xl font-bold leading-tight">{c.title}</h1>
          <Button variant="ghost" small onClick={() => setEditing((v) => !v)} aria-expanded={editing}>{editing ? 'Close' : 'Edit'}</Button>
        </div>
        <p className="text-sm text-muted">{prettyDate(c.start_date)} to {prettyDate(c.end_date)}. {s.daysLeft} days left.</p>
      </div>

      {setup && !data.promise && (
        <Card className="border-sun"><p className="font-display text-lg font-bold">Your challenge is live. One more thing.</p>
          <p className="text-sm text-muted">Record your promise below. On a hard day, you'll be able to hear your own voice.</p></Card>
      )}

      {editing && (
        <form onSubmit={saveEdit} className="grid gap-3 rounded-2xl border border-line bg-surface p-4">
          {formError && <ErrorBanner message={formError} />}
          <Field label="Name"><Input required maxLength={120} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
          <Field label="Description"><Textarea maxLength={1000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="min-h-16" /></Field>
          <Field label="Day 1 message"><Textarea maxLength={2000} value={form.day_one_message} onChange={(e) => setForm({ ...form, day_one_message: e.target.value })} /></Field>
          <Field label="End date" hint="You can extend a challenge, but not end it before your latest check-in."><Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></Field>
          <Button type="submit">Save changes</Button>
        </form>
      )}

      <CheckInCard c={{ ...c, stats: s }} onChanged={refresh} />
      {todayCheckIn && <button onClick={undo} className="-mt-3 text-left text-sm font-semibold text-muted underline">Tapped the wrong answer? Undo today's check-in</button>}

      <Card>
        <h2 className="mb-3 font-display text-xl font-bold">Your {s.totalDays} days</h2>
        <DayStrip start={c.start_date} total={s.totalDays} checkIns={data.checkIns} today={today} />
        <p className="mt-3 text-sm text-muted tabular">Longest streak: {s.longestStreak}. Completion: {s.completionPct}% of the full challenge, {s.adherencePct}% of days so far.</p>
      </Card>

      <Card>
        <h2 className="mb-3 font-display text-xl font-bold">Calendar</h2>
        <Calendar start={c.start_date} end={c.end_date} today={today} checkIns={data.checkIns} noteDates={new Set((notes.data ?? []).map((n) => n.note_date))} selected={selected} onSelect={setSelected} />
        {selected && (
          <div className="mt-4 grid gap-3 border-t border-line pt-4">
            <div>
              <h3 className="font-semibold">{prettyDate(selected, { weekday: 'long', month: 'long', day: 'numeric' })}</h3>
              <p className="text-sm text-muted">
                {day ? (day.status === 'yes' ? 'Completed' : day.status === 'no' ? `Missed: ${day.miss_reason}` : 'Skipped') : selected > today ? 'Upcoming' : selected === today ? 'Not checked in yet' : 'Not logged'}
              </p>
            </div>
            {selected <= today ? (
              <>
                <Field label="Note for this day"><Textarea maxLength={5000} placeholder="How did it go?" value={noteText} onChange={(e) => setNoteText(e.target.value)} className="min-h-20" /></Field>
                <div className="flex flex-wrap gap-2">
                  <Button small onClick={saveNote} busy={savingNote} disabled={!noteText.trim()}>Save note</Button>
                  <PhotoUpload purpose="note_photo" challengeId={id} noteDate={selected} onDone={() => notes.reload()} />
                </div>
                {dayNote?.photos?.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {dayNote.photos.map((p: string) => (
                      <div key={p} className="relative">
                        <MediaImage id={p} alt={`Photo from ${selected}`} className="aspect-square w-full rounded-xl object-cover" />
                        <button aria-label="Delete photo" onClick={async () => { if (confirm('Delete this photo?')) { await api(`/api/media/${p}`, { method: 'DELETE' }); notes.reload(); } }}
                          className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white">×</button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : <p className="text-sm text-muted">Notes open on the day itself.</p>}
          </div>
        )}
      </Card>

      <Card className="grid gap-4">
        <div>
          <h2 className="font-display text-xl font-bold">Your promise</h2>
          {c.day_one_message ? <blockquote className="mt-2 rounded-xl bg-raised p-3 leading-relaxed">{c.day_one_message}</blockquote> : <p className="text-sm text-muted">No Day 1 message yet. Add one with Edit.</p>}
        </div>
        <Recorder challengeId={id} existing={data.promise} onChanged={reload} />
        <div className="grid gap-3 border-t border-line pt-4">
          <div className="flex items-center justify-between gap-4">
            <div><p className="font-semibold">Strict Mode</p><p className="text-sm text-muted">On a No, you'll see your promise and be asked why before it's saved.</p></div>
            <Toggle checked={c.strict_mode} onChange={(v) => patch({ strict_mode: v }, v ? 'Strict Mode on' : 'Strict Mode off')} label="Strict Mode" />
          </div>
          <div className="flex items-center gap-3">
            {data.strictPhotoId && <MediaImage id={data.strictPhotoId} alt="Your accountability photo" className="h-16 w-16 rounded-xl object-cover" />}
            <PhotoUpload purpose="strict_photo" challengeId={id} label={data.strictPhotoId ? 'Replace photo' : 'Add accountability photo'} onDone={reload} />
            {data.strictPhotoId && <Button variant="ghost" small onClick={async () => { await api(`/api/media/${data.strictPhotoId}`, { method: 'DELETE' }); reload(); }}>Remove</Button>}
          </div>
        </div>
      </Card>

      {data.milestones.length > 0 && (
        <Card><h2 className="mb-2 font-display text-xl font-bold">Milestones</h2>
          <ul className="grid gap-1.5">{data.milestones.map((m: any) => <li key={m.id} className="text-sm">{m.title}</li>)}</ul></Card>
      )}

      <div className="flex flex-wrap gap-2">
        <Link href={`/challenges/${id}/report${s.phase === 'ended' ? '' : '?preview=1'}`}><Button variant="ghost">{s.phase === 'ended' ? 'Final report' : 'Preview final report'}</Button></Link>
        {c.status === 'active' && <Button variant="ghost" onClick={() => patch({ status: 'paused' }, 'Challenge paused')}>Pause</Button>}
        {c.status === 'paused' && <Button variant="ghost" onClick={() => patch({ status: 'active' }, 'Challenge resumed')}>Resume</Button>}
        {c.status !== 'completed' && <Button variant="ghost" onClick={() => patch({ status: 'completed' }, 'Marked complete')}>Mark complete</Button>}
        {c.status === 'completed' && <Button variant="ghost" onClick={() => patch({ status: 'active' }, 'Challenge reopened')}>Reopen</Button>}
        <Button variant="danger" onClick={remove}>Delete</Button>
      </div>
    </div>
  );
}
