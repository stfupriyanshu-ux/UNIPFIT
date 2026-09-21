'use client';
import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export async function api<T = any>(url: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(url, {
    method: opts.method ?? (opts.body !== undefined ? 'POST' : 'GET'),
    headers: opts.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  if (res.status === 401 && typeof window !== 'undefined') window.location.href = '/login';
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? 'Something went wrong. Try again.');
  return data as T;
}

export function useApi<T = any>(url: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!url);
  const load = useCallback(async () => {
    if (!url) return;
    try { setError(null); setData(await api<T>(url)); } catch (e) { setError((e as Error).message); } finally { setLoading(false); }
  }, [url]);
  useEffect(() => { setLoading(!!url); load(); }, [load, url]);
  return { data, error, loading, reload: load, setData };
}

export function toast(message: string, tone: 'ok' | 'error' = 'ok') {
  window.dispatchEvent(new CustomEvent('d1-toast', { detail: { message, tone } }));
}

/** Two-step private upload: server validates + issues a signed URL, browser uploads, server verifies. */
export async function uploadMedia(o: { purpose: string; blob: Blob; challengeId?: string | null; noteDate?: string | null; durationSeconds?: number | null }) {
  const init = await api<{ id: string; bucket: string; path: string; token: string; mime: string }>('/api/media', {
    body: { purpose: o.purpose, mime: o.blob.type, size: o.blob.size, challenge_id: o.challengeId ?? null, note_date: o.noteDate ?? null },
  });
  const { error } = await createClient().storage.from(init.bucket).uploadToSignedUrl(init.path, init.token, o.blob, { contentType: init.mime });
  if (error) {
    await api(`/api/media/${init.id}`, { method: 'DELETE' }).catch(() => {});
    throw new Error('Upload failed. Check your connection and try again.');
  }
  await api(`/api/media/${init.id}/confirm`, { body: { duration_seconds: o.durationSeconds ?? null } });
  return init.id;
}

export function useMediaUrl(id: string | null | undefined) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    setUrl(null);
    if (id) api<{ url: string }>(`/api/media/${id}`).then((r) => live && setUrl(r.url)).catch(() => {});
    return () => { live = false; };
  }, [id]);
  return url;
}

export const fmtDuration = (s: number) => {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`;
};
export const fmtHours = (s: number) => (s >= 3600 ? `${(s / 3600).toFixed(1)} h` : `${Math.round(s / 60)} min`);
export const localToday = () => new Intl.DateTimeFormat('en-CA').format(new Date());
export const prettyDate = (iso: string, opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }) =>
  new Date(iso + 'T12:00:00').toLocaleDateString(undefined, opts);

export function useMedia(id: string | null | undefined) {
  const [m, setM] = useState<{ url: string; mime_type: string } | null>(null);
  useEffect(() => {
    let live = true;
    setM(null);
    if (id) api<{ url: string; mime_type: string }>(`/api/media/${id}`).then((r) => live && setM(r)).catch(() => {});
    return () => { live = false; };
  }, [id]);
  return m;
}
