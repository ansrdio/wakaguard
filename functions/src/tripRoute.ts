/**
 * The planned route of a trip with directions on (build 25, Beta), as the app
 * stores it on the trip: Mapbox's simplified outline with its length and time.
 * onTripUpdated (tripMonitor.ts) copies it to the page contacts open while the
 * trip runs, and deletes it from both when the trip ends.
 *
 * The app writes it into the traveller's own trip, which anyone signed in as
 * them can change, so nothing about it is trusted before it is copied to a
 * public document. The app's own check is isOverview in src/lib/directions.ts.
 */

export interface StoredRoute {
  overview: string;
  distanceM: number;
  durationS: number;
  profile: 'driving-traffic' | 'walking';
}

/** A Lagos to Abuja outline is a few thousand characters */
export const MAX_OVERVIEW_LENGTH = 20000;
const MAX_DISTANCE_M = 3_000_000;
const MAX_DURATION_S = 3 * 24 * 3600;

const isNumberUpTo = (v: unknown, max: number): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= max;

/** The route if it is well formed, else null */
export function readStoredRoute(raw: unknown): StoredRoute | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const { overview, distanceM, durationS, profile } = r;
  if (Object.keys(r).some((key) => !['overview', 'distanceM', 'durationS', 'profile'].includes(key))) return null;
  if (typeof overview !== 'string' || overview.length === 0 || overview.length > MAX_OVERVIEW_LENGTH) return null;
  // Mapbox's encoded polylines only use the characters from ? to ~
  if (!/^[\x3f-\x7e]+$/.test(overview)) return null;
  if (!isNumberUpTo(distanceM, MAX_DISTANCE_M) || !isNumberUpTo(durationS, MAX_DURATION_S)) return null;
  if (profile !== 'driving-traffic' && profile !== 'walking') return null;
  return { overview, distanceM: Math.round(distanceM), durationS: Math.round(durationS), profile };
}

export function sameRoute(a: StoredRoute | null, b: StoredRoute | null): boolean {
  return (a?.overview ?? null) === (b?.overview ?? null);
}
