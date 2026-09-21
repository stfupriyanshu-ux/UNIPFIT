'use client';
import { useState } from 'react';
import Link from 'next/link';
import AuthShell from '@/components/AuthShell';
import { Button, ErrorBanner, Field, Input } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';

export default function ResetPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError(null);
    const { error } = await createClient().auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/auth/callback?next=/reset/update` });
    setBusy(false);
    if (error) setError(error.message); else setSent(true);
  }
  return (
    <AuthShell title="Reset your password" sub={sent ? 'If that email has an account, a reset link is on its way.' : 'Enter your email and we will send you a link.'}
      footer={<Link href="/login" className="font-semibold text-brand underline">Back to log in</Link>}>
      {!sent && (
        <form onSubmit={submit} className="grid gap-4">
          {error && <ErrorBanner message={error} />}
          <Field label="Email"><Input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          <Button type="submit" busy={busy}>Send reset link</Button>
        </form>
      )}
    </AuthShell>
  );
}
