'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Check, Loader2, MapPin, MapPinOff, MessageCircle, Phone, Share2, Users } from 'lucide-react';
import { Trip, TripStatus } from '@/lib/types';
import { describeLocationStatus, describeTimeLeft, formatClock, joinNames } from '@/lib/tripPlanning';

interface ActiveTripCardProps {
  trip: Trip;
  /** Names of the contacts who are told about this trip */
  watcherNames: string[];
  /** The trip has changes the server has not received, so nobody is watching it yet */
  unsynced: boolean;
  processing: boolean;
  onArrive: () => void;
  onExtend: (minutes: number) => void;
  onShare: () => void;
  onWhatsApp: () => void;
  onTextOkay: () => void;
  onSOS: () => void;
}

const EXTEND_OPTIONS = [
  { minutes: 15, label: '+15 min' },
  { minutes: 30, label: '+30 min' },
  { minutes: 60, label: '+1 hr' },
];

const TONES = {
  active: {
    card: 'bg-emerald-50 border-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800',
    pill: 'bg-emerald-200 text-emerald-900',
    label: 'On trip',
  },
  endingSoon: {
    card: 'bg-amber-50 border-amber-300 dark:bg-amber-950/40 dark:border-amber-800',
    pill: 'bg-amber-200 text-amber-900',
    label: 'Arriving soon',
  },
  overdue: {
    card: 'bg-red-50 border-red-300 dark:bg-red-950/40 dark:border-red-800',
    pill: 'bg-red-200 text-red-900',
    label: 'Overdue',
  },
  emergency: {
    card: 'bg-red-50 border-red-400 dark:bg-red-950/40 dark:border-red-700',
    pill: 'bg-red-600 text-white',
    label: 'SOS sent',
  },
} as const;

const secondaryButton =
  'flex-1 py-2.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-600 ' +
  'rounded-xl text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 ' +
  'flex items-center justify-center gap-2';

/**
 * The trip in progress: how long is left, who is watching, and the few
 * things the traveller may need to do on the road.
 */
export function ActiveTripCard({
  trip,
  watcherNames,
  unsynced,
  processing,
  onArrive,
  onExtend,
  onShare,
  onWhatsApp,
  onTextOkay,
  onSOS,
}: ActiveTripCardProps) {
  const [nowMs, setNowMs] = useState(() => Date.now());

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

  let watchersText = 'No one is set to be told about this trip';
  if (watcherNames.length > 0) {
    watchersText = isEmergency
      ? `${joinNames(watcherNames)} ${watcherNames.length === 1 ? 'has' : 'have'} been alerted`
      : `${joinNames(watcherNames)} will be told if you don't arrive`;
  }

  return (
    <section aria-labelledby="active-trip-heading" className={`rounded-3xl border-2 p-5 ${tone.card}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-slate-600 dark:text-slate-300">Trip to</p>
          <h1 id="active-trip-heading" className="text-xl font-bold text-slate-900 dark:text-white truncate">
            {trip.destination || 'your destination'}
          </h1>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${tone.pill}`}>{tone.label}</span>
      </div>

      <div className="mt-4" aria-live="polite">
        {timeLeft && endsAtMs != null ? (
          <>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{timeLeft.text}</p>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
              Expected arrival {formatClock(endsAtMs, nowMs)}
            </p>
          </>
        ) : (
          <p className="text-lg font-semibold text-slate-900 dark:text-white">No arrival time set</p>
        )}
      </div>

      <ul className="mt-4 space-y-2 text-sm text-slate-700 dark:text-slate-200">
        <li className="flex items-start gap-2">
          <Users className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
          <span>{watchersText}</span>
        </li>
        <li className={`flex items-start gap-2 ${location.state === 'fresh' ? '' : 'text-amber-800 dark:text-amber-300 font-medium'}`}>
          <LocationIcon className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
          <span>{location.text}</span>
        </li>
      </ul>

      {unsynced && (
        <div role="alert" className="mt-4 bg-amber-100 border border-amber-400 rounded-xl p-3 text-sm text-amber-900">
          <span className="font-semibold">Waiting for a connection.</span> Your latest changes have not been sent,
          so this trip may not be watched and your contacts may not be alerted. Keep the app open until this
          message goes away.
        </div>
      )}

      {isEmergency && (
        <div role="status" className="mt-4 bg-red-100 border border-red-300 rounded-xl p-3 text-sm text-red-900">
          SOS sent. Your contacts were alerted and can follow this trip. End the trip when you are safe.
        </div>
      )}

      {!isEmergency && timeLeft?.state === 'overdue' && (
        <div role="status" className="mt-4 bg-red-100 border border-red-300 rounded-xl p-3 text-sm text-red-900">
          {trip.overdueAt
            ? 'Your contacts have been told you are overdue. Add time or end the trip to let them know you are okay.'
            : 'Your arrival time has passed. Add time or end the trip, or your contacts will be alerted.'}
        </div>
      )}

      <button
        type="button"
        onClick={onArrive}
        disabled={processing}
        className="mt-5 w-full py-4 bg-emerald-600 text-white rounded-xl font-bold text-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
        {isEmergency ? "I'm safe now, end trip" : "I've arrived"}
      </button>

      {endsAtMs != null && !isEmergency && (
        <div className="mt-3">
          <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">Running late? Add time</p>
          <div className="flex gap-2">
            {EXTEND_OPTIONS.map((option) => (
              <button
                key={option.minutes}
                type="button"
                onClick={() => onExtend(option.minutes)}
                disabled={processing}
                className={secondaryButton}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-3">
        <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">Keep your people posted</p>
        <div className="flex gap-2">
          <button type="button" onClick={onWhatsApp} className={secondaryButton}>
            <MessageCircle className="w-4 h-4" aria-hidden="true" />
            WhatsApp
          </button>
          <button type="button" onClick={onShare} className={secondaryButton}>
            <Share2 className="w-4 h-4" aria-hidden="true" />
            Share link
          </button>
        </div>
        <button
          type="button"
          onClick={onTextOkay}
          disabled={processing || watcherNames.length === 0}
          className={`${secondaryButton} w-full mt-2`}
        >
          <Check className="w-4 h-4" aria-hidden="true" />
          Text them &quot;I&apos;m okay&quot;
        </button>
      </div>

      <button
        type="button"
        onClick={onSOS}
        className="mt-4 w-full py-3.5 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
      >
        {isEmergency ? <Phone className="w-5 h-5" aria-hidden="true" /> : <AlertTriangle className="w-5 h-5" aria-hidden="true" />}
        Emergency SOS
      </button>
    </section>
  );
}
