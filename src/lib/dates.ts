// Pure date helpers. Dates are 'YYYY-MM-DD' strings in the USER's timezone.
export function todayIn(timezone: string, now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}
export function isIsoDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s + 'T00:00:00Z')) &&
    new Date(s + 'T00:00:00Z').toISOString().slice(0, 10) === s;
}
export function dayNum(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86400000);
}
export function fromDayNum(n: number): string {
  return new Date(n * 86400000).toISOString().slice(0, 10);
}
export const addDays = (iso: string, n: number) => fromDayNum(dayNum(iso) + n);
export const diffDays = (a: string, b: string) => dayNum(a) - dayNum(b);
/** 0 = Sunday ... 6 = Saturday */
export const weekday = (iso: string) => new Date(dayNum(iso) * 86400000).getUTCDay();
export const startOfWeek = (iso: string) => addDays(iso, -((weekday(iso) + 6) % 7)); // Monday
export const startOfMonth = (iso: string) => iso.slice(0, 8) + '01';
export function isValidTimezone(tz: string): boolean {
  try { new Intl.DateTimeFormat('en-CA', { timeZone: tz }); return true; } catch { return false; }
}
