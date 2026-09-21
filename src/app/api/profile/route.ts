import { route, readBody, unwrap, json, ApiError } from '@/lib/api';
import { profileUpdate } from '@/lib/schemas';
import { isValidTimezone } from '@/lib/dates';
import { mergePrefs } from '@/lib/prefs';

export const GET = route(async ({ supabase, user }) => {
  let { data } = await supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle();
  if (!data) data = unwrap(await supabase.from('profiles').insert({ user_id: user.id }).select().single()); // safety net if the signup trigger was skipped
  return json({ ...data, email: user.email, notification_prefs: mergePrefs(data.notification_prefs) });
});

export const PATCH = route(async ({ supabase, user, req }) => {
  const b = await readBody(req, profileUpdate);
  if (b.timezone && !isValidTimezone(b.timezone)) throw new ApiError(422, 'Unknown timezone.');
  const row = unwrap(await supabase.from('profiles').update(b).eq('user_id', user.id).select().single());
  return json({ ...row, email: user.email, notification_prefs: mergePrefs(row.notification_prefs) });
});
