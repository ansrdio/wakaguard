'use client';

/**
 * Put the trip's destination on the map (lib/destinationPoint.ts): the map
 * moves under a pin that stays in the middle, as in the road report form.
 */

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { X } from 'lucide-react';
import { useBackToClose } from '@/hooks/useBackToClose';
import { useSelectedState } from '@/hooks/useSelectedState';
import { NigerianState, STATE_CENTERS } from '@/lib/nigerianStates';
import { Point, readPoint } from '@/lib/destinationPoint';
import { whereThePhoneIs } from '@/lib/reportDistance';

const LocationPicker = dynamic(() => import('@/components/LocationPicker'), {
  ssr: false,
  loading: () => <div className="h-72 rounded-lg bg-slate-100 dark:bg-slate-800" />,
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" role="dialog" aria-modal="true" aria-labelledby="pin-title">
      <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-sm p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 id="pin-title" className="text-lg font-bold text-slate-900 dark:text-white">Where are you going?</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="p-2 rounded-full bg-slate-100 dark:bg-slate-700">
            <X className="w-5 h-5 text-slate-700 dark:text-slate-200" aria-hidden="true" />
          </button>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-300">Move the map until the pin is on the place you are going.</p>
        {start ? (
          <LocationPicker
            location={point ?? start.point}
            onLocationSelect={(lat, lng) => setPoint(readPoint({ lat, lng }))}
            startsFarOut={start.guessed}
          />
        ) : (
          <div className="h-72 rounded-lg bg-slate-100 dark:bg-slate-800" />
        )}
        <button
          type="button"
          disabled={!point}
          onClick={() => point && onDone(point)}
          className="w-full py-3.5 rounded-2xl font-bold bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50"
        >
          Use this spot
        </button>
      </div>
    </div>
  );
}
