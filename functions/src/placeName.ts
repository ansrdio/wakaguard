/**
 * The name of a destination pin, for "Where are you going?" (the owner, 18
 * October 2026: setting the pin left the box empty).
 *
 * The app sends the pinned spot; this asks OpenStreetMap's Nominatim for the
 * street and area there, so Nominatim is sent the spot and never who asked.
 * Nominatim's rules allow one look-up a second for the whole app, so every
 * look-up takes a turn through one database document, and each person may ask
 * for a limited number an hour. Names are kept in memory for a while, never
 * in the database, and the spot is never written to the log.
 *
 * @module placeName
 */

import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { NAMED_AS } from './weather';
import { nextLookup, placeNameFrom, readSpot, Spot, spotKey, waitForTurnMs } from './placeNamePlan';

const LOOKUP_URL = 'https://nominatim.openstreetmap.org/reverse';
const LOOKUP_TIMEOUT_MS = 5000;
/** A turn not had in this many tries is given up: the box simply stays empty */
const MAX_TURN_TRIES = 4;
/** Names kept in memory, so the same spot is not asked about twice */
const KEPT_NAMES = 500;
const KEEP_NAME_MS = 7 * 24 * 60 * 60 * 1000;

export const CREDIT = '© OpenStreetMap contributors';

/** Last look-up time for the whole app, and each person's count; server only (firestore.rules) */
const TURN_DOC = 'serverLimits/nominatim';
const TRIES = 'placeNameTries';

const kept = new Map<string, { name: string | null; atMs: number }>();

function keep(key: string, name: string | null, nowMs: number): void {
  if (kept.size >= KEPT_NAMES) kept.delete(kept.keys().next().value as string);
  kept.set(key, { name, atMs: nowMs });
}

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** True once this look-up has its turn, false if it could not get one */
async function takeTurn(db: admin.firestore.Firestore): Promise<boolean> {
  const ref = db.doc(TURN_DOC);
  for (let i = 0; i < MAX_TURN_TRIES; i++) {
    const wait = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const last = snap.get('lastLookupMs');
      const nowMs = Date.now();
      const waitMs = waitForTurnMs(typeof last === 'number' ? last : null, nowMs);
      if (waitMs === 0) tx.set(ref, { lastLookupMs: nowMs });
      return waitMs;
    });
    if (wait === 0) return true;
    await pause(wait + 50);
  }
  return false;
}

/** False once this person has asked too often this hour */
async function countLookup(db: admin.firestore.Firestore, uid: string): Promise<boolean> {
  const ref = db.collection(TRIES).doc(uid);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const previous = snap.exists
      ? { startMs: Number(snap.get('startMs')) || 0, count: Number(snap.get('count')) || 0 }
      : null;
    const next = nextLookup(previous, Date.now());
    tx.set(ref, { startMs: next.startMs, count: next.count });
    return next.allowed;
  });
}

async function askNominatim(spot: Spot): Promise<string | null> {
  const url = `${LOOKUP_URL}?format=jsonv2&lat=${spot.lat}&lon=${spot.lng}&zoom=17&addressdetails=1`;
  const response = await fetch(url, {
    headers: { 'User-Agent': NAMED_AS, 'Accept-Language': 'en' },
    signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Nominatim answered ${response.status}`);
  return placeNameFrom(await response.json());
}

/**
 * The app asks with { lat, lng }; the answer is { name, credit }, the name
 * null when none could be had. Only for someone signed in.
 */
export const placeName = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Sign in first');
  const spot = readSpot(data);
  if (!spot) throw new functions.https.HttpsError('invalid-argument', 'A spot in Nigeria is needed');

  const key = spotKey(spot);
  const nowMs = Date.now();
  const known = kept.get(key);
  if (known && nowMs - known.atMs < KEEP_NAME_MS) return { name: known.name, credit: CREDIT };

  const db = admin.firestore();
  try {
    if (!(await countLookup(db, context.auth.uid))) return { name: null, credit: CREDIT, reason: 'too_many' };
    if (!(await takeTurn(db))) return { name: null, credit: CREDIT, reason: 'busy' };
    const name = await askNominatim(spot);
    keep(key, name, Date.now());
    return { name, credit: CREDIT };
  } catch (error) {
    // Never the spot itself: only that a look-up failed
    functions.logger.warn('Could not name a pinned spot', { error: String(error) });
    return { name: null, credit: CREDIT, reason: 'failed' };
  }
});
