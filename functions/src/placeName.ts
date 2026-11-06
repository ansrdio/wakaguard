/**
 * The name of a spot, from Google's address look-up (Geocoding API): for a
 * destination pin's name in "Where are you going?" (the owner, 18 October
 * 2026: setting the pin left the box empty), and for which state the phone is
 * in when someone taps "Use my location" (build 27).
 *
 * Asked through our server so the key stays off phones: the same key as the
 * place search (PLACES_API_KEY in Secret Manager), allowed only Places API
 * (New) and Geocoding API, and capped by Google at 1,000 look-ups a day. Each
 * person may ask for a limited number an hour. Google is sent the spot and
 * never who asked, and the spot is never written to the log.
 *
 * Until build 27 this asked OpenStreetMap's Nominatim, with one look-up a
 * second for the whole app and names kept in memory for a week. Google's terms
 * do not allow keeping its answers for anyone but the person who asked
 * (Service Specific Terms 6.3.2), so nothing is kept here.
 *
 * @module placeName
 */

import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { geocodeQuery, namesFromGoogle, nextLookup, readSpot, Spot, SpotNames } from './placeNamePlan';

const LOOKUP_TIMEOUT_MS = 5000;

/** Shown under a name it filled in, as Google's attribution rules ask when there is no Google map on screen */
export const CREDIT = 'Google Maps';

/** Each person's count this hour; server only (firestore.rules), deleted after 2 days (recordRetention.ts) */
const TRIES = 'placeNameTries';

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

async function askGoogle(spot: Spot): Promise<SpotNames | null> {
  const key = process.env.PLACES_API_KEY;
  if (!key) throw new Error('No PLACES_API_KEY');
  const response = await fetch(geocodeQuery(spot, key), { signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS) });
  if (!response.ok) throw new Error(`Geocoding answered ${response.status}`);
  const answer = (await response.json()) as { status?: string };
  // ZERO_RESULTS is a spot with no address (the sea, a forest); anything else not OK is a fault
  if (answer.status !== 'OK' && answer.status !== 'ZERO_RESULTS') throw new Error(`Geocoding said ${answer.status}`);
  return namesFromGoogle(answer);
}

/**
 * The app asks with { lat, lng }; the answer is { name, state, country, credit },
 * each null when it could not be had. Only for someone signed in.
 */
export const placeName = functions
  .runWith({ secrets: ['PLACES_API_KEY'], timeoutSeconds: 15 })
  .https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Sign in first');
    const spot = readSpot(data);
    if (!spot) throw new functions.https.HttpsError('invalid-argument', 'A spot is needed');

    const none = { name: null, state: null, country: null, credit: CREDIT };
    try {
      if (!(await countLookup(admin.firestore(), context.auth.uid))) return { ...none, reason: 'too_many' };
      const found = await askGoogle(spot);
      return found ? { ...found, credit: CREDIT } : none;
    } catch (error) {
      // Never the spot itself: only that a look-up failed
      functions.logger.warn('Could not name a spot', { error: String(error) });
      return { ...none, reason: 'failed' };
    }
  });
