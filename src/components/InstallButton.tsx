'use client';

import { usePWA } from '@/hooks/usePWA';

export default function InstallButton() {
  const { canInstall, installApp } = usePWA();

  if (!canInstall) return null;

  return (
    <button
      onClick={installApp}
      className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition-all shadow-md"
    >
      Install App
    </button>
  );
}

