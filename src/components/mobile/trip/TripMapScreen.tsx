'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import dynamic from 'next/dynamic';
import { ArrowLeft, Check, Clock, Loader2, MapPin, MapPinOff, Users } from 'lucide-react';
import { Trip, TripStatus } from '@/lib/types';
import { TEST_TRIP_MINUTES, describeLocationStatus, describeTimeLeft, formatClock, joinNames } from '@/lib/tripPlanning';
import { readTripPath } from '@/lib/tripPath';
import { describeTripAlert, watcherCaption } from '@/lib/alertOutcome';
import { useSharedTrip } from '@/hooks/useSharedTrip';

// Leaflet needs the browser, so the map is left out of the prerendered page
const TripMap = dynamic(() => import('@/components/trip/TripMap'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-slate-100 dark:bg-slate-800">
      <Loader2 className="w-6 h-6 text-brand-600 animate-spin" />
    </div>
  ),
});

interface TripMapScreenProps {
  trip: Trip;
  /** Names of the contacts who are told about this trip */
  watcherNames: string[];
  processing: boolean;
  onClose: () => void;
  onArrive: () => void;
  onExtend: (minutes: number) => void;
}

const PILLS = {
  active: { className: 'bg-brand-100 text-brand-800', label: 'On trip' },
  endingSoon: { className: 'bg-amber-100 text-amber-900', label: 'Arriving soon' },
  overdue: { className: 'bg-red-100 text-red-800', label: 'Overdue' },
  emergency: { className: 'bg-red-600 text-white', label: 'SOS active' },
} as const;

/**
 * The traveller's own view of their trip on a map: where the phone has been
 * and where it last reported. It is the same picture a contact gets from the
 * trip link, which is the point: the traveller can see what is being shared.
 */
export function TripMapScreen({ trip, watcherNames, processing, onClose, onArrive, onExtend }: TripMapScreenProps) {
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNowMs(Date.now()), 5000);
    return () => clearInterval(interval);
  }, []);

  // The path lives on the share document, so read what a contact would read
  const { shared } = useSharedTrip(trip.id);
  const path = readTripPath(shared?.path);

  const endsAtMs = trip.endsAt?.toMillis() ?? null;
  const isEmergency = trip.status === TripStatus.EMERGENCY;
  const timeLeft = endsAtMs != null ? describeTimeLeft(endsAtMs, nowMs) : null;
  const pill = PILLS[isEmergency ? 'emergency' : timeLeft?.state ?? 'active'];
  const location = describeLocationStatus(trip.lastUpdate?.toMillis() ?? null, !!trip.lastLocation, nowMs);
  const LocationIcon = location.state === 'fresh' ? MapPin : MapPinOff;
  // A quarter of an hour more would end a two-minute test
  const extraMinutes = trip.isTest ? TEST_TRIP_MINUTES : 15;

  // Drawn at the top of the page, not inside the Trip screen: on iPhone a
  // scrolling area keeps everything in it underneath the app's own bars, which
  // hid this screen's back button and its buttons at the bottom.
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="trip-map-heading"
      className="fixed inset-0 z-[10000] flex flex-col bg-white dark:bg-slate-900"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <header className="flex items-center gap-2 px-2 h-14 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label="Back to the trip"
        >
          <ArrowLeft className="w-6 h-6 text-slate-900 dark:text-white" />
        </button>
        <h1 id="trip-map-heading" className="text-lg font-bold text-slate-900 dark:text-white">Trip map</h1>
      </header>

      <div className="relative flex-1 min-h-0">
        {/* The card below sits over the top of the map */}
        <TripMap path={path} latest={trip.lastLocation ?? null} stale={location.state === 'stale'} topInset={130} />

        <div className="absolute top-3 left-3 right-3 z-[1000] bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-start justify-between gap-3">
            <p className="text-lg font-bold text-slate-900 dark:text-white truncate">
              Trip to {trip.destination || 'your destination'}
            </p>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${pill.className}`}>{pill.label}</span>
          </div>
          {timeLeft && endsAtMs != null && (
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
              Expected arrival <span className="font-semibold text-slate-900 dark:text-white">{formatClock(endsAtMs, nowMs)}</span>
              {' '}· {timeLeft.text}
            </p>
          )}
          <p
            className={`flex items-start gap-1.5 text-sm mt-1 ${
              location.state === 'fresh' ? 'text-slate-600 dark:text-slate-300' : 'text-amber-800 dark:text-amber-300 font-medium'
            }`}
          >
            <LocationIcon className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
            {location.text}
          </p>
        </div>
      </div>

      <div
        className="flex-shrink-0 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 pt-4"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}
      >
        <div className="flex items-start gap-3 mb-4">
          <span className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-200 flex items-center justify-center flex-shrink-0">
            <Users className="w-5 h-5" aria-hidden="true" />
          </span>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            <span className="block font-semibold text-slate-900 dark:text-white">
              {watcherNames.length === 0
                ? 'No one is set to be told about this trip'
                : `${joinNames(watcherNames)} ${watcherCaption(describeTripAlert(trip), watcherNames.length)}`}
            </span>
            Anyone you send the trip link to sees this map.
          </p>
        </div>

        <div className={`grid gap-3 ${isEmergency || endsAtMs == null ? 'grid-cols-1' : 'grid-cols-2'}`}>
          <button
            type="button"
            onClick={onArrive}
            disabled={processing}
            className="py-3.5 bg-brand-600 text-white rounded-2xl font-bold hover:bg-brand-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" aria-hidden="true" />}
            {isEmergency ? "I'm safe now, end trip" : "I've arrived"}
          </button>
          {!isEmergency && endsAtMs != null && (
            <button
              type="button"
              onClick={() => onExtend(extraMinutes)}
              disabled={processing}
              className="py-3.5 rounded-2xl font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-slate-800 dark:text-blue-300 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Clock className="w-5 h-5" aria-hidden="true" />
              Add {extraMinutes} min
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
