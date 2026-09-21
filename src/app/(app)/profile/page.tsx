'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { MediaImage } from '@/components/MediaViews';
import PhotoUpload from '@/components/PhotoUpload';
import { Button, Card, ErrorBanner, Field, Input, Loading, PageTitle, Select, Toggle } from '@/components/ui';
import { api, toast, useApi } from '@/lib/client';
import { createClient } from '@/lib/supabase/client';
import { notificationsSupported, requestPermission } from '@/lib/notify';
import type { NotificationPrefs } from '@/lib/prefs';

export default function ProfilePage() {
  const router = useRouter();
  const { data, error, loading, reload } = useApi<any>('/api/profile');
  const [name, setName] = useState('');
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [del, setDel] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => { if (data) { setName(data.display_name); setPrefs(data.notification_prefs); } }, [data]);
  if (loading) return <Loading />;
  if (error || !data || !prefs) return <ErrorBanner message={error ?? 'Could not load'} onRetry={reload} />;

  async function save(body: object, msg = 'Saved') {
    try { const p = await api('/api/profile', { method: 'PATCH', body }); window.dispatchEvent(new CustomEvent('d1-profile', { detail: p })); toast(msg); reload(); }
    catch (e) { toast((e as Error).message, 'error'); }
  }
  async function setPref(next: NotificationPrefs) { setPrefs(next); await save({ notification_prefs: next }, 'Reminder settings saved'); }
  async function enable(v: boolean) {
    if (v) {
      if (!notificationsSupported()) { toast('This browser does not support notifications.', 'error'); return; }
      const r = await requestPermission();
      if (r !== 'granted') { toast('Notifications are blocked. Allow them in your browser settings.', 'error'); return; }
    }
    setPref({ ...prefs!, enabled: v });
  }
  async function exportData() {
    setBusy('export');
    try {
      const res = await fetch('/api/account/export'); if (!res.ok) throw new Error('Export failed');
      const url = URL.createObjectURL(await res.blob()); const a = document.createElement('a');
      a.href = url; a.download = 'univzero-export.json'; a.click(); URL.revokeObjectURL(url);
    } catch (e) { toast((e as Error).message, 'error'); } finally { setBusy(null); }
  }
  async function logout() { await createClient().auth.signOut(); router.replace('/login'); router.refresh(); }
  async function deleteAccount() {
    if (!confirm('This permanently deletes your account, check-ins, recordings and photos. There is no undo. Continue?')) return;
    setBusy('delete');
    try { await api('/api/account/delete', { body: { confirm: 'DELETE' } }); await createClient().auth.signOut(); router.replace('/signup'); router.refresh(); }
    catch (e) { toast((e as Error).message, 'error'); setBusy(null); }
  }
  const p = prefs;
  const row = (label: string, key: 'goal' | 'streak' | 'milestone' | 'future_self') => (
    <div className="flex items-center justify-between gap-3"><span>{label}</span><Toggle checked={p[key]} label={label} onChange={(v) => setPref({ ...p, [key]: v })} /></div>);

  return (
    <div className="grid gap-5">
      <PageTitle title="Profile" sub={data.email} />

      <Card className="grid gap-4">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full bg-raised">
            {data.avatar_media_id ? <MediaImage id={data.avatar_media_id} alt="Your photo" className="h-full w-full object-cover" /> : <span className="grid h-full place-items-center font-display text-2xl font-bold">{(name || '?')[0]?.toUpperCase()}</span>}
          </div>
          <PhotoUpload purpose="avatar" maxMb={2} label="Change photo" onDone={() => reload()} />
        </div>
        <form onSubmit={(e) => { e.preventDefault(); save({ display_name: name.trim() }); }} className="flex items-end gap-2">
          <div className="flex-1"><Field label="Name"><Input maxLength={80} value={name} onChange={(e) => setName(e.target.value)} /></Field></div><Button type="submit">Save</Button>
        </form>
      </Card>

      <Card className="grid gap-4">
        <h2 className="font-display text-xl font-bold">Appearance and coach</h2>
        <Field label="Theme"><Select value={data.theme} onChange={(e) => save({ theme: e.target.value })}><option value="system">Match my device</option><option value="light">Light</option><option value="dark">Dark</option></Select></Field>
        <Field label="Coach style"><Select value={data.ai_personality} onChange={(e) => save({ ai_personality: e.target.value })}><option value="supportive">Supportive</option><option value="coach">Coach</option><option value="strict">Strict</option><option value="friend">Friend</option></Select></Field>
        <Field label="Timezone" hint="Decides when your day starts and ends.">
          <div className="flex gap-2"><Input readOnly value={data.timezone} />
            <Button variant="ghost" onClick={() => save({ timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }, 'Timezone updated')}>Use this device</Button></div>
        </Field>
      </Card>

      <Card className="grid gap-4">
        <div className="flex items-center justify-between gap-3">
          <div><h2 className="font-display text-xl font-bold">Reminders</h2><p className="text-sm text-muted">Sent while the app is open or installed. Never more than 4 a day.</p></div>
          <Toggle checked={p.enabled} label="Reminders" onChange={enable} />
        </div>
        {p.enabled && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Morning reminder"><Input type="time" value={p.morning.time} onChange={(e) => setPref({ ...p, morning: { ...p.morning, time: e.target.value } })} /></Field>
              <Field label="Check-in reminder"><Input type="time" value={p.check_in.time} onChange={(e) => setPref({ ...p, check_in: { ...p.check_in, time: e.target.value } })} /></Field>
            </div>
            <div className="flex items-center justify-between gap-3"><span>Morning reminder</span><Toggle checked={p.morning.enabled} label="Morning reminder" onChange={(v) => setPref({ ...p, morning: { ...p.morning, enabled: v } })} /></div>
            <div className="flex items-center justify-between gap-3"><span>Check-in reminder</span><Toggle checked={p.check_in.enabled} label="Check-in reminder" onChange={(v) => setPref({ ...p, check_in: { ...p.check_in, enabled: v } })} /></div>
            {row('Streak at risk', 'streak')}{row('Goal deadlines', 'goal')}{row('Milestones', 'milestone')}{row('Future-self unlocked', 'future_self')}
            <div className="flex items-center justify-between gap-3"><span>Weekend reminders</span><Toggle checked={p.weekends} label="Weekend reminders" onChange={(v) => setPref({ ...p, weekends: v })} /></div>
            <div className="grid gap-2">
              <div className="flex items-center justify-between gap-3"><span>Quiet hours</span><Toggle checked={p.quiet_hours.enabled} label="Quiet hours" onChange={(v) => setPref({ ...p, quiet_hours: { ...p.quiet_hours, enabled: v } })} /></div>
              {p.quiet_hours.enabled && <div className="grid grid-cols-2 gap-3">
                <Field label="From"><Input type="time" value={p.quiet_hours.start} onChange={(e) => setPref({ ...p, quiet_hours: { ...p.quiet_hours, start: e.target.value } })} /></Field>
                <Field label="Until"><Input type="time" value={p.quiet_hours.end} onChange={(e) => setPref({ ...p, quiet_hours: { ...p.quiet_hours, end: e.target.value } })} /></Field></div>}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" small onClick={() => setPref({ ...p, snooze_until: new Date(Date.now() + 3600_000).toISOString() })}>Snooze 1 hour</Button>
              <Button variant="ghost" small onClick={() => { const d = new Date(); d.setHours(24, 0, 0, 0); setPref({ ...p, snooze_until: d.toISOString() }); }}>Snooze until tomorrow</Button>
              {p.snooze_until && new Date(p.snooze_until) > new Date() && <Button variant="ghost" small onClick={() => setPref({ ...p, snooze_until: null })}>Cancel snooze</Button>}
            </div>
          </>
        )}
      </Card>

      <Card className="grid gap-4">
        <h2 className="font-display text-xl font-bold">Privacy and data</h2>
        <div className="flex items-center justify-between gap-4">
          <div><p className="font-semibold">Let the AI coach see my activity</p><p className="text-sm text-muted">Your check-ins, goals and notes are sent to the AI only while you chat. Off = the coach knows nothing about you.</p></div>
          <Toggle checked={data.privacy?.ai_uses_my_data !== false} label="AI coach data access" onChange={(v) => save({ privacy: { ai_uses_my_data: v } })} />
        </div>
        <p className="text-sm text-muted">Your recordings and photos are private: only you can open them, through short-lived links.</p>
        <Button variant="ghost" busy={busy === 'export'} onClick={exportData}>Download all my data (JSON)</Button>
      </Card>

      <Button variant="ghost" onClick={logout}>Log out</Button>

      <Card className="grid gap-3 border-miss">
        <h2 className="font-display text-xl font-bold text-miss">Delete account</h2>
        <p className="text-sm text-muted">Permanently removes your account and everything in it. Download your data first if you want a copy. Type DELETE to enable.</p>
        <Input aria-label="Type DELETE to confirm" placeholder="DELETE" value={del} onChange={(e) => setDel(e.target.value)} />
        <Button variant="danger" disabled={del !== 'DELETE'} busy={busy === 'delete'} onClick={deleteAccount}>Delete my account</Button>
      </Card>
    </div>
  );
}
