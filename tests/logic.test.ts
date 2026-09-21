import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeStats, type CheckInLite } from '../src/lib/streaks.ts';
import { project } from '../src/lib/whatif.ts';
import { isTaskVisibleOn } from '../src/lib/taskSchedule.ts';
import { canNotify, mergePrefs } from '../src/lib/prefs.ts';
import { addDays, todayIn, isIsoDate, startOfWeek } from '../src/lib/dates.ts';

const gym = { start_date: '2026-09-20', end_date: '2027-09-19' }; // 365 days

test('Day 1 / 365 with nothing checked in', () => {
  const s = computeStats(gym, [], '2026-09-20');
  assert.equal(s.totalDays, 365);
  assert.equal(s.dayNumber, 1);
  assert.equal(s.completionPct, 0);
  assert.equal(s.completed, 0); assert.equal(s.missed, 0); assert.equal(s.currentStreak, 0);
  assert.equal(s.checkedInToday, false);
});

test('YES on day 1 -> 1/365, streak 1', () => {
  const c: CheckInLite[] = [{ check_date: '2026-09-20', status: 'yes' }];
  const s = computeStats(gym, c, '2026-09-20');
  assert.equal(s.completed, 1); assert.equal(s.currentStreak, 1); assert.equal(s.longestStreak, 1);
  assert.equal(s.completionPct, 0.3); assert.equal(s.checkedInToday, true);
});

test('NEXT DAY: NO resets current streak, longest stays', () => {
  const c: CheckInLite[] = [
    { check_date: '2026-09-20', status: 'yes' },
    { check_date: '2026-09-21', status: 'no' },
  ];
  const s = computeStats(gym, c, '2026-09-21');
  assert.equal(s.completed, 1); assert.equal(s.missed, 1);
  assert.equal(s.currentStreak, 0); assert.equal(s.longestStreak, 1);
  assert.equal(s.dayNumber, 2);
});

test('pending today does not break yesterday\'s streak', () => {
  const c: CheckInLite[] = [
    { check_date: '2026-09-20', status: 'yes' },
    { check_date: '2026-09-21', status: 'yes' },
  ];
  const s = computeStats(gym, c, '2026-09-22');
  assert.equal(s.currentStreak, 2); assert.equal(s.checkedInToday, false);
});

test('an unlogged past day breaks the streak', () => {
  const c: CheckInLite[] = [
    { check_date: '2026-09-20', status: 'yes' },
    { check_date: '2026-09-22', status: 'yes' },
  ];
  const s = computeStats(gym, c, '2026-09-22');
  assert.equal(s.unlogged, 1); assert.equal(s.currentStreak, 1); assert.equal(s.longestStreak, 1);
});

test('skipped is neutral', () => {
  const c: CheckInLite[] = [
    { check_date: '2026-09-20', status: 'yes' },
    { check_date: '2026-09-21', status: 'skipped' },
    { check_date: '2026-09-22', status: 'yes' },
  ];
  const s = computeStats(gym, c, '2026-09-22');
  assert.equal(s.currentStreak, 2); assert.equal(s.skipped, 1); assert.equal(s.completed, 2);
});

test('upcoming and ended phases', () => {
  assert.equal(computeStats(gym, [], '2026-09-01').phase, 'upcoming');
  assert.equal(computeStats(gym, [], '2026-09-01').dayNumber, 0);
  const e = computeStats({ start_date: '2026-01-01', end_date: '2026-01-10' }, [], '2026-02-01');
  assert.equal(e.phase, 'ended'); assert.equal(e.dayNumber, 10); assert.equal(e.elapsedDays, 10);
});

test('longest streak across a long history', () => {
  const c: CheckInLite[] = [];
  for (let i = 0; i < 10; i++) c.push({ check_date: addDays('2026-09-20', i), status: i === 4 ? 'no' : 'yes' });
  const s = computeStats(gym, c, addDays('2026-09-20', 9));
  assert.equal(s.longestStreak, 5); assert.equal(s.currentStreak, 5); assert.equal(s.completed, 9);
});

test('what-if is labeled as an estimate and does the math', () => {
  const r = project({ totalDays: 100, elapsedDays: 40, completed: 30, futureRatePct: 50, dailyFocusMinutes: 60 });
  assert.equal(r.isEstimate, true);
  assert.equal(r.projectedCompleted, 60); assert.equal(r.projectedCompletionPct, 60);
  assert.equal(r.atCurrentPaceCompleted, 75); assert.equal(r.neededRateFor(90), 100);
  assert.equal(r.neededRateFor(95), null); assert.equal(r.projectedFocusHours, 30);
});

test('task schedule', () => {
  const base = { id: 't', due_date: null, repeat: 'none' as const, repeat_days: [], created_at: '2026-09-20T10:00:00Z', archived: false };
  assert.equal(isTaskVisibleOn(base, '2026-09-21', new Set()), true);
  assert.equal(isTaskVisibleOn(base, '2026-09-21', new Set(['2026-09-20'])), false);
  assert.equal(isTaskVisibleOn({ ...base, due_date: '2026-09-25' }, '2026-09-21', new Set()), false);
  assert.equal(isTaskVisibleOn({ ...base, repeat: 'weekly', repeat_days: [1] }, '2026-09-21', new Set()), true); // Monday
  assert.equal(isTaskVisibleOn({ ...base, repeat: 'weekly', repeat_days: [1] }, '2026-09-22', new Set()), false);
  assert.equal(isTaskVisibleOn({ ...base, repeat: 'daily' }, '2026-09-19', new Set()), false); // before start
});

test('notifications respect quiet hours, weekends, snooze', () => {
  const p = mergePrefs({ enabled: true });
  assert.equal(canNotify(p, new Date(2026, 8, 21, 12, 0)), true);   // Monday noon
  assert.equal(canNotify(p, new Date(2026, 8, 21, 23, 0)), false);  // quiet hours
  assert.equal(canNotify(p, new Date(2026, 8, 21, 6, 30)), false);  // quiet hours wrap past midnight
  assert.equal(canNotify({ ...p, weekends: false }, new Date(2026, 8, 20, 12, 0)), false); // Sunday
  assert.equal(canNotify({ ...p, snooze_until: new Date(2026, 8, 21, 13, 0).toISOString() }, new Date(2026, 8, 21, 12, 0)), false);
  assert.equal(canNotify(mergePrefs({}), new Date(2026, 8, 21, 12, 0)), false); // disabled by default
});

test('date helpers', () => {
  assert.equal(todayIn('Asia/Kolkata', new Date('2026-09-20T20:00:00Z')), '2026-09-21');
  assert.equal(todayIn('America/Los_Angeles', new Date('2026-09-20T03:00:00Z')), '2026-09-19');
  assert.equal(isIsoDate('2026-02-30'), false); assert.equal(isIsoDate('2026-09-20'), true);
  assert.equal(startOfWeek('2026-09-20'), '2026-09-14'); // Sunday -> previous Monday
});
