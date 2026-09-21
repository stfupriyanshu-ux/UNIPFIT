'use client';
import { useEffect, useRef, useState } from 'react';
import { Button, ErrorBanner } from '@/components/ui';
import { MediaPlayer } from '@/components/MediaViews';
import { api, fmtDuration, toast, uploadMedia } from '@/lib/client';

const MAX_SECONDS = 180;
const TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];

interface Existing { media_file_id: string; duration_seconds: number | null }

/** Private voice promise: record, preview, save, play/pause, replace, delete. */
export default function Recorder({ challengeId, existing, onChanged }: { challengeId: string; existing: Existing | null; onChanged: () => void }) {
  const [phase, setPhase] = useState<'idle' | 'recording' | 'review' | 'saving'>('idle');
  const [secs, setSecs] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const secsRef = useRef(0);

  useEffect(() => () => { timer.current && clearInterval(timer.current); stream.current?.getTracks().forEach((t) => t.stop()); if (preview) URL.revokeObjectURL(preview); }, [preview]);

  async function start() {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') { setError('Recording is not supported in this browser.'); return; }
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch { setError('Microphone access was blocked. Allow it in your browser settings and try again.'); return; }
    const mimeType = TYPES.find((t) => MediaRecorder.isTypeSupported(t));
    const r = new MediaRecorder(stream.current, mimeType ? { mimeType } : undefined);
    chunks.current = []; secsRef.current = 0; setSecs(0);
    r.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
    r.onstop = () => {
      stream.current?.getTracks().forEach((t) => t.stop());
      const b = new Blob(chunks.current, { type: r.mimeType || mimeType || 'audio/webm' });
      setBlob(b); setPreview(URL.createObjectURL(b)); setPhase('review');
    };
    rec.current = r; r.start(); setPhase('recording');
    timer.current = setInterval(() => {
      secsRef.current += 1; setSecs(secsRef.current);
      if (secsRef.current >= MAX_SECONDS) stop();
    }, 1000);
  }
  function stop() { timer.current && clearInterval(timer.current); if (rec.current?.state === 'recording') rec.current.stop(); }
  function discard() { if (preview) URL.revokeObjectURL(preview); setPreview(null); setBlob(null); setPhase('idle'); setSecs(0); }

  async function save() {
    if (!blob) return;
    setPhase('saving'); setError(null);
    try {
      await uploadMedia({ purpose: 'promise', blob, challengeId, durationSeconds: secsRef.current });
      toast('Promise saved. Only you can hear it.'); discard(); onChanged();
    } catch (e) { setError((e as Error).message); setPhase('review'); }
  }
  async function remove() {
    if (!existing || !confirm('Delete your promise recording? This cannot be undone.')) return;
    try { await api(`/api/media/${existing.media_file_id}`, { method: 'DELETE' }); toast('Recording deleted'); onChanged(); }
    catch (e) { setError((e as Error).message); }
  }

  return (
    <div className="grid gap-3">
      {error && <ErrorBanner message={error} />}
      {phase === 'idle' && existing && (
        <>
          <MediaPlayer id={existing.media_file_id} />
          <div className="flex gap-2"><Button variant="ghost" small onClick={start}>Replace recording</Button><Button variant="ghost" small onClick={remove}>Delete</Button></div>
        </>
      )}
      {phase === 'idle' && !existing && (
        <Button onClick={start} className="w-full">
          <span className="h-3 w-3 rounded-full bg-miss" aria-hidden="true" />Record your promise
        </Button>
      )}
      {phase === 'recording' && (
        <div className="flex items-center justify-between rounded-xl bg-raised p-3">
          <span className="flex items-center gap-2 font-semibold"><span className="h-3 w-3 animate-pulse rounded-full bg-miss" />Recording <span className="tabular">{fmtDuration(secs)}</span></span>
          <Button onClick={stop} small>Stop</Button>
        </div>
      )}
      {(phase === 'review' || phase === 'saving') && preview && (
        <>
          <audio src={preview} controls className="w-full" aria-label="Preview of your recording" />
          <div className="flex gap-2">
            <Button onClick={save} busy={phase === 'saving'} className="flex-1">{existing ? 'Replace promise' : 'Save promise'}</Button>
            <Button variant="ghost" onClick={discard} disabled={phase === 'saving'}>Discard</Button>
          </div>
        </>
      )}
      <p className="text-xs text-muted">Private to you. Up to 3 minutes. Say what you're promising and why it matters.</p>
    </div>
  );
}
