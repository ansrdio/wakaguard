'use client';

/**
 * Put the trip's destination on the map (lib/destinationPoint.ts): the map
 * moves under a pin that stays in the middle, as in the road report form.
 *
 * Full screen since build 25: in a window over the form the map was too small
 * to move and place the pin on a phone (a tester's report, 19 October 2026).
 * Laid out like the trip map (TripMapScreen.tsx).
 */

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import dynamic from 'next/dynamic';
import { ArrowLeft } from 'lucide-react';
import { useBackToClose } from '@/hooks/useBackToClose';
import { useSelectedState } from '@/hooks/useSelectedState';
import { NigerianState, STATE_CENTERS } from '@/lib/nigerianStates';
import { Point, readPoint } from '@/lib/destinationPoint';
import { whereThePhoneIs } from '@/lib/reportDistance';

const LocationPicker = dynamic(() => import('@/components/LocationPicker'), {
  ssr: false,
  loading: () => <div className="h-full bg-slate-100 dark:bg-slate-800" />,
});

export function DestinationPinSheet({ current, onDone, onClose }: {
  current: Point | null;
  onDone: (point: Point) => void;
  onClose: () => void;
}) {
  useBackToClose(true, onClose);
  const { selectedState } = useSelectedState();
  const stateCentre = STATE_CENTERS[(selectedState ?? 'Lagos') as NigerianState];
  // Start where the pin was, else where the phone is, else the middle of the chosen state
  const [start, setStart] = useState<{ point: Point; guessed: boolean } | null>(
    current ? { point: current, guessed: false } : null
  );
  const [point, setPoint] = useState<Point | null>(current);

  useEffect(() => {
    if (start) return;
    let live = true;
    void whereThePhoneIs().then((here) => {
      if (!live) return;
      const begin = here ? { point: here, guessed: false } : { point: { lat: stateCentre.lat, lng: stateCentre.lng }, guessed: true };
      setStart(begin);
      setPoint(begin.point);
    });
    return () => { live = false; };
  }, [start, stateCentre.lat, stateCentre.lng]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pin-title"
      className="fixed inset-0 z-[10000] flex flex-col bg-white dark:bg-slate-900"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <header className="flex items-center gap-2 px-2 h-14 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label="Back to the trip form"
        >
          <ArrowLeft className="w-6 h-6 text-slate-900 dark:text-white" aria-hidden="true" />
        </button>
        <h1 id="pin-title" className="text-lg font-bold text-slate-900 dark:text-white">Where are you going?</h1>
      </header>

      <p className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 flex-shrink-0">
        Move the map until the pin is on the place you are going.
      </p>

      <div className="relative flex-1 min-h-0">
        {start ? (
          <LocationPicker
            location={point ?? start.point}
            onLocationSelect={(lat, lng) => setPoint(readPoint({ lat, lng }))}
            startsFarOut={start.guessed}
            fill
          />
        ) : (
          <div className="h-full bg-slate-100 dark:bg-slate-800" />
        )}
      </div>

      <div
        className="flex-shrink-0 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 pt-4"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}
      >
        <button
          type="button"
          disabled={!point}
          onClick={() => point && onDone(point)}
          className="w-full py-3.5 rounded-2xl font-bold bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50"
        >
          Use this spot
        </button>
      </div>
    </div>,
    document.body
  );
}
