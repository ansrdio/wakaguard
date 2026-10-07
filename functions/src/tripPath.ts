/**
 * The path a traveller has covered during a Safe Trip
 *
 * Kept on the public sharedTrips document as a short list of points, so the
 * contact's page and the traveller's own trip map can draw where the trip has
 * been, not only where it is now. Pure functions with no Firebase access, so
 * they can be unit tested directly.
 */

export interface PathPoint {
  lat: number;
  lng: number;
  /** When the phone was there, in milliseconds since 1970 */
  at: number;
}

/** A long trip is thinned to stay under this, which keeps the document small */
export const MAX_PATH_POINTS = 240;

/** Smaller movements are GPS jitter while standing still, not travel */
export const MIN_PATH_MOVE_M = 40;

const EARTH_RADIUS_M = 6371000;

export function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

function isPoint(p: unknown): p is PathPoint {
  if (!p || typeof p !== 'object') return false;
  const { lat, lng, at } = p as Record<string, unknown>;
  return typeof lat === 'number' && Number.isFinite(lat) && lat >= -90 && lat <= 90
    && typeof lng === 'number' && Number.isFinite(lng) && lng >= -180 && lng <= 180
    && typeof at === 'number' && Number.isFinite(at);
}

/** The stored path with anything malformed dropped, oldest point first. */
export function readPath(raw: unknown): PathPoint[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(isPoint)
    .map(({ lat, lng, at }) => ({ lat, lng, at }))
    .sort((a, b) => a.at - b.at);
}

/**
 * Halve the detail of the older half of a path. The start and the recent part
 * are what a reader looks at; the middle of a long journey can be coarser.
 */
function thin(path: PathPoint[]): PathPoint[] {
  const half = Math.floor(path.length / 2);
  const older = path.slice(0, half).filter((_, index) => index % 2 === 0);
  return [...older, ...path.slice(half)];
}

/**
 * Add a position to a path.
 *
 * @returns the new path, or null when nothing should change: the position is
 *   not newer than the last one (a repeated or late event), or the traveller
 *   has not really moved
 */
export function addPathPoint(path: PathPoint[], point: PathPoint): PathPoint[] | null {
  if (!isPoint(point)) return null;
  if (path.length === 0) return [point];

  const last = path[path.length - 1];
  if (point.at <= last.at) return null;
  if (distanceMeters(last, point) < MIN_PATH_MOVE_M) return null;

  const next = [...path, point];
  return next.length > MAX_PATH_POINTS ? thin(next) : next;
}
