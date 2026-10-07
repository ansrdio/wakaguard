/**
 * @fileoverview Reading a trip's path for display
 *
 * The path comes from a public document, so nothing about its shape is
 * trusted: anything malformed is dropped before it reaches the map.
 * The server's copy of these checks is functions/src/tripPath.ts.
 *
 * @module tripPath
 */

import { TripPathPoint } from '@/lib/types';

function isPoint(p: unknown): p is TripPathPoint {
  if (!p || typeof p !== 'object') return false;
  const { lat, lng, at } = p as Record<string, unknown>;
  return typeof lat === 'number' && Number.isFinite(lat) && lat >= -90 && lat <= 90
    && typeof lng === 'number' && Number.isFinite(lng) && lng >= -180 && lng <= 180
    && typeof at === 'number' && Number.isFinite(at);
}

/** The stored path with anything malformed dropped, oldest point first. */
export function readTripPath(raw: unknown): TripPathPoint[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(isPoint)
    .map(({ lat, lng, at }) => ({ lat, lng, at }))
    .sort((a, b) => a.at - b.at);
}

/**
 * The line to draw: the recorded path, ending at the latest position.
 * The latest position can be ahead of the path, because the path skips small
 * movements and is written a moment after the position itself.
 */
export function pathToDraw(
  path: TripPathPoint[],
  latest: { lat: number; lng: number } | null
): [number, number][] {
  const line: [number, number][] = path.map((p) => [p.lat, p.lng]);
  if (!latest) return line;
  const end = line[line.length - 1];
  if (!end || end[0] !== latest.lat || end[1] !== latest.lng) line.push([latest.lat, latest.lng]);
  return line;
}

/** "Ada's trip to Ikeja", with whatever is missing left out. */
export function tripTitle(name: string | null | undefined, destination: string | null | undefined): string {
  const who = name?.trim();
  const where = destination?.trim();
  if (who && where) return `${who}'s trip to ${where}`;
  if (who) return `${who}'s trip`;
  if (where) return `Trip to ${where}`;
  return 'Shared trip';
}
