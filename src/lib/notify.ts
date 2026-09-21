'use client';
import { api } from '@/lib/client';

export type NotifyKind = 'morning' | 'check_in' | 'goal' | 'streak' | 'milestone' | 'future_self';
const DAILY_CAP = 4; // never spam

export const notificationsSupported = () => typeof window !== 'undefined' && 'Notification' in window;

export async function requestPermission(): Promise<NotificationPermission> {
  if (!notificationsSupported()) return 'denied';
  return Notification.requestPermission(); // must be called from a user gesture
}

/** Shows a browser notification at most once per (kind, key, day) and at most DAILY_CAP per day. Returns true if shown. */
export async function fireOnce(kind: NotifyKind, title: string, body: string, key = '', url = '/today'): Promise<boolean> {
  if (!notificationsSupported() || Notification.permission !== 'granted') return false;
  const day = new Intl.DateTimeFormat('en-CA').format(new Date());
  const seen = `d1:n:${kind}:${key}:${day}`, cap = `d1:n:count:${day}`;
  try {
    if (localStorage.getItem(seen)) return false;
    const n = Number(localStorage.getItem(cap) ?? 0);
    if (n >= DAILY_CAP) return false;
    localStorage.setItem(seen, '1'); localStorage.setItem(cap, String(n + 1));
  } catch { /* storage unavailable: fall through */ }
  const opts = { body, tag: `${kind}-${key}`, icon: '/icons/icon-192.png', data: { url } };
  const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
  if (reg) await reg.showNotification(title, opts); else new Notification(title, opts);
  api('/api/notifications', { body: { kind, title, body } }).catch(() => {});
  return true;
}

/** Milestones respect the user's own notification settings (enabled, milestone toggle, quiet hours, snooze). */
export async function notifyMilestone(title: string) {
  try {
    const { mergePrefs, canNotify } = await import('@/lib/prefs');
    const p = mergePrefs((await api<any>('/api/profile')).notification_prefs);
    if (p.milestone && canNotify(p, new Date())) await fireOnce('milestone', 'Milestone reached', title, title, '/progress');
  } catch { /* ignore */ }
}
