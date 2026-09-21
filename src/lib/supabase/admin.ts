import { createClient } from '@supabase/supabase-js';

/**
 * SERVER ONLY. Bypasses RLS. Only use AFTER the caller has been authenticated and the
 * resource ownership has been verified with the user-scoped client.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
