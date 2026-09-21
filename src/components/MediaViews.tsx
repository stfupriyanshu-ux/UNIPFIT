'use client';
import { useEffect, useRef, useState } from 'react';
import { useMedia } from '@/lib/client';
import { fmtDuration } from '@/lib/client';

/** Audio/video from private storage via a short-lived signed URL. Playback only starts from a tap (autoplay-safe). */
export function MediaPlayer({ id, label = 'Promise recording' }: { id: string; label?: string }) {
  const m = useMedia(id);
  const ref = useRef<HTMLMediaElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);
  const [dur, setDur] = useState(0);
  const [err, setErr] = useState(false);
  useEffect(() => { setPlaying(false); setT(0); }, [id]);
  if (!m) return <div className="h-14 animate-pulse rounded-xl bg-raised" aria-busy="true" />;
  const isVideo = m.mime_type.startsWith('video/');
  const common = {
    ref: ref as React.RefObject<any>, src: m.url, preload: 'metadata' as const,
    onPlay: () => setPlaying(true), onPause: () => setPlaying(false), onEnded: () => setPlaying(false),
    onTimeUpdate: (e: React.SyntheticEvent<HTMLMediaElement>) => setT(e.currentTarget.currentTime),
    onLoadedMetadata: (e: React.SyntheticEvent<HTMLMediaElement>) => setDur(Number.isFinite(e.currentTarget.duration) ? e.currentTarget.duration : 0),
    onError: () => setErr(true),
  };
  const toggle = async () => { try { playing ? ref.current?.pause() : await ref.current?.play(); } catch { setErr(true); } };
  return (
    <div className="rounded-xl bg-raised p-3">
      {isVideo ? <video {...common} playsInline className="mb-2 max-h-64 w-full rounded-lg bg-black" /> : <audio {...common} />}
      <div className="flex items-center gap-3">
        <button onClick={toggle} aria-label={playing ? `Pause ${label}` : `Play ${label}`}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand text-brand-ink">
          {playing ? <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><rect x="3" y="2" width="4" height="12" rx="1" /><rect x="9" y="2" width="4" height="12" rx="1" /></svg>
            : <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M4 2.5v11l9-5.5z" /></svg>}
        </button>
        <div className="min-w-0 flex-1">
          <div className="h-1.5 overflow-hidden rounded-full bg-line"><div className="h-full bg-sun" style={{ width: dur ? `${(t / dur) * 100}%` : '0%' }} /></div>
          <p className="mt-1 text-xs text-muted tabular">{err ? 'Could not play this file.' : `${fmtDuration(Math.floor(t))} / ${fmtDuration(Math.floor(dur))}`}</p>
        </div>
      </div>
    </div>
  );
}

export function MediaImage({ id, alt, className = '' }: { id: string; alt: string; className?: string }) {
  const m = useMedia(id);
  if (!m) return <div className={`animate-pulse bg-raised ${className}`} aria-busy="true" />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={m.url} alt={alt} className={className} loading="lazy" />;
}
