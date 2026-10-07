'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { AlertTriangle, Clock, Loader2, MapPin, Navigation, Phone } from 'lucide-react';
import { TripStatus } from '@/lib/types';
import { isTripExpired } from '@/lib/safety';
import { formatClock } from '@/lib/tripPlanning';
import { readTripPath, tripTitle } from '@/lib/tripPath';
import { useSharedTrip } from '@/hooks/useSharedTrip';

// Leaflet needs the browser, so the map is left out of the prerendered page
const TripMap = dynamic(() => import('@/components/trip/TripMap'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-slate-100">
      <Loader2 className="w-6 h-6 text-brand-600 animate-spin" />
    </div>
  ),
});

/** After this long without an update, say so plainly instead of implying live tracking */
const STALE_AFTER_MS = 10 * 60 * 1000;

function agoText(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes === 1) return '1 minute ago';
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours} hour${hours > 1 ? 's' : ''} ago`;
}

function Shell({ children, pill }: { children: React.ReactNode; pill?: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Image src="/icons/icon-48x48.png" alt="" width={28} height={28} className="rounded-lg" />
            <span className="text-lg font-bold text-slate-900">WakaGuard</span>
          </div>
          {pill}
        </div>
      </header>
      {children}
    </div>
  );
}

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Shell>
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <MapPin className="w-8 h-8 text-slate-500" aria-hidden="true" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">{title}</h1>
          <p className="text-sm text-slate-600">{children}</p>
        </div>
      </main>
    </Shell>
  );
}

/**
 * What a contact sees when they open a trip link: where the traveller's phone
 * has been, where it last reported, and whether they are overdue.
 */
function SharedTripContent() {
  const token = useSearchParams().get('token') || '';
  const { shared: trip, loading, failed } = useSharedTrip(token || null);

  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNowMs(Date.now()), 10000);
    return () => clearInterval(interval);
  }, []);

  if (!token) {
    return <Notice title="This link is incomplete">Ask the person who sent it to share the trip link again.</Notice>;
  }

  if (loading) {
    return (
      <Shell>
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-10 h-10 text-brand-600 animate-spin" aria-label="Loading the trip" />
        </main>
      </Shell>
    );
  }

  const isOpen = trip && (trip.status === TripStatus.ACTIVE || trip.status === TripStatus.EMERGENCY);
  if (failed || !trip || !isOpen || isTripExpired(trip.expiresAt)) {
    return (
      <Notice title="This trip is no longer shared">
        The trip has ended or the link has expired. If you were told someone is overdue and have not heard from
        them, try calling them.
      </Notice>
    );
  }

  const who = trip.name?.trim() || '';
  const isEmergency = trip.status === TripStatus.EMERGENCY;

  // The server sets overdueAt once contacts are alerted; before that, a passed
  // endsAt means the traveller is late but still inside the grace period.
  const endsAtMs = trip.endsAt?.toMillis() ?? null;
  const isOverdue = !isEmergency && (!!trip.overdueAt || (endsAtMs !== null && nowMs > endsAtMs));
  const lastUpdateMs = trip.lastUpdate?.toMillis() ?? null;
  const latest = trip.lastLocation ?? null;
  // Updates normally arrive at least every 2 minutes while the phone has signal
  const isStale = !!latest && lastUpdateMs !== null && nowMs - lastUpdateMs > STALE_AFTER_MS;
  const path = readTripPath(trip.path);
  const mapsUrl = latest ? `https://maps.google.com/?q=${latest.lat},${latest.lng}` : null;

  const pill = isEmergency
    ? { className: 'bg-red-600 text-white', label: 'SOS sent' }
    : isOverdue
      ? { className: 'bg-red-100 text-red-800', label: 'Overdue' }
      : isStale
        ? { className: 'bg-amber-100 text-amber-900', label: 'No recent updates' }
        : { className: 'bg-brand-100 text-brand-800', label: 'On trip' };

  return (
    <Shell pill={<span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${pill.className}`}>{pill.label}</span>}>
      {isEmergency && (
        <div role="alert" className="bg-red-600 text-white">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" aria-hidden="true" />
            <span className="font-semibold">
              {who || 'This person'} has sent an SOS. Call them, and call 112 if you cannot reach them.
            </span>
          </div>
        </div>
      )}

      {isOverdue && (
        <div role="alert" className="bg-red-600 text-white">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" aria-hidden="true" />
            <span className="font-semibold">
              {who || 'This person'} has not checked in
              {endsAtMs !== null ? `. They expected to arrive by ${formatClock(endsAtMs, nowMs)}` : ''}. Try calling them.
            </span>
          </div>
        </div>
      )}

      <main className="flex-1 w-full max-w-5xl mx-auto lg:grid lg:grid-cols-5 lg:gap-4 lg:p-4">
        <section
          aria-label="Map of the trip"
          className="h-[46vh] min-h-[280px] lg:h-[calc(100vh-7rem)] lg:col-span-3 lg:rounded-3xl lg:border lg:border-slate-200 overflow-hidden bg-slate-100"
        >
          {latest ? (
            <TripMap path={path} latest={latest} stale={isStale} />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-6">
              <MapPin className="w-10 h-10 text-slate-400 mb-3" aria-hidden="true" />
              <p className="font-semibold text-slate-800">No location yet</p>
              <p className="text-sm text-slate-600 mt-1">
                {who ? `${who}'s` : 'Their'} phone has not sent a position. It appears here when it does.
              </p>
            </div>
          )}
        </section>

        <section className="p-4 lg:p-0 lg:col-span-2 space-y-4">
          <h1 className="text-2xl font-bold text-slate-900">{tripTitle(who, trip.destination)}</h1>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm divide-y divide-slate-100">
            <div className="p-4 flex items-start gap-3">
              <MapPin className={`w-5 h-5 mt-0.5 flex-shrink-0 ${isStale ? 'text-amber-600' : 'text-brand-600'}`} aria-hidden="true" />
              <div>
                <p className="text-sm text-slate-500">Last location received</p>
                <p className="text-lg font-bold text-slate-900">
                  {latest && lastUpdateMs !== null ? agoText(nowMs - lastUpdateMs) : 'None yet'}
                  {latest && lastUpdateMs !== null && isStale ? ` (${formatClock(lastUpdateMs, nowMs)})` : ''}
                </p>
                {isStale && (
                  <p className="text-sm text-amber-800 mt-1">
                    Their phone may be off, out of coverage, or the app may be closed. The map shows where they were,
                    not where they are now.
                  </p>
                )}
              </div>
            </div>

            {endsAtMs !== null && (
              <div className="p-4 flex items-start gap-3">
                <Clock className={`w-5 h-5 mt-0.5 flex-shrink-0 ${isOverdue ? 'text-red-600' : 'text-slate-400'}`} aria-hidden="true" />
                <div>
                  <p className="text-sm text-slate-500">Expected arrival</p>
                  <p className={`text-lg font-bold ${isOverdue ? 'text-red-700' : 'text-slate-900'}`}>
                    {formatClock(endsAtMs, nowMs)}
                  </p>
                </div>
              </div>
            )}
          </div>

          {(mapsUrl || isOverdue || isEmergency) && (
            <div className="flex gap-3">
              {mapsUrl && (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-3.5 bg-brand-600 text-white rounded-2xl font-bold hover:bg-brand-700 flex items-center justify-center gap-2"
                >
                  <Navigation className="w-5 h-5" aria-hidden="true" />
                  Open in Google Maps
                </a>
              )}
              {(isOverdue || isEmergency) && (
                <a
                  href="tel:112"
                  className="flex-1 py-3.5 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 flex items-center justify-center gap-2"
                >
                  <Phone className="w-5 h-5" aria-hidden="true" />
                  Call 112
                </a>
              )}
            </div>
          )}

          <p className="text-sm text-slate-600">
            {who || 'Someone'} shared this trip with you using WakaGuard. The line shows where their phone has been
            and the dot where it last reported. It updates while their phone has signal.
          </p>
          <p className="text-xs text-slate-500">This link stops working when the trip ends.</p>
        </section>
      </main>
    </Shell>
  );
}

// Wrap in Suspense for useSearchParams
export default function SharedTripPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <Loader2 className="w-10 h-10 text-brand-600 animate-spin" />
        </div>
      }
    >
      <SharedTripContent />
    </Suspense>
  );
}
