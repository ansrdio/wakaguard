'use client';

/**
 * Safe Trip on the website on a computer: the phones' own Trip screen
 * (SafetyScreen), in a window the size of a phone. It replaced the January
 * "Safety Center" (trip share, safety timer, check-in and an SOS of its own)
 * on 18 October 2026, at the owner's word, so that a trip is started, and an
 * SOS sent, the same way everywhere.
 */

import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { SafetyScreen } from '@/components/mobile/screens/SafetyScreen';
import { WeatherChip } from '@/components/mobile/WeatherChip';

interface DesktopSafeTripProps {
  isOpen: boolean;
  onClose: () => void;
  /** "Report a road problem" on the Trip screen */
  onReportRoad: () => void;
}

export function DesktopSafeTrip({ isOpen, onClose, onReportRoad }: DesktopSafeTripProps) {
  if (!isOpen || typeof document === 'undefined') return null;

  // Above the map's own layers. The window is the screen for everything the
  // Trip screen draws "on the screen" (its dialogs, messages and the undo
  // bar), as a phone's display would be: the transform keeps them inside it.
  return createPortal(
    <div
      className="fixed inset-0 z-[9000] flex items-center justify-center p-4 bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="safe-trip-title"
    >
      <div
        className="relative w-full max-w-md h-[min(860px,calc(100vh-2rem))] overflow-hidden rounded-3xl bg-slate-50 dark:bg-slate-900 shadow-2xl"
        style={{ transform: 'translateZ(0)' }}
      >
        {/* As tall as the phones' top bar, which the Trip screen leaves room for */}
        <header className="absolute top-0 inset-x-0 z-10 h-14 flex items-center justify-between px-5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
          <h2 id="safe-trip-title" className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Safe Trip</h2>
          <div className="flex items-center gap-2">
            <WeatherChip />
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5 text-slate-700 dark:text-slate-200" aria-hidden="true" />
            </button>
          </div>
        </header>
        <SafetyScreen onReportRoad={onReportRoad} notificationAction={null} onNotificationActionDone={() => {}} />
      </div>
    </div>,
    document.body
  );
}
