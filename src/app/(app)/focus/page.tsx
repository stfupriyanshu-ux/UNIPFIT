'use client';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, ErrorBanner, Loading, Select } from '@/components/ui';
import { api, fmtDuration, fmtHours, toast, useApi } from '@/lib/client';

/** Full-screen focus timer. State lives on the server (start/pause/resume/stop), so it survives reloads. */
export default function FocusPage() {
  const timer = useApi<any>('/api/timer');
  const tasks = useApi<any[]>('/api/tasks');
  const [taskId, setTaskId] = useState('');
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const [sound, setSound] = useState(false);
  const fetchedAt = useRef(Date.now());
  const audio = useRef<{ ctx: AudioContext; src: AudioBufferSourceNode } | null>(null);
  const wake = useRef<any>(null);

  useEffect(() => { fetchedAt.current = Date.now(); }, [timer.data]);
  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 500); return () => clearInterval(i); }, []);

  const a = timer.data?.active;
  const elapsed = a ? a.elapsed_seconds + (a.status === 'running' ? Math.floor((now - fetchedAt.current) / 1000) : 0) : 0;

  const stopNoise = useCallback(() => { audio.current?.src.stop(); audio.current?.ctx.close(); audio.current = null; }, []);
  useEffect(() => () => { stopNoise(); wake.current?.release?.(); }, [stopNoise]);
  useEffect(() => { if (a?.status !== 'running') stopNoise(), setSound(false); }, [a?.status, stopNoise]);

  // Screen stays awake while a session runs (where supported).
  useEffect(() => {
    if (a?.status === 'running' && 'wakeLock' in navigator) (navigator as any).wakeLock.request('screen').then((l: any) => { wake.current = l; }).catch(() => {});
    else { wake.current?.release?.(); wake.current = null; }
  }, [a?.status]);

  function toggleNoise() {
    if (audio.current) { stopNoise(); setSound(false); return; }
    // Started from a tap, so browser autoplay rules are respected. Soft brown noise, generated locally.
    const ctx = new AudioContext(), len = ctx.sampleRate * 4, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    let last = 0; for (let i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5; }
    const src = ctx.createBufferSource(), g = ctx.createGain(); g.gain.value = 0.25;
    src.buffer = buf; src.loop = true; src.connect(g).connect(ctx.destination); src.start();
    audio.current = { ctx, src }; setSound(true);
  }
  function chime() {
    try { const c = new AudioContext(), o = c.createOscillator(), g = c.createGain(); o.frequency.value = 660; g.gain.setValueAtTime(0.2, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.8); o.connect(g).connect(c.destination); o.start(); o.stop(c.currentTime + 0.8); } catch {}
  }

  async function act(action: string) {
    setBusy(true);
    try {
      const r = await api('/api/timer', { body: { action, task_id: action === 'start' && taskId ? taskId : undefined } });
      timer.setData(r);
      if (action === 'stop') { chime(); toast('Session saved'); tasks.reload(); }
    } catch (e) { toast((e as Error).message, 'error'); timer.reload(); } finally { setBusy(false); }
  }

  if (timer.loading) return <Loading />;
  if (timer.error) return <div className="p-6"><ErrorBanner message={timer.error} onRetry={timer.reload} /></div>;
  const t = timer.data.totals;

  return (
    <div className="min-h-screen bg-bg safe-top safe-bottom">
      <div className="mx-auto grid min-h-screen max-w-lg content-between gap-8 px-5 py-6">
        <header className="flex items-center justify-between"><Link href="/home" className="font-semibold text-muted">‹ Exit</Link>
          <button onClick={toggleNoise} disabled={a?.status !== 'running'} aria-pressed={sound} className="min-h-9 rounded-full bg-raised px-3 text-sm font-semibold disabled:opacity-40">{sound ? 'Sound on' : 'Sound off'}</button></header>

        <section className="text-center" aria-live="off">
          <p className="mb-2 text-sm font-semibold text-muted">{!a ? 'Ready when you are' : a.status === 'paused' ? 'Paused' : a.task?.title ?? 'Focusing'}</p>
          <div className={`font-display text-[5.5rem] font-extrabold leading-none tabular sm:text-8xl ${a?.status === 'running' ? 'text-ink' : 'text-muted'}`} role="timer" aria-label={`Elapsed ${fmtDuration(elapsed)}`}>{fmtDuration(elapsed)}</div>
        </section>

        <section className="grid gap-3">
          {!a ? (
            <>
              <Select aria-label="Task for this session" value={taskId} onChange={(e) => setTaskId(e.target.value)}>
                <option value="">No specific task</option>{(tasks.data ?? []).filter((x) => !x.done).map((x) => <option key={x.id} value={x.id}>{x.title}</option>)}
              </Select>
              <Button onClick={() => act('start')} busy={busy} variant="sun" className="min-h-14 text-lg">Start focus</Button>
            </>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {a.status === 'running' ? <Button onClick={() => act('pause')} busy={busy} variant="ghost" className="min-h-14">Pause</Button> : <Button onClick={() => act('resume')} busy={busy} className="min-h-14">Resume</Button>}
              <Button onClick={() => act('stop')} busy={busy} variant="sun" className="min-h-14">Finish</Button>
            </div>
          )}
          <dl className="grid grid-cols-4 gap-2 text-center">
            {[['Today', t.today], ['Week', t.week], ['Month', t.month], ['All time', t.lifetime]].map(([l, v]) => (
              <div key={l as string} className="rounded-xl bg-raised p-2"><dt className="text-[11px] text-muted">{l}</dt><dd className="font-display font-bold tabular">{fmtHours(v as number)}</dd></div>))}
          </dl>
          {timer.data.recent.length > 0 && (
            <details className="rounded-xl border border-line bg-surface p-3"><summary className="cursor-pointer font-semibold">Recent sessions</summary>
              <ul className="mt-2 grid gap-1 text-sm">{timer.data.recent.slice(0, 8).map((s: any) => (
                <li key={s.id} className="flex justify-between"><span className="truncate text-muted">{s.session_date}{s.task_title ? `, ${s.task_title}` : ''}</span><span className="tabular">{fmtDuration(s.duration_seconds ?? 0)}</span></li>))}</ul></details>
          )}
        </section>
      </div>
    </div>
  );
}
