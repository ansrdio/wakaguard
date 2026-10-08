'use client';

import { useEffect, useState } from 'react';
import { Check, ChevronRight, Clock, Loader2, Map as MapIcon, MapPin, MapPinOff, Navigation, Phone, Share2, ShieldCheck } from 'lucide-react';
import { Trip, TripStatus } from '@/lib/types';
import { describeLocationStatus, describeTimeLeft, formatClock, initialsOf, joinNames } from '@/lib/tripPlanning';
import { describeTripAlert, watcherCaption } from '@/lib/alertOutcome';

interface ActiveTripCardProps {
  trip: Trip;
  /** Names of the contacts who are told about this trip */
  watcherNames: string[];
  /** The trip has changes the server has not received, so nobody is watching it yet */
  unsynced: boolean;
  /** Another phone signed in to this account is the one sending this trip's location */
  locationFromElsewhere: boolean;
  processing: boolean;
  onArrive: () => void;
  onExtend: (minutes: number) => void;
  /** Send the trip's location from this phone instead of the other one */
  onSendFromHere: () => void;
  /** Open the trip on a map */
  onViewMap: () => void;
  onShare: () => void;
  onTextOkay: () => void;
  onSOS: () => void;
}

const EXTEND_OPTIONS = [
  { minutes: 15, label: '+15 min' },
  { minutes: 30, label: '+30 min' },
  { minutes: 60, label: '+1 hr' },
];

// A test trip lasts two minutes, so a quarter of an hour more would end the test
const TEST_EXTEND_OPTIONS = [
  { minutes: 2, label: '+2 min' },
  { minutes: 5, label: '+5 min' },
  { minutes: 15, label: '+15 min' },
];

const TONES = {
  active: {
    card: 'border-slate-200 dark:border-slate-700',
    pill: 'bg-brand-100 text-brand-800 dark:bg-brand-900 dark:text-brand-100',
    figure: 'text-brand-700 dark:text-brand-300',
    label: 'On trip',
  },
  endingSoon: {
    card: 'border-amber-300 dark:border-amber-700',
    pill: 'bg-amber-100 text-amber-900 dark:bg-amber-900 dark:text-amber-100',
    figure: 'text-amber-700 dark:text-amber-300',
    label: 'Arriving soon',
  },
  overdue: {
    card: 'border-red-300 dark:border-red-700',
    pill: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100',
    figure: 'text-red-700 dark:text-red-300',
    label: 'Overdue',
  },
  emergency: {
    card: 'border-red-400 dark:border-red-600',
    pill: 'bg-red-600 text-white',
    figure: 'text-red-700 dark:text-red-300',
    // The state of the trip, not a claim about the texts: the banner below says what was sent
    label: 'SOS active',
  },
} as const;

const quietButton =
  'py-3.5 rounded-2xl text-base font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ' +
  'bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-slate-800 dark:text-blue-300 dark:hover:bg-slate-700';

const divider = 'border-t border-slate-100 dark:border-slate-700';

/**
 * The trip in progress: when you are due, who is told if you don't arrive,
 * and the few things you may need to do on the road.
 */
export function ActiveTripCard({
  trip,
  watcherNames,
  unsynced,
  locationFromElsewhere,
  processing,
  onArrive,
  onExtend,
  onSendFromHere,
  onViewMap,
  onShare,
  onTextOkay,
  onSOS,
}: ActiveTripCardProps) {
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [addTimeOpen, setAddTimeOpen] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setNowMs(Date.now()), 5000);
    return () => clearInterval(interval);
  }, []);

  const endsAtMs = trip.endsAt?.toMillis() ?? null;
  const isEmergency = trip.status === TripStatus.EMERGENCY;
  const timeLeft = endsAtMs != null ? describeTimeLeft(endsAtMs, nowMs) : null;
  const tone = TONES[isEmergency ? 'emergency' : timeLeft?.state ?? 'active'];
  const location = describeLocationStatus(trip.lastUpdate?.toMillis() ?? null, !!trip.lastLocation, nowMs);
  const LocationIcon = location.state === 'fresh' ? MapPin : MapPinOff;
  const canExtend = endsAtMs != null && !isEmergency;
  // What the server recorded about texting this trip's contacts; the card says that and no more
  const alert = describeTripAlert(trip);

  return (
    <div className="space-y-3">
      <section
        aria-labelledby="active-trip-heading"
        className={`rounded-3xl bg-white dark:bg-slate-800 border shadow-sm ${tone.card}`}
      >
        {/* Where */}
        <div className="flex items-center gap-3 p-5">
          <span className="w-12 h-12 rounded-full bg-brand-600 text-white flex items-center justify-center flex-shrink-0" aria-hidden="true">
            <Navigation className="w-6 h-6" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-slate-500 dark:text-slate-400">Trip to</p>
            <h1 id="active-trip-heading" className="text-xl font-bold text-slate-900 dark:text-white truncate">
              {trip.destination || 'your destination'}
            </h1>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${tone.pill}`}>{tone.label}</span>
        </div>

        {trip.isTest && (
          <div className="mx-5 mb-4 bg-amber-100 border border-amber-300 rounded-xl p-3 text-sm text-amber-900">
            <span className="font-semibold">Test trip.</span> Every text about it begins &quot;WAKAGUARD TEST ALERT&quot;,
            and 112 is not called.
          </div>
        )}

        {/* When */}
        <div className={`${divider} px-5 py-4`} aria-live="polite">
          {timeLeft && endsAtMs != null ? (
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-slate-500 dark:text-slate-400">Expected arrival</dt>
                <dd className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">{formatClock(endsAtMs, nowMs)}</dd>
              </div>
              <div className="border-l border-slate-100 dark:border-slate-700 pl-4">
                <dt className="text-sm text-slate-500 dark:text-slate-400">{timeLeft.label}</dt>
                <dd className={`text-2xl font-bold mt-0.5 ${tone.figure}`}>{timeLeft.value}</dd>
              </div>
            </dl>
          ) : (
            <p className="text-lg font-semibold text-slate-900 dark:text-white">No arrival time set</p>
          )}
        </div>

        {/* Who is told */}
        <div className={`${divider} px-5 py-4 flex items-center gap-3`}>
          {watcherNames.length > 0 ? (
            <>
              <span className="flex -space-x-2 flex-shrink-0" aria-hidden="true">
                {watcherNames.slice(0, 3).map((name, index) => (
                  <span
                    key={`${name}-${index}`}
                    className="w-9 h-9 rounded-full bg-brand-100 text-brand-800 dark:bg-brand-900 dark:text-brand-100 ring-2 ring-white dark:ring-slate-800 flex items-center justify-center text-xs font-bold"
                  >
                    {initialsOf(name)}
                  </span>
                ))}
              </span>
              <p className="min-w-0 text-sm text-slate-600 dark:text-slate-300">
                <span className="block font-semibold text-slate-900 dark:text-white">{joinNames(watcherNames)}</span>
                {watcherCaption(alert, watcherNames.length)}
              </p>
            </>
          ) : (
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
              No one is set to be told about this trip
            </p>
          )}
        </div>

        {/* Location */}
        <div
          className={`${divider} px-5 py-4 flex items-start gap-3 text-sm ${
            location.state === 'fresh' ? 'text-slate-600 dark:text-slate-300' : 'text-amber-800 dark:text-amber-300 font-medium'
          }`}
        >
          <LocationIcon
            className={`w-5 h-5 flex-shrink-0 ${location.state === 'fresh' ? 'text-brand-600 dark:text-brand-300' : ''}`}
            aria-hidden="true"
          />
          <span>{location.text}</span>
        </div>

        {locationFromElsewhere && (
          <div className="px-5 pb-4">
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 text-sm text-amber-900">
              This trip was started on another phone, and its location is coming from that phone, not this one.
              <button
                type="button"
                onClick={onSendFromHere}
                disabled={processing}
                className="block mt-2 font-semibold underline disabled:opacity-50"
              >
                Send it from this phone instead
              </button>
            </div>
          </div>
        )}

        <div className="px-5 pb-5">
          <button
            type="button"
            onClick={onViewMap}
            className="w-full py-3 px-4 rounded-2xl text-base font-semibold transition-colors flex items-center gap-3 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-slate-900 dark:text-blue-300 dark:hover:bg-slate-700"
          >
            <MapIcon className="w-5 h-5" aria-hidden="true" />
            <span className="flex-1 text-left">View trip map</span>
            <ChevronRight className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {(unsynced || alert || timeLeft?.state === 'overdue') && (
          <div className="px-5 pb-5 space-y-3">
            {unsynced && (
              <div role="alert" className="bg-amber-100 border border-amber-400 rounded-xl p-3 text-sm text-amber-900">
                <span className="font-semibold">Waiting for a connection.</span> Your latest changes have not been sent,
                so this trip may not be watched and your contacts may not be alerted. Keep the app open until this
                message goes away.
              </div>
            )}

            {alert && (
              <div
                role="status"
                className={`rounded-xl p-3 text-sm border ${
                  alert.tone === 'problem'
                    ? 'bg-red-600 border-red-700 text-white font-medium'
                    : 'bg-red-100 border-red-300 text-red-900'
                }`}
              >
                {alert.text}
              </div>
            )}

            {!alert && timeLeft?.state === 'overdue' && (
              <div role="status" className="bg-red-100 border border-red-300 rounded-xl p-3 text-sm text-red-900">
                Your arrival time has passed. Add time or end the trip, or your contacts will be alerted.
              </div>
            )}
          </div>
        )}
      </section>

      <button
        type="button"
        onClick={onArrive}
        disabled={processing}
        className="w-full py-4 bg-brand-600 text-white rounded-2xl font-bold text-lg hover:bg-brand-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
        {isEmergency ? "I'm safe now, end trip" : "I've arrived"}
      </button>

      <div className={`grid gap-3 ${canExtend ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {canExtend && (
          <button
            type="button"
            onClick={() => setAddTimeOpen((open) => !open)}
            aria-expanded={addTimeOpen}
            disabled={processing}
            className={quietButton}
          >
            <Clock className="w-5 h-5" aria-hidden="true" />
            Add time
          </button>
        )}
        <button
          type="button"
          onClick={onTextOkay}
          disabled={processing || watcherNames.length === 0}
          aria-label="Text your contacts that you are okay"
          className={quietButton}
        >
          <ShieldCheck className="w-5 h-5" aria-hidden="true" />
          Text &quot;I&apos;m okay&quot;
        </button>
      </div>

      {canExtend && addTimeOpen && (
        <div className="grid grid-cols-3 gap-2" role="group" aria-label="Running late? Add time">
          {(trip.isTest ? TEST_EXTEND_OPTIONS : EXTEND_OPTIONS).map((option) => (
            <button
              key={option.minutes}
              type="button"
              onClick={() => {
                setAddTimeOpen(false);
                onExtend(option.minutes);
              }}
              disabled={processing}
              className="py-3 rounded-xl text-sm font-semibold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
            >
              {option.label}
            </button>
          ))}
        </div>
      )}

      <button type="button" onClick={onShare} className={`${quietButton} w-full`}>
        <Share2 className="w-5 h-5" aria-hidden="true" />
        Share link
      </button>

      <button
        type="button"
        onClick={onSOS}
        className="w-full py-4 bg-red-600 text-white rounded-2xl font-bold text-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
      >
        <Phone className="w-5 h-5" aria-hidden="true" />
        Emergency SOS
      </button>
    </div>
  );
}
