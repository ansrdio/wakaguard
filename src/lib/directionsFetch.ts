/**
 * @fileoverview Asking Mapbox for a route (lib/directions.ts reads the answer)
 *
 * Sent from the phone with the same public Mapbox key as the map pictures, so
 * only the two ends of the trip go to Mapbox, and only when directions are on.
 * The latest route of a running trip is kept on the phone, so directions carry
 * on after the app is reopened without asking Mapbox again.
 *
 * @module directionsFetch
 */

import { directionsUrl, LatLng, parseRoute, Route, RouteProfile } from '@/lib/directions';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const TIMEOUT_MS = 12000;
const KEPT_KEY = 'wakaguard_trip_route';

/** False where there is no Mapbox key, so no directions can be asked for */
export function directionsAvailable(): boolean {
  return !!MAPBOX_TOKEN;
}

/** A route from one place to another, or null when there is none or Mapbox cannot be reached */
export async function fetchRoute(from: LatLng, to: LatLng, profile: RouteProfile): Promise<Route | null> {
  if (!MAPBOX_TOKEN) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(directionsUrl(from, to, profile, MAPBOX_TOKEN), { signal: controller.signal });
    if (!response.ok) return null;
    return parseRoute(await response.json(), profile, to);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Keeps a running trip's route on the phone */
export function keepTripRoute(tripId: string, route: Route): void {
  try {
    window.localStorage.setItem(KEPT_KEY, JSON.stringify({ tripId, route }));
  } catch {
    // Too big or no storage: it is fetched again after a restart
  }
}

/** The kept route, if it belongs to this trip */
export function keptTripRoute(tripId: string): Route | null {
  try {
    const kept = JSON.parse(window.localStorage.getItem(KEPT_KEY) ?? 'null');
    return kept && kept.tripId === tripId && kept.route ? (kept.route as Route) : null;
  } catch {
    return null;
  }
}

export function forgetTripRoute(): void {
  try {
    window.localStorage.removeItem(KEPT_KEY);
  } catch {
    // Nothing kept
  }
}
