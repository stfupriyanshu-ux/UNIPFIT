export interface NotificationPrefs {
  enabled: boolean;
  morning: { enabled: boolean; time: string };
  check_in: { enabled: boolean; time: string };
  goal: boolean; streak: boolean; milestone: boolean; future_self: boolean;
  quiet_hours: { enabled: boolean; start: string; end: string };
  weekends: boolean;
  snooze_until: string | null; // ISO timestamp
}
export const DEFAULT_PREFS: NotificationPrefs = {
  enabled: false,
  morning: { enabled: true, time: '08:00' },
  check_in: { enabled: true, time: '20:00' },
  goal: true, streak: true, milestone: true, future_self: true,
  quiet_hours: { enabled: true, start: '22:00', end: '07:00' },
  weekends: true,
  snooze_until: null,
};
export function mergePrefs(saved: Partial<NotificationPrefs> | null | undefined): NotificationPrefs {
  const s = saved ?? {};
  return {
    ...DEFAULT_PREFS, ...s,
    morning: { ...DEFAULT_PREFS.morning, ...(s.morning ?? {}) },
    check_in: { ...DEFAULT_PREFS.check_in, ...(s.check_in ?? {}) },
    quiet_hours: { ...DEFAULT_PREFS.quiet_hours, ...(s.quiet_hours ?? {}) },
  };
}
/** Pure decision: may a reminder of `kind` fire at `now` (minutes since midnight, local)? */
export function inQuietHours(p: NotificationPrefs, minutes: number): boolean {
  if (!p.quiet_hours.enabled) return false;
  const [sh, sm] = p.quiet_hours.start.split(':').map(Number);
  const [eh, em] = p.quiet_hours.end.split(':').map(Number);
  const s = sh * 60 + sm, e = eh * 60 + em;
  return s <= e ? minutes >= s && minutes < e : minutes >= s || minutes < e;
}
export function canNotify(p: NotificationPrefs, now: Date): boolean {
  if (!p.enabled) return false;
  if (p.snooze_until && new Date(p.snooze_until) > now) return false;
  const dow = now.getDay();
  if (!p.weekends && (dow === 0 || dow === 6)) return false;
  return !inQuietHours(p, now.getHours() * 60 + now.getMinutes());
}
