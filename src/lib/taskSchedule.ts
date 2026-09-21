import { weekday } from './dates.ts';

export interface TaskLite {
  id: string; due_date: string | null; repeat: 'none' | 'daily' | 'weekly';
  repeat_days: number[]; created_at: string; archived: boolean;
}
/** Is this task shown on `date`? `doneDates` = dates it was completed. */
export function isTaskVisibleOn(t: TaskLite, date: string, doneDates: Set<string>): boolean {
  if (t.archived) return false;
  const created = t.created_at.slice(0, 10);
  if (t.repeat === 'none') {
    if (doneDates.has(date)) return true;                 // shown as done on the day it was done
    if (doneDates.size > 0) return false;                 // already finished on another day
    return t.due_date ? t.due_date <= date : date >= created; // overdue tasks stay visible until done
  }
  const start = t.due_date ?? created;
  if (date < start) return false;
  if (t.repeat === 'daily') return true;
  const days = t.repeat_days.length ? t.repeat_days : [weekday(start)];
  return days.includes(weekday(date));
}
