import type { SupabaseClient } from '@supabase/supabase-js';
import { PROGRESS_MILESTONES, STREAK_MILESTONES, type Stats } from './streaks.ts';

/** Records streak/progress milestones the moment they are truly reached. Idempotent via unique(user_id, milestone_key). */
export async function awardChallengeMilestones(
  supabase: SupabaseClient, userId: string, challenge: { id: string; title: string }, stats: Stats,
): Promise<string[]> {
  const rows: { key: string; kind: 'challenge_streak' | 'challenge_progress'; title: string; value: number }[] = [];
  for (const n of STREAK_MILESTONES) {
    if (stats.currentStreak >= n) rows.push({ key: `c:${challenge.id}:streak:${n}`, kind: 'challenge_streak', title: `${n}-day streak: ${challenge.title}`, value: n });
  }
  for (const p of PROGRESS_MILESTONES) {
    if (stats.completionPct >= p) rows.push({ key: `c:${challenge.id}:progress:${p}`, kind: 'challenge_progress', title: `${p}% complete: ${challenge.title}`, value: p });
  }
  if (!rows.length) return [];
  const { data } = await supabase.from('milestones').upsert(
    rows.map((r) => ({
      user_id: userId, challenge_id: challenge.id, kind: r.kind, milestone_key: r.key,
      title: r.title, target_value: r.value, achieved_at: new Date().toISOString(),
    })),
    { onConflict: 'user_id,milestone_key', ignoreDuplicates: true },
  ).select('title');
  return (data ?? []).map((d: { title: string }) => d.title); // only rows actually inserted are returned
}
