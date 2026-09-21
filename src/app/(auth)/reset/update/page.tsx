'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthShell from '@/components/AuthShell';
import { Button, ErrorBanner, Field, Input } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    if (password.length < 8) { setError('Use at least 8 characters.'); return; }
    setBusy(true);
    const { error } = await createClient().auth.updateUser({ password });
    if (error) { setError(error.message.includes('session') ? 'Open the reset link from your email again.' : error.message); setBusy(false); return; }
    router.replace('/home'); router.refresh();
  }
  return (
    <AuthShell title="Choose a new password">
      <form onSubmit={submit} className="grid gap-4">
        {error && <ErrorBanner message={error} />}
        <Field label="New password" hint="At least 8 characters."><Input type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
        <Button type="submit" busy={busy}>Save password</Button>
      </form>
    </AuthShell>
  );
}
