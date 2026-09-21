import { item } from '@/lib/crud';
import { goalUpdate } from '@/lib/schemas';

/** After progress changes, mark the goal's milestones that have now been reached and complete the goal at 100%. */
const h = item('goals', goalUpdate, async ({ supabase }, g) => {
  const now = new Date().toISOString();
  await supabase.from('milestones').update({ achieved_at: now }).eq('goal_id', g.id).is('achieved_at', null).lte('target_value', g.current_value);
  if (Number(g.current_value) >= Number(g.target_value) && g.status === 'active') {
    await supabase.from('goals').update({ status: 'completed' }).eq('id', g.id);
  }
});
export const PATCH = h.PATCH;
export const DELETE = h.DELETE;
