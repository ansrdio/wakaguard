'use client';

import { Crosshair } from 'lucide-react';
import { NigerianState } from '@/lib/nigerianStates';

interface MobileTopBarProps {
  title: string;
  /** The state chip and the locate button only matter where reports are shown */
  showAreaControls: boolean;
  selectedState: NigerianState | null;
  onStateClick: () => void;
  onLocate: () => void;
  locating: boolean;
}

export function MobileTopBar({ title, showAreaControls, selectedState, onStateClick, onLocate, locating }: MobileTopBarProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-30 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="flex items-center justify-between px-5 h-14">
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">{title}</h1>

        {showAreaControls && (
          <div className="flex items-center gap-2">
            <button
              onClick={onStateClick}
              className="px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              {selectedState || 'Select State'}
            </button>
            <button
              onClick={onLocate}
              disabled={locating}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors disabled:opacity-50"
              aria-label="Use my location"
            >
              {locating ? (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-brand-600 border-t-transparent" />
              ) : (
                <Crosshair className="w-5 h-5 text-slate-700 dark:text-slate-200" />
              )}
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
