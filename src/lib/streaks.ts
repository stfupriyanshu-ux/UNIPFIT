import { dayNum, addDays, diffDays } from './dates.ts';

export type CheckInStatus = 'yes' | 'no' | 'skipped';
export interface CheckInLite { check_date: string; status: CheckInStatus }
export interface ChallengeLite { start_date: string; end_date: string }

export interface Stats {
  totalDays: number;      // planned duration
  dayNumber: number;      // "Day N / total" (0 before start)
  elapsedDays: number;    // days from start to min(today, end)
  completed: number;      // YES check-ins
  missed: number;         // explicit NO check-ins
  skipped: number;        // explicit "skip today"
  unlogged: number;       // elapsed past days with no check-in (they break a streak)
  completionPct: number;  // completed / totalDays
  adherencePct: number;   // completed / elapsedDays
  currentStreak: number;
  longestStreak: number;
  checkedInToday: boolean;
  phase: 'upcoming' | 'active' | 'ended';
  daysLeft: number;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Every number here is derived from the actual check-in rows.
 * Streak rules:
 *  - YES adds 1 to the run
 *  - NO resets the run
 *  - a past day with no check-in resets the run (today with no check-in yet is still "pending")
 *  - SKIPPED (explicit rest day) neither adds nor resets
 */
export function computeStats(challenge: ChallengeLite, checkIns: CheckInLite[], today: string): Stats {
  const totalDays = diffDays(challenge.end_date, challenge.start_date) + 1;
  const phase: Stats['phase'] = today < challenge.start_date ? 'upcoming' : today > challenge.end_date ? 'ended' : 'active';
  const lastDay = today < challenge.end_date ? today : challenge.end_date;
  const elapsedDays = phase === 'upcoming' ? 0 : diffDays(lastDay, challenge.start_date) + 1;

  const byDate = new Map<string, CheckInStatus>();
  for (const c of checkIns) {
    if (c.check_date >= challenge.start_date && c.check_date <= challenge.end_date) byDate.set(c.check_date, c.status);
  }

  let completed = 0, missed = 0, skipped = 0, unlogged = 0, run = 0, longest = 0;
  for (let i = 0; i < elapsedDays; i++) {
    const d = addDays(challenge.start_date, i);
    const s = byDate.get(d);
    if (s === 'yes') { completed++; run++; if (run > longest) longest = run; }
    else if (s === 'no') { missed++; run = 0; }
    else if (s === 'skipped') { skipped++; }
    else if (d < today) { unlogged++; run = 0; }
    // else: today, not yet checked in -> pending, run untouched
  }

  return {
    totalDays,
    dayNumber: phase === 'upcoming' ? 0 : Math.min(dayNum(today) - dayNum(challenge.start_date) + 1, totalDays),
    elapsedDays,
    completed, missed, skipped, unlogged,
    completionPct: round1((completed / totalDays) * 100),
    adherencePct: elapsedDays ? round1((completed / elapsedDays) * 100) : 0,
    currentStreak: run,
    longestStreak: longest,
    checkedInToday: byDate.has(today),
    phase,
    daysLeft: Math.max(0, diffDays(challenge.end_date, today)),
  };
}

export const STREAK_MILESTONES = [3, 7, 14, 30, 50, 100, 200, 300, 365];
export const PROGRESS_MILESTONES = [25, 50, 75, 100];
