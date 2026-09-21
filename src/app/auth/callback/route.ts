import { NextResponse, type NextRequest } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

/** Email confirmation + password reset links land here. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const rawNext = searchParams.get('next') ?? '/home';
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/home'; // no open redirects

  const supabase = await createClient();
  let error: unknown = new Error('missing code');
  if (code) ({ error } = await supabase.auth.exchangeCodeForSession(code));
  else if (tokenHash && type) ({ error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash }));
  return NextResponse.redirect(`${origin}${error ? '/login?error=link' : next}`);
}
