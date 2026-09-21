'use client';
import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import AuthShell from '@/components/AuthShell';
import { Button, ErrorBanner, Field, Input } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';

function LoginForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(sp.get('error') === 'link' ? 'That link has expired. Request a new one.' : null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError(null);
    const { error } = await createClient().auth.signInWithPassword({ email: email.trim(), password });
    if (error) { setError(error.message === 'Invalid login credentials' ? 'Email or password is incorrect.' : error.message); setBusy(false); return; }
    const next = sp.get('next');
    router.replace(next && next.startsWith('/') && !next.startsWith('//') ? next : '/home');
    router.refresh();
  }
  return (
    <AuthShell title="Welcome back" sub="Log in to keep your promise going."
      footer={<>New here? <Link href="/signup" className="font-semibold text-brand underline">Create an account</Link></>}>
      <form onSubmit={submit} className="grid gap-4">
        {error && <ErrorBanner message={error} />}
        <Field label="Email"><Input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field label="Password"><Input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
        <Button type="submit" busy={busy}>Log in</Button>
        <Link href="/reset" className="text-center text-sm font-semibold text-brand underline">Forgot your password?</Link>
      </form>
    </AuthShell>
  );
}
export default function LoginPage() { return <Suspense><LoginForm /></Suspense>; }
