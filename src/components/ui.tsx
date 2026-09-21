'use client';
import { useEffect, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react';

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'danger' | 'sun'; busy?: boolean; small?: boolean };
export function Button({ variant = 'primary', busy, small, className = '', children, disabled, ...p }: BtnProps) {
  const v = {
    primary: 'bg-brand text-brand-ink hover:opacity-90',
    sun: 'bg-sun text-[#1a1400] hover:opacity-90',
    ghost: 'bg-raised text-ink hover:opacity-80',
    danger: 'bg-miss text-white hover:opacity-90',
  }[variant];
  return (
    <button {...p} disabled={disabled || busy}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition disabled:opacity-50 ${small ? 'min-h-9 px-3 text-sm' : 'min-h-11 px-4'} ${v} ${className}`}>
      {busy && <Spinner />}{children}
    </button>
  );
}

export const Spinner = () => (
  <span role="status" aria-label="Loading" className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
);

export const Card = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <section className={`rounded-2xl border border-line bg-surface p-4 ${className}`}>{children}</section>
);

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}
const inputCls = 'w-full rounded-xl border border-line bg-bg px-3 py-2.5 text-ink placeholder:text-muted focus:border-brand';
export const Input = (p: InputHTMLAttributes<HTMLInputElement>) => <input {...p} className={`${inputCls} ${p.className ?? ''}`} />;
export const Textarea = (p: TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...p} className={`${inputCls} min-h-24 ${p.className ?? ''}`} />;
export const Select = (p: React.SelectHTMLAttributes<HTMLSelectElement>) => <select {...p} className={`${inputCls} ${p.className ?? ''}`} />;

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition ${checked ? 'bg-done' : 'bg-line'}`}>
      <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  );
}

export const ErrorBanner = ({ message, onRetry }: { message: string; onRetry?: () => void }) => (
  <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-miss p-3 text-sm text-miss">
    <span>{message}</span>{onRetry && <button onClick={onRetry} className="font-semibold underline">Retry</button>}
  </div>
);

export const Loading = ({ label = 'Loading' }: { label?: string }) => (
  <div className="grid place-items-center py-16 text-muted" aria-live="polite"><Spinner /><span className="sr-only">{label}</span></div>
);

export const EmptyState = ({ title, body, action }: { title: string; body: string; action?: ReactNode }) => (
  <div className="rounded-2xl border border-dashed border-line p-8 text-center">
    <h3 className="font-display text-xl font-bold">{title}</h3>
    <p className="mx-auto mt-1 max-w-sm text-sm text-muted">{body}</p>
    {action && <div className="mt-4 flex justify-center">{action}</div>}
  </div>
);

export const PageTitle = ({ title, sub, right }: { title: string; sub?: string; right?: ReactNode }) => (
  <header className="mb-5 flex items-end justify-between gap-3">
    <div><h1 className="font-display text-3xl font-bold leading-tight">{title}</h1>{sub && <p className="text-sm text-muted">{sub}</p>}</div>
    {right}
  </header>
);

/** Global toast host: call toast('...') from anywhere. */
export function Toaster() {
  const [t, setT] = useState<{ message: string; tone: string } | null>(null);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const on = (e: Event) => { setT((e as CustomEvent).detail); clearTimeout(timer); timer = setTimeout(() => setT(null), 3800); };
    window.addEventListener('d1-toast', on);
    return () => { window.removeEventListener('d1-toast', on); clearTimeout(timer); };
  }, []);
  if (!t) return null;
  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-[70] flex justify-center px-4 md:bottom-8">
      <div className={`animate-rise rounded-xl px-4 py-3 text-sm font-semibold shadow-lg ${t.tone === 'error' ? 'bg-miss text-white' : 'bg-ink text-bg'}`}>{t.message}</div>
    </div>
  );
}
