import { route, unwrapList, json } from '@/lib/api';
import { collection } from '@/lib/crud';
import { goalCreate } from '@/lib/schemas';

const h = collection('goals', goalCreate);
export const POST = h.POST;
/** Goals with their milestones and live progress %. */
export const GET = route(async ({ supabase }) => {
  const goals = unwrapList(await supabase.from('goals').select('*').neq('status', 'archived').order('created_at', { ascending: false }));
  const ms = unwrapList(await supabase.from('milestones').select('*').eq('kind', 'goal').order('target_value'));
  return json(goals.map((g) => ({
    ...g,
    progress_pct: Math.min(100, Math.round((Number(g.current_value) / Number(g.target_value)) * 1000) / 10),
    milestones: ms.filter((m) => m.goal_id === g.id),
  })));
});
