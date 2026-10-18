/**
 * @fileoverview Road reports posted from far away
 *
 * Nothing stopped a road report being posted for a place hundreds of
 * kilometres from the person posting it (raised by a tester on 13 October
 * 2026). People do report things they passed earlier, so the report still
 * goes up, but one posted from more than FAR_AWAY_KM away is marked
 * `postedFarAway`: the report shows that it was not posted on the spot, and
 * it does not count for the weekly ranking (scripts/weekly-numbers.mjs).
 *
 * Where the phone is comes from a fresh position, only if location is
 * already allowed. When it is not known, nothing is marked.
 *
 * @module reportDistance
 */

import { readPhoneLocation } from './locationCheck';
import { calculateDistance } from './geo';

export const FAR_AWAY_KM = 30;
/** A position older than this does not say where the phone is now */
const FRESH_MS = 10 * 60 * 1000;

type Place = { lat: number; lng: number };

/** True when the report's pin is far from the phone, false when near, null when the phone's place is not known */
export function isPostedFarAway(phone: Place | null, pin: Place): boolean | null {
  if (!phone) return null;
  return calculateDistance(phone.lat, phone.lng, pin.lat, pin.lng) > FAR_AWAY_KM * 1000;
}

/** Roughly where the phone is now, without asking for location; null when that is not known */
export async function whereThePhoneIs(): Promise<Place | null> {
  try {
    const { permission } = await readPhoneLocation();
    if (permission !== 'granted' && permission !== 'approximate') return null;
    if (typeof navigator === 'undefined' || !navigator.geolocation) return null;
    return await new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: false, maximumAge: FRESH_MS, timeout: 6000 },
      );
    });
  } catch {
    return null;
  }
}
