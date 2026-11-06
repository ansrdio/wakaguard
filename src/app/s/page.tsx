'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import type { TripMapProps } from '@/components/trip/TripMap';
import { USES_GOOGLE_MAPS } from '@/lib/googleMaps';
import Image from 'next/image';
import { AlertTriangle, Clock, Loader2, MapPin, Navigation, Phone, ShieldCheck } from 'lucide-react';
import { TripStatus } from '@/lib/types';
import { isTripExpired } from '@/lib/safety';
import { formatClock } from '@/lib/tripPlanning';
import { readTripPath, tripTitle } from '@/lib/tripPath';
import { isTravelMode, travelModeLabel } from '@/lib/travelMode';
import { TravelPicture } from '@/components/pictures/Pictures';
import { useSharedTrip } from '@/hooks/useSharedTrip';
import { StopTexts } from '@/components/trip/StopTexts';
import { storedVehicle, vehicleSummary } from '@/lib/vehicle';
import { readPoint } from '@/lib/destinationPoint';
import { readRouteOutline } from '@/lib/directions';
import { inviterFromTrip } from '@/lib/referrals';

// Leaflet needs the browser, so the map is left out of the prerendered page
// Google's map when the key is set (build 27), else the old one for tests against the emulators
const TripMap = dynamic<TripMapProps>(() => (USES_GOOGLE_MAPS ? import('@/components/trip/GoogleTripMap') : import('@/components/trip/TripMap')), {
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

function Notice({ title, children, after }: { title: string; children: React.ReactNode; after?: React.ReactNode }) {
  return (
    <Shell>
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <MapPin className="w-8 h-8 text-slate-500" aria-hidden="true" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">{title}</h1>
          <p className="text-sm text-slate-600">{children}</p>
          {after && <div className="mt-6 text-left">{after}</div>}
        </div>
      </main>
    </Shell>
  );
}

/**
 * After a trip ends with "I've arrived", the contact can get the app and is
 * counted as invited by the traveller (Invite friends, build 27). An ended
 * trip cannot be read from here, so the server says whether it ended that
 * way; it shows nothing while someone is late, after an SOS or for a test.
 */
function GetWakaGuard({ token, who }: { token: string; who: string }) {
  const [arrived, setArrived] = useState(false);
  useEffect(() => {
    inviterFromTrip(token).then((name) => setArrived(!!name)).catch(() => setArrived(false));
  }, [token]);
  if (!arrived) return null;
  return (
    <div className="rounded-2xl bg-brand-50 p-4 mb-4 text-center">
      <p className="font-semibold text-slate-900">Want the same for your own trips?</p>
      <p className="text-sm text-slate-700 mt-1">
        {who || 'They'} used WakaGuard, so the people they chose would be told if they didn&rsquo;t arrive. It&rsquo;s free.
      </p>
      <a
        href={`/join?trip=${encodeURIComponent(token)}`}
        className="mt-3 inline-flex min-h-12 px-6 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-semibold items-center justify-center"
      >
        Get WakaGuard
      </a>
    </div>
  );
}

/**
 * What a contact sees when they open a trip link: where the traveller's phone
 * has been, where it last reported, and whether they are overdue.
 */
function SharedTripContent() {
  // Links in texts use t. Older links use token, and a text network has been
  // seen rewriting "token" to "code" on the way, so all three are read
  const params = useSearchParams();
  const token = params.get('t') || params.get('token') || params.get('code') || '';
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
      <Notice
        title="This trip is no longer shared"
        after={(
          <>
            <GetWakaGuard token={token} who={trip?.name?.trim() || ''} />
            <StopTexts token={token} who={trip?.name?.trim() || ''} />
          </>
        )}
      >
        The trip has ended or the link has expired. If you were told someone is overdue and have not heard from
        them, try calling them.
      </Notice>
    );
  }

  const who = trip.name?.trim() || '';
  const vehicle = storedVehicle(trip.vehicle);
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
  // The route the app planned, when the traveller has directions (Beta) on
  const route = readRouteOutline(trip.route);
  // Checkpoint stops (build 27), added by the server when the traveller logs one
  const stops = (trip.checkpoints ?? [])
    .filter((stop) => typeof stop?.atMs === 'number')
    .map((stop) => ({ ...stop, label: `Stopped at a checkpoint, ${formatClock(stop.atMs, nowMs)}` }));
  const stopPins = stops.flatMap((stop) =>
    typeof stop.lat === 'number' && typeof stop.lng === 'number' ? [{ lat: stop.lat, lng: stop.lng, label: stop.label }] : []);
  const mapsUrl = latest ? `https://maps.google.com/?q=${latest.lat},${latest.lng}` : null;
  // Nobody should be sent to the emergency line by a test
  const callFor112 = (isOverdue || isEmergency) && !trip.isTest;

  const pill = trip.isTest
    ? { className: 'bg-slate-200 text-slate-900', label: 'Test' }
    : isEmergency
    ? { className: 'bg-red-600 text-white', label: 'SOS sent' }
    : isOverdue
      ? { className: 'bg-red-100 text-red-800', label: 'Overdue' }
      : isStale
        ? { className: 'bg-slate-100 text-slate-900', label: 'No recent updates' }
        : { className: 'bg-brand-100 text-brand-800', label: 'On trip' };

  return (
    <Shell pill={<span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${pill.className}`}>{pill.label}</span>}>
      {trip.isTest && (
        <div role="status" className="bg-slate-200 text-slate-900">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" aria-hidden="true" />
            <span className="font-semibold">
              {isEmergency
                ? `TEST ALERT. ${who || 'This person'} pressed SOS to try it out. This is not a real emergency. Do not call 112.`
                : isOverdue
                  ? `TEST ALERT. ${who || 'This person'} let a test trip run past its arrival time. This is not a real emergency.`
                  : `TEST. ${who || 'This person'} is trying out WakaGuard. This is not a real trip.`}
            </span>
          </div>
        </div>
      )}

      {isEmergency && !trip.isTest && (
        <div role="alert" className="bg-red-600 text-white">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" aria-hidden="true" />
            <span className="font-semibold">
              {who || 'This person'} has sent an SOS. Call them, and call 112 if you cannot reach them.
            </span>
          </div>
        </div>
      )}

      {isOverdue && !trip.isTest && (
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
            <TripMap path={path} latest={latest} stale={isStale} destination={readPoint(trip.destinationPoint)} route={route} stops={stopPins} />
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
              <MapPin className={`w-5 h-5 mt-0.5 flex-shrink-0 ${isStale ? 'text-slate-700' : 'text-brand-600'}`} aria-hidden="true" />
              <div>
                <p className="text-sm text-slate-500">Last location received</p>
                <p className="text-lg font-bold text-slate-900">
                  {latest && lastUpdateMs !== null ? agoText(nowMs - lastUpdateMs) : 'None yet'}
                  {latest && lastUpdateMs !== null && isStale ? ` (${formatClock(lastUpdateMs, nowMs)})` : ''}
                </p>
                {isStale && (
                  <p className="text-sm text-slate-900 mt-1">
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

            {route && (
              <div className="p-4 flex items-start gap-3">
                <Navigation className="w-5 h-5 mt-0.5 flex-shrink-0 text-slate-400" aria-hidden="true" />
                <div>
                  <p className="text-sm text-slate-500 flex items-center gap-1.5">
                    Planned route
                    <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-[11px] font-semibold text-slate-600">Beta</span>
                  </p>
                  <p className="text-sm text-slate-700">The grey dotted line on the map. They may go another way.</p>
                </div>
              </div>
            )}

            {/* Only there once contacts have been alerted, and only if the traveller said */}
            {isTravelMode(trip.travelMode) && (
              <div className="p-4 flex items-center gap-3">
                <TravelPicture mode={trip.travelMode} size={32} />
                <div>
                  <p className="text-sm text-slate-500">Travelling by</p>
                  <p className="text-lg font-bold text-slate-900">{travelModeLabel(trip.travelMode)}</p>
                </div>
              </div>
            )}
            {vehicle && (
              <div className="p-4">
                <p className="text-sm text-slate-500">Vehicle</p>
                <p className="text-lg font-bold text-slate-900 break-words">{vehicleSummary(vehicle)}</p>
              </div>
            )}
            {stops.length > 0 && (
              <div className="p-4 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 mt-0.5 flex-shrink-0 text-slate-500" aria-hidden="true" />
                <div>
                  <p className="text-sm text-slate-500">Checkpoints</p>
                  <ul className="text-base font-semibold text-slate-900 space-y-0.5">
                    {stops.map((stop) => <li key={stop.atMs}>{stop.label}</li>)}
                  </ul>
                  {stopPins.length > 0 && <p className="text-sm text-slate-500 mt-1">The dark dots on the map.</p>}
                </div>
              </div>
            )}
          </div>

          {(mapsUrl || callFor112) && (
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
              {callFor112 && (
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
          <StopTexts token={token} who={who} />
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
