/**
 * HTTPS endpoint for location updates from the native app during a Safe Trip.
 *
 * The app posts here with native HTTP while it is in the background, where
 * Android throttles requests made by the WebView (including the Firestore SDK).
 *
 * Auth is a per-trip secret (locationKey) stored on the owner's private trip
 * document. It avoids depending on an ID token that expires after an hour and
 * cannot be refreshed reliably in the background. The key only allows updating
 * the location of that one trip while it is active.
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { timingSafeEqual } from 'crypto';

/** Updates arriving faster than this are acknowledged but not written. */
const MIN_WRITE_INTERVAL_MS = 10 * 1000;

const ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

function keysMatch(expected: unknown, provided: unknown): boolean {
  if (typeof expected !== 'string' || typeof provided !== 'string') return false;
  if (expected.length < 32) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  return a.length === b.length && timingSafeEqual(a, b);
}

function isNumberInRange(v: unknown, min: number, max: number): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
}

export const tripLocation = functions.https.onRequest(async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  const { uid, tripId, key, lat, lng, accuracy } = req.body || {};

  if (typeof uid !== 'string' || !ID_PATTERN.test(uid)
    || typeof tripId !== 'string' || !ID_PATTERN.test(tripId)
    || !isNumberInRange(lat, -90, 90)
    || !isNumberInRange(lng, -180, 180)) {
    res.status(400).json({ error: 'invalid_request' });
    return;
  }

  const db = admin.firestore();
  const tripRef = db.doc(`users/${uid}/trips/${tripId}`);
  const snap = await tripRef.get();
  const trip = snap.data();

  // Same response for a missing trip and a wrong key, so ids cannot be probed
  if (!trip || !keysMatch(trip.locationKey, key)) {
    res.status(403).json({ error: 'forbidden' });
    return;
  }

  if (trip.status !== 'active' && trip.status !== 'emergency') {
    // Tells the app to stop sending
    res.status(410).json({ error: 'trip_ended' });
    return;
  }

  const lastUpdateMs = trip.lastUpdate?.toMillis?.() ?? 0;
  if (Date.now() - lastUpdateMs < MIN_WRITE_INTERVAL_MS) {
    res.status(200).json({ ok: true, written: false });
    return;
  }

  const lastLocation = {
    lat,
    lng,
    ...(isNumberInRange(accuracy, 0, 100000) ? { accuracy } : {}),
  };
  const update = {
    lastLocation,
    lastUpdate: FieldValue.serverTimestamp(),
  };

  await Promise.all([
    // The first position doubles as the start point if the phone had no fix when the trip began
    tripRef.update(trip.startLocation ? update : { ...update, startLocation: { lat, lng } }),
    db.doc(`sharedTrips/${tripId}`).set(update, { merge: true }),
  ]);

  res.status(200).json({ ok: true, written: true });
});
