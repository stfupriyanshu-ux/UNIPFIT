import Link from 'next/link';

export const Wordmark = ({ size = 'text-3xl' }: { size?: string }) => (
  <span className={`font-display font-extrabold tracking-tight ${size}`}>unip<span className="text-sun">ZERO</span></span>
);

export default function AuthShell({ title, sub, children, footer }: { title: string; sub?: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <main className="mx-auto grid min-h-screen w-full max-w-md content-center gap-6 px-5 py-10 safe-top">
      <div>
        <Link href="/login" aria-label="UNIVZERO home"><Wordmark /></Link>
        <p className="mt-1 text-sm text-muted">Start today. Become more tomorrow.</p>
      </div>
      <div className="rounded-2xl border border-line bg-surface p-5">
        <h1 className="font-display text-2xl font-bold">{title}</h1>
        {sub && <p className="mt-1 text-sm text-muted">{sub}</p>}
        <div className="mt-4 grid gap-4">{children}</div>
      </div>
      {footer && <p className="text-center text-sm text-muted">{footer}</p>}
    </main>
  );
}
