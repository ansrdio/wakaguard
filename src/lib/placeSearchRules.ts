/**
 * @fileoverview Searching for where a trip is going (build 27, item 10)
 *
 * Suggestions from Google's place search as the traveller types under "Where
 * are you going?", asked through our server (functions/src/placeSearch.ts), so
 * Google is sent what was typed and the chosen state's area, never who is
 * asking. Choosing one fills in its name and puts the pin on its spot.
 *
 * Only when the maps are Google's (lib/googleMaps.ts): Google does not allow
 * its place results on another company's map. A spot found this way is kept
 * with the trip and deleted 30 days after the trip's link expired, as are all
 * destination spots (KEPT_DAYS.destinationSpot).
 *
 * The checks and words, apart from the calls (lib/placeSearch.ts), so they can be tested on their own.
 *
 * @module placeSearchRules
 */

import { MAX_DESTINATION_LENGTH } from '@/lib/tripPlanning';
import { readPoint } from '@/lib/destinationPoint';

export interface PlaceSuggestion {
  placeId: string;
  /** "Ikeja City Mall" */
  name: string;
  /** "Obafemi Awolowo Way, Ikeja, Lagos" */
  detail: string;
}

export interface FoundPlace {
  name: string;
  address: string;
  lat: number;
  lng: number;
}

/** Shown under the suggestions and under a name they filled in, as Google's attribution rules ask */
export const PLACE_SEARCH_CREDIT = 'Google Maps';

/** Typed this many letters before any suggestion is asked for */
export const MIN_SEARCH_LENGTH = 3;
export const MAX_SEARCH_LENGTH = 80;
/** A pause in typing this long before asking, so each letter does not cost a search */
export const SEARCH_PAUSE_MS = 400;

/**
 * Google's session: one per search, from the first letter to the place chosen,
 * so the suggestions and the look-up are charged as one.
 */
export function newSearchSession(): string {
  const c = typeof crypto !== 'undefined' ? crypto : undefined;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  const bytes = new Uint8Array(16);
  if (c && typeof c.getRandomValues === 'function') c.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Whether the words in the box are worth searching for */
export function searchable(text: string): boolean {
  const t = text.trim();
  return t.length >= MIN_SEARCH_LENGTH && t.length <= MAX_SEARCH_LENGTH;
}

/** The suggestions in our server's answer, checked; empty for anything unusable */
export function readSuggestions(answer: unknown): PlaceSuggestion[] {
  const list = (answer as { suggestions?: unknown } | null)?.suggestions;
  if (!Array.isArray(list)) return [];
  return list
    .filter((s): s is PlaceSuggestion => !!s && typeof s === 'object'
      && typeof (s as PlaceSuggestion).placeId === 'string'
      && typeof (s as PlaceSuggestion).name === 'string' && (s as PlaceSuggestion).name.length >= 2)
    .map((s) => ({
      placeId: s.placeId,
      name: s.name.slice(0, MAX_DESTINATION_LENGTH),
      detail: typeof s.detail === 'string' ? s.detail : '',
    }))
    .slice(0, 5);
}

/** The place in our server's answer, checked; null for anything unusable */
export function readFoundPlace(answer: unknown): FoundPlace | null {
  const place = (answer as { place?: unknown } | null)?.place as Record<string, unknown> | null | undefined;
  if (!place || typeof place !== 'object') return null;
  const point = readPoint({ lat: place.lat, lng: place.lng });
  const name = typeof place.name === 'string' ? place.name.trim().slice(0, MAX_DESTINATION_LENGTH) : '';
  if (!point || name.length < 2) return null;
  return { name, address: typeof place.address === 'string' ? place.address : '', lat: point.lat, lng: point.lng };
}

