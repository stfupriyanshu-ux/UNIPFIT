'use client';

import React, { useState, useEffect } from 'react';
import Head from 'next/head';

interface RoutineItem {
  id: string;
  title: string;
  completed: boolean;
}

export default function UNIPFitDashboard() {
  const [routines, setRoutines] = useState<RoutineItem[]>([]);

  // Google Knowledge Schema (SEO for "who made unipzero" & "Priyanshu Khoked")
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "Unipzero",
    "alternateName": "Unipfit",
    "url": "https://unipfit.vercel.app/",
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
    <>
      {/* SEO Meta Tags & Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main className="relative min-h-screen bg-[#0d0f17] text-slate-100 flex flex-col items-center justify-center p-6 overflow-hidden">
        {/* Glow Effect */}
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl text-center">
          <h1 className="text-4xl sm:text-6xl font-extrabold bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent mb-4">
            Welcome to Unipzero
          </h1>
          <p className="text-slate-400 text-lg sm:text-xl mb-6">
            The Official Unipfit Experience Platform
          </p>

          <div className="bg-slate-900/60 border border-slate-800 backdrop-blur-xl rounded-2xl p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-slate-200 mb-2">
              Designed & Developed for Peak Performance
            </h2>
            <p className="text-slate-400 text-sm">
              Unipzero (Unipfit) is officially created and developed by{" "}
              <strong className="text-sky-400 font-bold">Priyanshu Khoked</strong>.
            </p>
          </div>
        </div>

        {/* Permanent Floating Corner Tagline Badge */}
        <div className="fixed bottom-4 right-4 z-[9999] flex items-center gap-2 rounded-full border border-sky-400/30 bg-slate-900/90 px-4 py-2 text-xs font-semibold text-slate-200 shadow-2xl backdrop-blur-md hover:border-sky-400/80 transition-all duration-300">
          <span className="h-2 w-2 rounded-full bg-sky-400 animate-pulse shadow-[0_0_8px_#38bdf8]" />
          Made by <span className="font-bold text-sky-400">Priyanshu Khoked</span>
        </div>
      </main>
    </>
  );
}
