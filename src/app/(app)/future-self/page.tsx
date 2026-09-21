'use client';
import { useRef, useState } from 'react';
import { MediaImage, MediaPlayer } from '@/components/MediaViews';
import PhotoUpload from '@/components/PhotoUpload';
import { Button, Card, EmptyState, ErrorBanner, Field, Input, Loading, PageTitle, Textarea } from '@/components/ui';
import { api, localToday, prettyDate, toast, uploadMedia, useApi } from '@/lib/client';
import { addDays } from '@/lib/dates';

export default function FutureSelfPage() {
  const { data, error, loading, reload } = useApi<any[]>('/api/future-self');
  const [f, setF] = useState({ title: '', message: '', deliver_on: addDays(localToday(), 30) });
  const [photo, setPhoto] = useState<string | null>(null);
  const [media, setMedia] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function pickMedia(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; e.target.value = '';
    if (!file) return;
    if (file.size > 50 * 1048576) { toast('Voice/video can be up to 50 MB.', 'error'); return; }
    setBusy(true);
    try { setMedia(await uploadMedia({ purpose: 'future_media', blob: file })); toast('Attached'); } catch (err) { toast((err as Error).message, 'error'); } finally { setBusy(false); }
  }
  async function create(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    try {
      await api('/api/future-self', { body: { title: f.title || 'A note to future me', message: f.message, deliver_on: f.deliver_on, photo_media_id: photo, media_id: media } });
      toast('Sealed. See you then.'); setF({ title: '', message: '', deliver_on: addDays(localToday(), 30) }); setPhoto(null); setMedia(null); reload();
    } catch (err) { toast((err as Error).message, 'error'); } finally { setBusy(false); }
  }
  const today = localToday();

  return (
    <>
      <PageTitle title="Future self" sub="Write to the person you're becoming. It stays sealed until the day you choose." />
      <form onSubmit={create} className="mb-6 grid gap-3 rounded-2xl border border-line bg-surface p-4">
        <Field label="Title"><Input maxLength={120} placeholder="A note to future me" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
        <Field label="Your message"><Textarea required maxLength={5000} value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} placeholder="By the time you read this..." /></Field>
        <Field label="Unlocks on" hint="You can't open it early, not even you."><Input type="date" required min={addDays(today, 1)} value={f.deliver_on} onChange={(e) => setF({ ...f, deliver_on: e.target.value })} /></Field>
        <div className="flex flex-wrap items-center gap-2">
          <PhotoUpload purpose="future_photo" label={photo ? 'Replace photo' : 'Add photo'} onDone={setPhoto} />
          <input ref={fileRef} type="file" accept="audio/webm,audio/mp4,audio/ogg,video/webm,video/mp4,audio/*,video/*" className="sr-only" onChange={pickMedia} aria-label="Attach voice or video" />
          <Button type="button" small variant="ghost" onClick={() => fileRef.current?.click()}>{media ? 'Replace voice/video' : 'Add voice/video'}</Button>
          {(photo || media) && <span className="text-sm text-done">{[photo && 'photo', media && 'voice/video'].filter(Boolean).join(' and ')} attached</span>}
        </div>
        <Button type="submit" busy={busy}>Seal it</Button>
      </form>

      {loading ? <Loading /> : error ? <ErrorBanner message={error} onRetry={reload} /> : !data?.length ? <EmptyState title="Nothing sealed yet" body="Your first message to future you is a great place to start." /> : (
        <div className="grid gap-3">{data.map((m) => (
          <Card key={m.id}>
            {m.locked ? (
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-raised text-xl" aria-hidden="true">🔒</span>
                <div><h2 className="font-display text-lg font-bold">{m.title}</h2>
                  <p className="text-sm text-muted">Sealed until {prettyDate(m.deliver_on)}. {Math.ceil((Date.parse(m.deliver_on) - Date.parse(today)) / 86400000)} days to go.</p></div>
              </div>
            ) : (
              <div className="grid gap-3">
                <div><p className="text-xs font-semibold uppercase tracking-wide text-sun">Unlocked {prettyDate(m.deliver_on)}</p><h2 className="font-display text-xl font-bold">{m.title}</h2></div>
                <p className="whitespace-pre-wrap leading-relaxed">{m.message}</p>
                {m.photo_media_id && <MediaImage id={m.photo_media_id} alt="Photo from your past self" className="max-h-80 w-full rounded-xl object-cover" />}
                {m.media_id && <MediaPlayer id={m.media_id} label="Message from your past self" />}
                <Button small variant="ghost" onClick={async () => { if (confirm('Delete this message?')) { try { await api(`/api/future-self/${m.id}`, { method: 'DELETE' }); reload(); } catch (e) { toast((e as Error).message, 'error'); } } }}>Delete</Button>
              </div>
            )}
          </Card>))}</div>
      )}
    </>
  );
}
