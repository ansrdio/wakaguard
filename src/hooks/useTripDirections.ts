'use client';

import { useEffect, useRef, useState } from 'react';
import { guide, Guidance, LatLng, OFF_ROUTE_FIXES, Route, routeProfile } from '@/lib/directions';
import { fetchRoute, forgetTripRoute, keepTripRoute, keptTripRoute } from '@/lib/directionsFetch';
import { whereThePhoneIs } from '@/lib/reportDistance';

export type TripDirections =
  | { state: 'off' }
  | { state: 'finding' }
  | { state: 'none' }
  | { state: 'ready'; route: Route; guidance: Guidance | null; rerouting: boolean };

/** A new route is asked for at most this often when the traveller keeps leaving it */
const REROUTE_GAP_MS = 30000;

/**
 * Directions during a trip (Beta, build 25): the route found on the start form,
 * or a new one from here if the app was reopened, and where the phone is along
 * it. The position is watched closely only while the screen is on; the trip's
 * own location sharing (useTripLocationSync) is separate and carries on as before.
 */
export function useTripDirections({ tripId, destination, travelMode, enabled }: {
  tripId: string | null;
  destination: LatLng | null;
  travelMode: string | null;
  enabled: boolean;
}): TripDirections {
  const [route, setRoute] = useState<{ tripId: string; route: Route } | null>(null);
  const [finding, setFinding] = useState<'idle' | 'finding' | 'none'>('idle');
  const [guidance, setGuidance] = useState<Guidance | null>(null);
  const [rerouting, setRerouting] = useState(false);
  const offCount = useRef(0);
  const lastRerouteMs = useRef(0);
  const active = enabled && !!tripId && !!destination;

  // A trip that ended takes its kept route with it
  const previousTrip = useRef<string | null>(null);
  useEffect(() => {
    if (previousTrip.current && previousTrip.current !== tripId) {
      forgetTripRoute();
      setGuidance(null);
    }
    previousTrip.current = tripId;
  }, [tripId]);

  // The route: the one kept on the phone, else a new one from where the phone is
  useEffect(() => {
    if (!active || !tripId || !destination) return;
    if (route?.tripId === tripId) return;
    const kept = keptTripRoute(tripId);
    if (kept) {
      setRoute({ tripId, route: kept });
      return;
    }
    let live = true;
    setFinding('finding');
    void (async () => {
      const from = await whereThePhoneIs();
      const found = from ? await fetchRoute(from, destination, routeProfile(travelMode)) : null;
      if (!live) return;
      if (found) {
        keepTripRoute(tripId, found);
        setRoute({ tripId, route: found });
        setFinding('idle');
      } else {
        setFinding('none');
      }
    })();
    return () => { live = false; };
    // Asked once per trip; the destination and the way of travelling are fixed when it starts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, tripId]);

  const current = active && route?.tripId === tripId ? route.route : null;

  // Where the phone is along the route, while the screen is on
  useEffect(() => {
    if (!current || !tripId || typeof navigator === 'undefined' || !navigator.geolocation) return;
    let watchId: number | null = null;

    const onFix = (pos: GeolocationPosition) => {
      const here = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      const g = guide(current, here);
      setGuidance(g);
      offCount.current = g.offRoute ? offCount.current + 1 : 0;
      if (offCount.current >= OFF_ROUTE_FIXES && !g.arrived && Date.now() - lastRerouteMs.current > REROUTE_GAP_MS && destination) {
        lastRerouteMs.current = Date.now();
        offCount.current = 0;
        setRerouting(true);
        void fetchRoute(here, destination, current.profile).then((fresh) => {
          setRerouting(false);
          if (!fresh) return;
          keepTripRoute(tripId, fresh);
          setRoute({ tripId, route: fresh });
        });
      }
    };

    const start = () => {
      if (watchId !== null || document.visibilityState !== 'visible') return;
      watchId = navigator.geolocation.watchPosition(onFix, () => undefined, {
        enableHighAccuracy: true,
        maximumAge: 3000,
        timeout: 20000,
      });
    };
    const stop = () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      watchId = null;
    };
    const onVisibility = () => (document.visibilityState === 'visible' ? start() : stop());

    start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      stop();
    };
    // destination is fixed for the trip
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, tripId]);

  if (!active) return { state: 'off' };
  if (current) return { state: 'ready', route: current, guidance, rerouting };
  return finding === 'none' ? { state: 'none' } : { state: 'finding' };
}
