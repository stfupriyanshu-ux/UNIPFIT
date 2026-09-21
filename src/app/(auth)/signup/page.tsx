'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AuthShell from '@/components/AuthShell';
import { Button, ErrorBanner, Field, Input } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    if (password.length < 8) { setError('Use at least 8 characters for your password.'); return; }
    setBusy(true);
    const { data, error } = await createClient().auth.signUp({
      email: email.trim(), password,
      options: {
        data: { display_name: name.trim(), timezone: Intl.DateTimeFormat().resolvedOptions().timeZone },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/challenges/new`,
      },
    });
    if (error) { setError(error.message); setBusy(false); return; }
    if (data.session) { router.replace('/challenges/new'); router.refresh(); } else { setSent(true); setBusy(false); }
  }

  if (sent) return (
    <AuthShell title="Check your email" sub={`We sent a confirmation link to ${email}. Open it to start your Day 1.`}
      footer={<Link href="/login" className="font-semibold text-brand underline">Back to log in</Link>}><span /></AuthShell>
  );
  return (
    <AuthShell title="Make your Day 1 promise" sub="Free forever. No ads, no subscriptions."
      footer={<>Already have an account? <Link href="/login" className="font-semibold text-brand underline">Log in</Link></>}>
      <form onSubmit={submit} className="grid gap-4">
        {error && <ErrorBanner message={error} />}
        <Field label="Your name"><Input required maxLength={80} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Email"><Input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field label="Password" hint="At least 8 characters."><Input type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
        <Button type="submit" busy={busy}>Create account</Button>
      </form>
    </AuthShell>
  );
}
