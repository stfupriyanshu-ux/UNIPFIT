'use client';
import { useEffect, useRef, useState } from 'react';
import { Button, ErrorBanner, Input, Loading, PageTitle, Select } from '@/components/ui';
import { api, useApi } from '@/lib/client';

const PERSONAS = [['supportive', 'Supportive'], ['coach', 'Coach'], ['strict', 'Strict'], ['friend', 'Friend']];
type Msg = { id?: string; role: 'user' | 'assistant'; content: string; actions?: { type: string; titles: string[] }[] };

export default function CoachPage() {
  const hist = useApi<Msg[]>('/api/ai/chat');
  const me = useApi<any>('/api/profile');
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [persona, setPersona] = useState('supportive');
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => { if (hist.data) setMsgs(hist.data); }, [hist.data]);
  useEffect(() => { if (me.data) setPersona(me.data.ai_personality); }, [me.data]);
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [msgs, busy]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const message = text.trim();
    if (!message || busy) return;
    setText(''); setError(null); setBusy(true);
    setMsgs((m) => [...m, { role: 'user', content: message }]);
    try {
      const r = await api<{ reply: string; actions: Msg['actions'] }>('/api/ai/chat', { body: { message, personality: persona } });
      setMsgs((m) => [...m, { role: 'assistant', content: r.reply, actions: r.actions }]);
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }
  async function changePersona(v: string) { setPersona(v); api('/api/profile', { method: 'PATCH', body: { ai_personality: v } }).catch(() => {}); }

  if (hist.loading) return <Loading />;
  return (
    <div className="flex min-h-[calc(100vh-9rem)] flex-col">
      <PageTitle title="Coach" sub="Knows your real numbers. Only your real numbers."
        right={<Select aria-label="Coach style" value={persona} onChange={(e) => changePersona(e.target.value)} className="!w-auto">{PERSONAS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>} />
      <div className="flex-1 space-y-3" aria-live="polite">
        {msgs.length === 0 && <p className="rounded-2xl border border-dashed border-line p-6 text-center text-muted">Ask how your week went, what to do next, or say "kal gym aur maths add kar do".</p>}
        {msgs.map((m, i) => (
          <div key={m.id ?? i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 ${m.role === 'user' ? 'bg-brand text-brand-ink' : 'border border-line bg-surface'}`}>
              {m.content}
              {m.actions?.map((a, j) => a.titles?.length > 0 && <p key={j} className="mt-2 border-t border-line pt-2 text-xs font-semibold text-done">Added tasks: {a.titles.join(', ')}</p>)}
            </div>
          </div>))}
        {busy && <p className="text-sm text-muted">Thinking...</p>}
        <div ref={end} />
      </div>
      {error && <div className="mt-3"><ErrorBanner message={error} /></div>}
      <form onSubmit={send} className="sticky bottom-20 mt-3 flex gap-2 bg-bg py-2 md:bottom-0">
        <Input aria-label="Message your coach" placeholder="Message your coach" maxLength={2000} value={text} onChange={(e) => setText(e.target.value)} />
        <Button type="submit" busy={busy}>Send</Button>
      </form>
    </div>
  );
}
