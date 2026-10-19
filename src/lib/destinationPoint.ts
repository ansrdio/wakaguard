/**
 * @fileoverview "Set it on the map": where a trip is going, as a pin
 *
 * Typing the destination stays as it was. The pin is optional and is the
 * traveller's own choice, so it is never wrong the way a search suggestion
 * can be (Mapbox found almost no Nigerian landmarks when tried on 18 October
 * 2026, and the owner chose the pin). It is kept with the trip, drawn on the
 * trip map and on the page contacts open, and gives build 25's directions an
 * exact point. Setting it fills an empty box with the spot's street and
 * area from OpenStreetMap, through our server (lib/placeName.ts), until
 * NIPOST's new digital postcodes can name it.
 *
 * @module destinationPoint
 */

import { MAX_DESTINATION_LENGTH } from './tripPlanning';

export interface Point {
  lat: number;
  lng: number;
}

/** About a metre; nothing finer is meaningful for a pin moved by a thumb */
const DECIMALS = 5;

/** A point, checked and rounded, or null for anything that is not one */
export function readPoint(value: unknown): Point | null {
  const v = (value && typeof value === 'object' ? value : null) as Record<string, unknown> | null;
  const lat = v?.lat;
  const lng = v?.lng;
  if (typeof lat !== 'number' || typeof lng !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  const round = (n: number) => Math.round(n * 10 ** DECIMALS) / 10 ** DECIMALS;
  return { lat: round(lat), lng: round(lng) };
}

/** Shown under the box while it holds a name from the pin, as OpenStreetMap's licence asks */
export const PLACE_NAME_CREDIT = '© OpenStreetMap contributors';

/** The name in our server's answer (functions/src/placeName.ts), or null */
export function readPlaceName(answer: unknown): string | null {
  const name = (answer && typeof answer === 'object' ? (answer as { name?: unknown }).name : null);
  if (typeof name !== 'string') return null;
  const trimmed = name.trim();
  return trimmed.length >= 2 && trimmed.length <= MAX_DESTINATION_LENGTH ? trimmed : null;
}

/**
 * Whether the pin's name may go in "Where are you going?": only when it is
 * empty, or still holds the name the last pin gave it. What the traveller
 * typed is never replaced.
 */
export function mayFillDestination(current: string, lastPinName: string | null): boolean {
  const typed = current.trim();
  return typed === '' || (lastPinName !== null && typed === lastPinName);
}
