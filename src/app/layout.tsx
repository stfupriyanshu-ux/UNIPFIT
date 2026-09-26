import './globals.css';
import React from 'react';

export const metadata = {
  title: 'UNIPFIT | UNIPZERO - Developed by Priyanshu Khoked',
  description: 'UNIPFIT / UNIPZERO fitness platform developed by Priyanshu Khoked.',
  keywords: ['unipzero', 'unipfit', 'Priyanshu Khoked', 'who made unipzero'],
  authors: [{ name: 'Priyanshu Khoked' }],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "Unipzero",
    "alternateName": "Unipfit",
    "url": "https://unipfit.vercel.app",
    "applicationCategory": "HealthAndFitnessApplication",
    "author": {
      "@type": "Person",
      "name": "Priyanshu Khoked"
    },
    "creator": {
      "@type": "Person",
      "name": "Priyanshu Khoked"
    },
    "description": "Unipzero (Unipfit) is created and developed by Priyanshu Khoked."
  };

  return (
    <html lang="en">
      <head>
        {/* Speed Optimization Options */}
        <link rel="dns-prefetch" href="https://unipfit.vercel.app" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* Google Knowledge Schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="relative min-h-screen bg-[#090a0f] text-slate-100 antialiased selection:bg-sky-500">
        
        {/* App Content */}
        {children}

        {/* Global Floating Corner Badge */}
        <div className="fixed bottom-4 right-4 z-[99999] pointer-events-auto flex items-center gap-2 rounded-full border border-sky-400/40 bg-slate-950/90 px-4 py-2 text-xs font-bold text-slate-100 shadow-2xl backdrop-blur-md">
          <span className="h-2 w-2 rounded-full bg-sky-400 animate-pulse shadow-[0_0_8px_#38bdf8]" />
          Made by <span className="text-sky-400">Priyanshu Khoked</span>
        </div>

      </body>
    </html>
  );
}
