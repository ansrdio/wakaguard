'use client';

import Image from 'next/image';
import { Crosshair } from 'lucide-react';
import { NigerianState } from '@/lib/nigerianStates';

interface MobileTopBarProps {
  selectedState: NigerianState | null;
  onStateClick: () => void;
  onLocate: () => void;
  locating: boolean;
}

export function MobileTopBar({ selectedState, onStateClick, onLocate, locating }: MobileTopBarProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-30 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 shadow-sm" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="flex items-center justify-between px-4 h-14">
        {/* Brand with Logo */}
        <div className="flex items-center gap-2">
          <Image 
            src="/icons/icon-48x48.png" 
            alt="WakaGuard" 
            width={28} 
            height={28}
            className="rounded-lg"
          />
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">WakaGuard</h1>
        </div>

        {/* State Selector + Locate */}
        <div className="flex items-center gap-2">
          <button
            onClick={onStateClick}
            className="px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            {selectedState || 'Select State'}
          </button>
          <button
            onClick={onLocate}
            disabled={locating}
            className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
            aria-label="Use my location"
          >
            {locating ? (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent" />
            ) : (
              <Crosshair className="w-5 h-5 text-slate-700" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
