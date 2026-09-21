import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque, Figtree } from 'next/font/google';
import './globals.css';
import PwaRegister from '@/components/PwaRegister';

const display = Bricolage_Grotesque({ subsets: ['latin'], variable: '--font-display', display: 'swap' });
const body = Figtree({ subsets: ['latin'], variable: '--font-body', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'UNIPVZERO', template: '%s · UNIVZERO' },
  description: 'Start today. Become more tomorrow.',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'UNIPZERO', statusBarStyle: 'default' },
  icons: { icon: '/icons/icon.svg', apple: '/icons/icon-192.png' },
};
export const viewport: Viewport = {
  width: 'device-width', initialScale: 1, viewportFit: 'cover',
  themeColor: [{ media: '(prefers-color-scheme: light)', color: '#F3F5FB' }, { media: '(prefers-color-scheme: dark)', color: '#0C0F22' }],
};

// Apply the saved theme before first paint (no flash).
const themeScript = `(function(){try{var t=localStorage.getItem('theme')||'system';var d=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d)}catch(e){}})()`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`} suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body className="min-h-full antialiased">
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
