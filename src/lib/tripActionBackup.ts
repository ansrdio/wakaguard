/**
 * @fileoverview The backup route for "I've arrived" and extra time
 *
 * Posts the press to the server's tripAction function by native HTTP, the
 * route the positions take, using the trip's own key. Used when the database
 * save has not reached the server in a few seconds (firestoreWrites.ts); see
 * functions/src/tripAction.ts for why.
 *
 * @module tripActionBackup
 */

import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { EMULATOR_HOST, usingEmulators } from './firebase';
import { tripActionEndpoint } from './tripLocation';

export type TripActionBody = { action: 'end' } | { action: 'extend'; minutes: number; requestId: string };

/** True once the server has the press (or already had it). Never rejects. */
export async function sendTripActionBackup(uid: string, tripId: string, key: string | null | undefined, body: TripActionBody): Promise<boolean> {
  if (!key) return false;
  const url = usingEmulators()
    ? `http://${EMULATOR_HOST}:5001/${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}/us-central1/tripAction`
    : tripActionEndpoint();
  if (!url) return false;
  const data = { uid, tripId, key, ...body };
  try {
    if (Capacitor.isNativePlatform()) {
      const response = await CapacitorHttp.post({
        url,
        headers: { 'Content-Type': 'application/json' },
        data,
        connectTimeout: 7000,
        readTimeout: 7000,
      });
      return response.status === 200;
    }
    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    return response.status === 200;
  } catch (err) {
    console.warn('The backup route for the trip did not answer:', err);
    return false;
  }
}

/** An id for one press of "add time", so the same press is never added twice */
export function newPressId(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return 'press_' + Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}
