/**
 * @fileoverview Repeat a usual trip (build 25)
 *
 * "I forgot to start a trip" was the most common reason for using WakaGuard
 * less (tester survey, 17 October 2026: 4 of 9). The start form offers the
 * traveller's usual trips, so a daily journey takes one tap to fill in.
 *
 * A usual trip is a place they went before and ended with "I've arrived":
 * the same pin (within 300 m) or, without pins, the same typed name. Its
 * length is what the trip actually took, with the same margin for traffic as
 * the directions, so it errs on the safe side: a length too tight would alert
 * their contacts.
 *
 * Read only from the traveller's own trips; nothing new is stored. No Firebase
 * or DOM access (functions/test/usualTrips.test.ts).
 *
 * @module usualTrips
 */

import { distanceM } from '@/lib/directions';
import { MAX_TRIP_MINUTES } from '@/lib/tripPlanning';

export interface PastTrip {
  destination: string;
  point: { lat: number; lng: number } | null;
  /** Ended with "I've arrived" (completed), not cancelled or still running */
  arrived: boolean;
  isTest: boolean;
  startMs: number;
  /** When it ended, if known */
  endMs: number | null;
  /** The length chosen at the start plus any time added */
  plannedMinutes: number;
  travelMode: string | null;
}

export interface UsualTrip {
  /** Stable for the list: the place's first trip, as text */
  key: string;
  destination: string;
  point: { lat: number; lng: number } | null;
  /** The trip length to fill in */
  minutes: number;
  travelMode: string | null;
  /** How many arrived trips went there */
  count: number;
  lastMs: number;
}

/** Pins this close are the same place */
export const SAME_PLACE_M = 300;
/** Older trips are not "usual" any more */
export const USUAL_WITHIN_DAYS = 60;
/** The time a trip took is read from this many of its latest journeys */
const RECENT_JOURNEYS = 5;
const MIN_MINUTES = 15;
/** The same margin as the directions' suggestion: a third more, and 5 minutes */
const MARGIN = 1.3;
const EXTRA_MINUTES = 5;

const sameText = (a: string, b: string) => a.trim().toLowerCase().replace(/\s+/g, ' ') === b.trim().toLowerCase().replace(/\s+/g, ' ');

function samePlace(a: PastTrip, b: PastTrip): boolean {
  if (a.point && b.point) return distanceM(a.point, b.point) <= SAME_PLACE_M;
  return !!a.destination.trim() && sameText(a.destination, b.destination);
}

function median(values: number[]): number {
  const sorted = [...values].sort((x, y) => x - y);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

/** The length to fill in, from the latest journeys to one place */
export function usualMinutes(journeys: PastTrip[]): number {
  const recent = journeys.slice(0, RECENT_JOURNEYS);
  const taken = recent
    .filter((t) => t.endMs !== null && t.endMs > t.startMs)
    .map((t) => ((t.endMs as number) - t.startMs) / 60000);
  // Without an end time, the length they chose (and added to) is all there is
  const minutes = taken.length > 0 ? median(taken) * MARGIN + EXTRA_MINUTES : median(recent.map((t) => t.plannedMinutes));
  const rounded = Math.ceil(minutes / 5) * 5;
  return Math.min(MAX_TRIP_MINUTES, Math.max(MIN_MINUTES, rounded));
}

/**
 * The traveller's usual trips, most frequent first, then most recent
 * @param trips their trips, newest first
 */
export function usualTrips(trips: PastTrip[], nowMs: number, limit = 3): UsualTrip[] {
  const since = nowMs - USUAL_WITHIN_DAYS * 24 * 60 * 60 * 1000;
  const eligible = trips
    .filter((t) => t.arrived && !t.isTest && t.startMs >= since && (t.point || t.destination.trim()))
    .sort((a, b) => b.startMs - a.startMs);

  const places: PastTrip[][] = [];
  for (const trip of eligible) {
    const place = places.find((journeys) => samePlace(journeys[0], trip));
    if (place) place.push(trip);
    else places.push([trip]);
  }

  return places
    .map((journeys) => {
      const latest = journeys[0];
      return {
        key: `${latest.startMs}`,
        destination: latest.destination.trim() || 'Pin on the map',
        point: latest.point,
        minutes: usualMinutes(journeys),
        travelMode: latest.travelMode,
        count: journeys.length,
        lastMs: latest.startMs,
      };
    })
    .sort((a, b) => b.count - a.count || b.lastMs - a.lastMs)
    .slice(0, limit);
}
