'use client';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui';
import { toast, uploadMedia } from '@/lib/client';

const OK = ['image/jpeg', 'image/png', 'image/webp'];

export default function PhotoUpload({ purpose, challengeId, noteDate, label = 'Add photo', maxMb = 5, onDone }: {
  purpose: 'strict_photo' | 'note_photo' | 'avatar' | 'future_photo'; challengeId?: string | null; noteDate?: string | null;
  label?: string; maxMb?: number; onDone: (mediaId: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (!OK.includes(f.type)) { toast('Use a JPG, PNG or WebP image.', 'error'); return; }
    if (f.size > maxMb * 1048576) { toast(`Photos can be up to ${maxMb} MB.`, 'error'); return; }
    setBusy(true);
    try { onDone(await uploadMedia({ purpose, blob: f, challengeId, noteDate })); toast('Photo saved'); }
    catch (err) { toast((err as Error).message, 'error'); } finally { setBusy(false); }
  }
  return (
    <>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={pick} aria-label={label} />
      <Button variant="ghost" small busy={busy} onClick={() => input.current?.click()}>{label}</Button>
    </>
  );
}
