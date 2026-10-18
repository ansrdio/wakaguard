'use client';

/** "Ending your trip in 5… Undo", above the tab bar while "I've arrived" waits (lib/arriveUndo.ts) */

import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { BOTTOM_NAV_HEIGHT } from '@/lib/mobileLayout';
import { undoSecondsLeft } from '@/lib/arriveUndo';

export function ArriveUndoBar({ startedMs, onUndo }: { startedMs: number; onUndo: () => void }) {
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNowMs(Date.now()), 250);
    return () => clearInterval(interval);
  }, []);
  const seconds = undoSecondsLeft(startedMs, nowMs);

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed left-4 right-4 z-50 flex items-center gap-3 rounded-2xl bg-slate-900 text-white shadow-xl p-3 pl-4"
      style={{ bottom: `calc(${BOTTOM_NAV_HEIGHT} + 0.75rem)` }}
    >
      <Check className="w-5 h-5 shrink-0 text-brand-300" aria-hidden="true" />
      <p className="flex-1 text-sm font-medium">
        {seconds > 0 ? `Ending your trip in ${seconds}…` : 'Ending your trip…'}
      </p>
      <button
        type="button"
        onClick={onUndo}
        className="px-4 py-2.5 rounded-xl bg-white text-slate-900 font-bold"
      >
        Undo
      </button>
    </div>
  );
}
