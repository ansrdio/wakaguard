/**
 * Searching for where a trip is going (build 27, item 10 in docs/BUILDS.md):
 * suggestions from Google's place search as the traveller types under "Where
 * are you going?", then the spot of the one they choose.
 *
 * Asked through our server so the key stays off phones. It is kept in Secret
 * Manager as PLACES_API_KEY, works only for Places API (New), and Google caps
 * it at 1,000 suggestions and 300 look-ups a day; each person also has an
 * hourly limit here. Google is sent what was typed, a session id the app made
 * up, and the traveller's area rounded to about a kilometre, never who they
 * are (Maps Platform Terms, "End User Requirements"). Nothing from Google is written to the
 * database or the log here.
 *
 * @module placeSearch
 */

import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import {
  AUTOCOMPLETE_FIELDS, AUTOCOMPLETE_URL, autocompleteBody, MAX_PLACES_PER_HOUR, MAX_SUGGESTS_PER_HOUR, nextTry,
  PLACE_FIELDS, PLACE_URL, placeFrom, readRequest, suggestionsFrom,
} from './placeSearchPlan';

const ASK_TIMEOUT_MS = 6000;
/** Each person's counts this hour; server only (firestore.rules), deleted after 2 days (recordRetention.ts) */
const TRIES = 'placeSearchTries';
/** Shown under the suggestions, as Google's attribution rules ask when there is no Google map on screen */
export const CREDIT = 'Google Maps';

/** False once this person has asked too often this hour */
async function countTry(uid: string, kind: 'suggest' | 'place'): Promise<boolean> {
  const db = admin.firestore();
  const ref = db.collection(TRIES).doc(uid);
  const max = kind === 'suggest' ? MAX_SUGGESTS_PER_HOUR : MAX_PLACES_PER_HOUR;
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const startMs = Number(snap.get(`${kind}StartMs`)) || 0;
    const count = Number(snap.get(`${kind}Count`)) || 0;
    const next = nextTry(snap.exists && startMs ? { startMs, count } : null, Date.now(), max);
    tx.set(ref, { [`${kind}StartMs`]: next.startMs, [`${kind}Count`]: next.count, startMs: Date.now() }, { merge: true });
    return next.allowed;
  });
}

async function askGoogle(url: string, init: RequestInit, fields: string): Promise<unknown> {
  const key = process.env.PLACES_API_KEY;
  if (!key) throw new Error('No PLACES_API_KEY');
  const response = await fetch(url, {
    ...init,
    headers: { ...(init.headers ?? {}), 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': fields },
    signal: AbortSignal.timeout(ASK_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Places answered ${response.status}`);
  return response.json();
}

/**
 * The app asks with { kind: 'suggest', text, session, near? } and gets
 * { suggestions, credit }, or with { kind: 'place', placeId, session, name }
 * and gets { place, credit }. Empty answers, never an error, when Google cannot
 * be asked: the traveller can still type a destination or set the pin.
 */
export const placeSearch = functions
  .runWith({ secrets: ['PLACES_API_KEY'], enforceAppCheck: process.env.ENFORCE_APP_CHECK === 'true', timeoutSeconds: 15 })
  .https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Sign in first');
    if (context.auth.token.firebase?.sign_in_provider === 'anonymous') {
      throw new functions.https.HttpsError('permission-denied', 'Sign up to search for places');
    }
    const request = readRequest(data);
    if (!request) throw new functions.https.HttpsError('invalid-argument', 'Nothing to search for');

    try {
      if (!(await countTry(context.auth.uid, request.kind))) {
        return request.kind === 'suggest'
          ? { suggestions: [], credit: CREDIT, reason: 'too_many' }
          : { place: null, credit: CREDIT, reason: 'too_many' };
      }
      if (request.kind === 'suggest') {
        const answer = await askGoogle(AUTOCOMPLETE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(autocompleteBody(request.text, request.session, request.near)),
        }, AUTOCOMPLETE_FIELDS);
        return { suggestions: suggestionsFrom(answer), credit: CREDIT };
      }
      const query = new URLSearchParams({ sessionToken: request.session, languageCode: 'en', regionCode: 'ng' });
      const answer = await askGoogle(`${PLACE_URL}${encodeURIComponent(request.placeId)}?${query.toString()}`, { method: 'GET' }, PLACE_FIELDS);
      return { place: placeFrom(answer, request.name), credit: CREDIT };
    } catch (error) {
      // Never what was typed or found: only that the search failed
      functions.logger.warn('Place search failed', { kind: request.kind, error: String(error) });
      return request.kind === 'suggest'
        ? { suggestions: [], credit: CREDIT, reason: 'failed' }
        : { place: null, credit: CREDIT, reason: 'failed' };
    }
  });
