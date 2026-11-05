/**
 * HTTPS endpoint: a second way for "I've arrived" and extra time to reach the
 * server, by the native route the positions take (tripLocation.ts).
 *
 * On 14 October 2026 a tester's "I've arrived" on an iPhone reached the server
 * 17 minutes after it was pressed: the database's own connection sat dead
 * while the phone had signal, and the server, not knowing, warned and marked
 * the trip overdue. Once texts are on, that would text someone's contacts
 * after they had arrived. The app now also posts the press here when its
 * database save is slow (src/lib/firestoreWrites.ts).
 *
 * Auth is the trip's own key, as for positions. The key allows ending that one
 * trip and adding time to it; the server's onTripUpdated then does what it
 * does for any ended or extended trip (the all-clear text, the reset of the
 * overdue state).
 *
 * From build 27 it also takes an SOS from the lock screen: Android's "SOS"
 * button on the "Safe Trip active" notification, confirmed once
 * (SosConfirmActivity.java), works without unlocking or opening the app. It
 * saves the same SOS alert the app's button saves, and onSOSAlert texts the
 * contacts. The press's id stops a second post of the same press sending twice.
 */

import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { ID_PATTERN, keysMatch } from './tripLocation';
import { planTripAction, readTripAction } from './tripActionPlan';
import { isOwnPage } from './tripPage';
import { answerBrowser } from './webOrigins';

const ms = (v: unknown): number | null => {
  const t = v as { toMillis?: () => number } | null | undefined;
  return typeof t?.toMillis === 'function' ? t.toMillis() : null;
};

export const tripAction = functions.https.onRequest(async (req, res) => {
  // The website's app posts here from the browser
  if (answerBrowser(req, res)) return;
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }
  const body = (req.body || {}) as Record<string, unknown>;
  const { uid, tripId, key } = body;
  const request = readTripAction(body);
  if (typeof uid !== 'string' || !ID_PATTERN.test(uid)
    || typeof tripId !== 'string' || !ID_PATTERN.test(tripId)
    || !request) {
    res.status(400).json({ error: 'invalid_request' });
    return;
  }

  const db = admin.firestore();
  const tripRef = db.doc(`users/${uid}/trips/${tripId}`);
  const sharedRef = db.doc(`sharedTrips/${tripId}`);

  const outcome = await db.runTransaction(async (tx) => {
    const trip = (await tx.get(tripRef)).data();
    // Same answer for a missing trip and a wrong key, so ids cannot be probed
    if (!trip || !keysMatch(trip.locationKey, key)) return 'forbidden' as const;
    // Only this traveller's own page is written (tripPage.ts)
    const ownPage = isOwnPage(await tx.get(sharedRef), uid);
    // Read before any write, as a transaction needs
    const sosRef = request.action === 'sos' ? db.doc(`users/${uid}/alerts/sos_${uid}_lock_${request.requestId}`) : null;
    const sosSent = sosRef ? (await tx.get(sosRef)).exists : false;
    const setPage = (data: Record<string, unknown>) => { if (ownPage) tx.set(sharedRef, data, { merge: true }); };

    const plan = planTripAction({
      status: trip.status,
      startMs: ms(trip.startTime),
      endsAtMs: ms(trip.endsAt),
      expiresAtMs: ms(trip.expiresAt),
      lastExtendRequestId: trip.lastExtendRequestId,
    }, request, Date.now());

    if (plan.kind === 'end') {
      tx.update(tripRef, { status: 'completed', endTime: FieldValue.serverTimestamp(), endedVia: 'backup' });
      setPage({ status: 'completed' });
      return 'did_end' as const;
    }
    if (plan.kind === 'cancel') {
      tx.update(tripRef, { status: 'cancelled', cancellationReason: 'traveller', endTime: FieldValue.serverTimestamp(), endedVia: 'backup' });
      setPage({ status: 'cancelled' });
      return 'did_end' as const;
    }
    if (plan.kind === 'sos' && sosRef) {
      if (sosSent) return 'already' as const;
      tx.set(sosRef, {
        type: 'sos',
        tripId,
        acknowledged: false,
        notifiedContacts: [],
        createdAt: FieldValue.serverTimestamp(),
        via: 'lock_screen',
        ...(plan.location ? { location: plan.location } : {}),
      });
      return 'did_sos' as const;
    }
    if (plan.kind === 'extend') {
      const times = { endsAt: Timestamp.fromMillis(plan.endsAtMs), expiresAt: Timestamp.fromMillis(plan.expiresAtMs) };
      tx.update(tripRef, {
        ...times,
        extensionCount: FieldValue.increment(1),
        extendedMinutes: FieldValue.increment(plan.minutes),
        extendedAt: FieldValue.serverTimestamp(),
        lastExtendRequestId: plan.requestId,
      });
      setPage(times);
      return 'did_extend' as const;
    }
    // 'already': nothing to do; 'ended': too late to add time
    return plan.kind === 'already' ? ('already' as const) : ('too_late' as const);
  });

  if (outcome === 'forbidden') res.status(403).json({ error: 'forbidden' });
  else if (outcome === 'did_end') res.status(200).json({ ok: true, done: 'ended' });
  else if (outcome === 'did_extend') res.status(200).json({ ok: true, done: 'extended' });
  else if (outcome === 'did_sos') res.status(200).json({ ok: true, done: 'sos' });
  else if (outcome === 'already') res.status(200).json({ ok: true, done: 'already' });
  else res.status(410).json({ error: 'trip_ended' });
});
