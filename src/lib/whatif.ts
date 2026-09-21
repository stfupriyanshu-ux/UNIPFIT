// What-if projections. Simple arithmetic, always presented as ESTIMATES.
export interface WhatIfInput {
  totalDays: number; elapsedDays: number; completed: number;
  futureRatePct: number;      // 0-100: share of remaining days the user expects to complete
  dailyFocusMinutes?: number; // optional focus minutes per completed day
}
export interface WhatIfResult {
  isEstimate: true;
  remainingDays: number;
  currentPacePct: number;       // completed / elapsed so far
  projectedCompleted: number;
  projectedCompletionPct: number;
  atCurrentPaceCompleted: number;
  neededRateFor: (targetPct: number) => number | null; // % of remaining days needed to reach target
  projectedFocusHours: number;
}
export function project(i: WhatIfInput): WhatIfResult {
  const remaining = Math.max(0, i.totalDays - i.elapsedDays);
  const rate = Math.min(100, Math.max(0, i.futureRatePct)) / 100;
  const pace = i.elapsedDays > 0 ? i.completed / i.elapsedDays : 0;
  const projected = Math.min(i.totalDays, i.completed + Math.round(remaining * rate));
  return {
    isEstimate: true,
    remainingDays: remaining,
    currentPacePct: Math.round(pace * 1000) / 10,
    projectedCompleted: projected,
    projectedCompletionPct: Math.round((projected / i.totalDays) * 1000) / 10,
    atCurrentPaceCompleted: Math.min(i.totalDays, i.completed + Math.round(remaining * pace)),
    neededRateFor: (targetPct) => {
      if (remaining === 0) return null;
      const need = (targetPct / 100) * i.totalDays - i.completed;
      const r = (need / remaining) * 100;
      return r > 100 ? null : Math.max(0, Math.round(r * 10) / 10);
    },
    projectedFocusHours: Math.round((((i.dailyFocusMinutes ?? 0) * Math.round(remaining * rate)) / 60) * 10) / 10,
  };
}
