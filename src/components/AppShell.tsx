'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '@/lib/client';
import { Toaster } from '@/components/ui';
import NotificationScheduler from '@/components/NotificationScheduler';

const I = (d: string) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);

const NAV = [
  { href: '/home', label: 'Home', icon: I('M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10') },
  { href: '/challenges', label: 'Challenges', icon: I('M5 21V4m0 0h11l-2 4 2 4H5') },
  { href: '/today', label: 'Today', icon: I('M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6l1.4 1.4m10 10l1.4 1.4m0-12.8L17 7M7 17l-1.4 1.4M12 8a4 4 0 100 8 4 4 0 000-8z') },
  { href: '/progress', label: 'Progress', icon: I('M4 20V10m6 10V4m6 16v-7m4 7H2') },
  { href: '/profile', label: 'Profile', icon: I('M12 12a4 4 0 100-8 4 4 0 000 8zm-8 9a8 8 0 0116 0') },
];

export function applyTheme(theme: string) {
  try { localStorage.setItem('theme', theme); } catch {}
  const dark = theme === 'dark' || (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    api('/api/profile')
      .then((p) => {
        setProfile(p);
        applyTheme(p.theme);
      })
      .catch(() => {});

    const on = (e: Event) => {
      const p = (e as CustomEvent).detail;
      setProfile(p);
      applyTheme(p.theme);
    };

    window.addEventListener('d1-profile', on);
    return () => window.removeEventListener('d1-profile', on);
  }, []);

  const immersive = path.startsWith('/focus');

  return (
    <div className="min-h-screen">
      {!immersive && (
        <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface safe-bottom md:inset-y-0 md:left-0 md:right-auto md:w-56 md:border-r md:border-t-0">
          <div className="hidden px-5 pb-4 pt-6 md:block">
            <span className="text-2xl font-bold tracking-wider text-amber-400">UNIPFIT</span>
          </div>
          <ul className="mx-auto flex max-w-lg justify-around md:block md:max-w-none md:px-3">
            {NAV.map((n) => {
              const active = path === n.href || path.startsWith(n.href + '/');
              return (
                <li key={n.href} className="flex-1 md:mb-1">
                  <Link
                    href={n.href}
                    aria-current={active ? 'page' : undefined}
                    className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition md:min-h-11 md:flex-row md:justify-start md:gap-3 md:rounded-xl md:px-3 md:text-sm ${
                      active ? 'text-brand md:bg-raised' : 'text-muted hover:text-ink'
                    }`}
                  >
                    <span className={active ? 'text-sun' : ''}>{n.icon}</span>
                    {n.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
      <main className={immersive ? '' : 'mx-auto max-w-3xl px-4 pb-28 pt-6 safe-top md:ml-56 md:max-w-none md:px-10 md:pb-12'}>
        <div className={immersive ? '' : 'mx-auto max-w-3xl'}>{children}</div>
      </main>
      <Toaster />
      <NotificationScheduler prefs={profile?.notification_prefs ?? null} />
    </div>
  );
}
