'use client';
import { useEffect, useRef } from 'react';
import { api } from '@/lib/client';
import { canNotify, mergePrefs, type NotificationPrefs } from '@/lib/prefs';
import { fireOnce } from '@/lib/notify';

const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
/** Fires only inside a window after the chosen time so a reminder never shows hours late. */
const due = (t: string, now: Date, windowMin = 90) => { const d = now.getHours() * 60 + now.getMinutes() - toMin(t); return d >= 0 && d < windowMin; };

/**
 * In-app reminder engine (runs while the app is open or installed and alive).
 * Reminders come from real data: unchecked challenges, goal deadlines, unlocked future-self notes.
 * True background push needs a push server; see README.
 */
export default function NotificationScheduler({ prefs }: { prefs: NotificationPrefs | null }) {
  const ref = useRef(prefs);
  ref.current = prefs ? mergePrefs(prefs) : null;

  useEffect(() => {
    async function tick() {
      const p = ref.current, now = new Date();
      if (!p || !canNotify(p, now)) return;
      try {
        if (p.morning.enabled && due(p.morning.time, now)) {
          const cs = await api<any[]>('/api/challenges');
          const active = cs.filter((c) => c.status === 'active' && c.stats.phase === 'active');
          if (active.length) await fireOnce('morning', 'Good morning', `Day ${active[0].stats.dayNumber} of ${active[0].title}. Make it count.`, '', '/today');
          if (p.future_self) {
            const fs = await api<any[]>('/api/future-self');
            const ready = fs.filter((f) => !f.locked && f.deliver_on === new Intl.DateTimeFormat('en-CA').format(now));
            if (ready.length) await fireOnce('future_self', 'A message from past you', 'It is unlocked and waiting.', 'today', '/future-self');
          }
        }
        if (p.check_in.enabled && due(p.check_in.time, now)) {
          const cs = await api<any[]>('/api/challenges');
          const open = cs.filter((c) => c.status === 'active' && c.stats.phase === 'active' && !c.stats.checkedInToday);
          if (open.length) {
            const hot = open.find((c) => c.stats.currentStreak >= 3);
            if (hot && p.streak) await fireOnce('streak', `Your ${hot.stats.currentStreak}-day streak is waiting`, `Check in for ${hot.title} before the day ends.`, hot.id, '/today');
            else await fireOnce('check_in', 'Time to check in', open.length === 1 ? `Did you do ${open[0].title} today?` : `${open.length} challenges are waiting for today's answer.`, '', '/today');
          }
        }
        if (p.goal && due('12:00', now, 120)) {
          const gs = await api<any[]>('/api/goals');
          const soon = gs.find((g) => g.status === 'active' && g.deadline && g.progress_pct < 100 &&
            (Date.parse(g.deadline + 'T00:00:00') - now.getTime()) / 86400000 <= 3 && Date.parse(g.deadline + 'T23:59:59') >= now.getTime());
          if (soon) await fireOnce('goal', 'A goal deadline is close', `${soon.title} is at ${soon.progress_pct}%.`, soon.id, '/goals');
        }
      } catch { /* offline or signed out: try again next tick */ }
    }
    const id = setInterval(tick, 60_000);
    tick();
    return () => clearInterval(id);
  }, []);
  return null;
}
