/**
 * Callable for SMS the traveller chooses to send: a check-in, or a link to
 * the trip they are on. Messages always go to the user's own trusted
 * contacts and are built from templates.
 *
 * SOS and overdue alerts do not come through here; the server sends those
 * itself (see tripMonitor.ts).
 */

import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { checkAndIncrementRateLimit } from './rateLimit';
import { deliverSafetySms, getSenderProfile, getTrustedContacts } from './safetyDelivery';
import { buildCheckinMessage, buildTripShareMessage, markAsTest } from './templates';

type SafetySmsRequest =
  | { type: 'checkin'; message?: string; lat?: number; lng?: number }
  | { type: 'trip_share'; token: string };

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;

function validCoordinate(lat: unknown, lng: unknown): { lat: number; lng: number } | null {
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

export const sendSafetySms = functions
  // Switch on once App Check is registered for the app (see docs/SAFETY-ALERTS-SETUP.md)
  .runWith({ enforceAppCheck: process.env.ENFORCE_APP_CHECK === 'true' })
  .https.onCall(async (data: SafetySmsRequest, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
    }

    const uid = context.auth.uid;
    if (context.auth.token.firebase?.sign_in_provider === 'anonymous') {
      throw new functions.https.HttpsError('permission-denied', 'Anonymous users cannot send SMS');
    }

    if (!data || (data.type !== 'checkin' && data.type !== 'trip_share')) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid message type');
    }

    const sender = await getSenderProfile(uid);
    if (!sender.canSend) {
      throw new functions.https.HttpsError(
        'permission-denied',
        sender.blockReason === 'email_not_verified'
          ? 'Verify your email address to send SMS'
          : 'This account cannot send SMS'
      );
    }

    const db = admin.firestore();
    let messageBody: string;
    let contactIds: string[] | null = null;
    let payload: Record<string, unknown>;

    if (data.type === 'trip_share') {
      if (typeof data.token !== 'string' || !TOKEN_PATTERN.test(data.token)) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid trip');
      }
      // Only the caller's own, still-open trip can be shared
      const trip = (await db.doc(`users/${uid}/trips/${data.token}`).get()).data();
      if (!trip || (trip.status !== 'active' && trip.status !== 'emergency')) {
        throw new functions.https.HttpsError('failed-precondition', 'No active trip to share');
      }

      contactIds = Array.isArray(trip.trustedContactIds) ? trip.trustedContactIds : null;
      messageBody = markAsTest(buildTripShareMessage({
        userName: sender.name,
        token: data.token,
        destination: trip.destination ?? null,
        endsAtMs: trip.endsAt?.toMillis?.() ?? null,
      }), trip.isTest === true);
      payload = { token: data.token };
    } else {
      const location = validCoordinate(data.lat, data.lng);
      // "I'm okay" sent during a test trip is part of the test
      const openTrips = await db.collection(`users/${uid}/trips`)
        .where('status', 'in', ['active', 'emergency'])
        .limit(5)
        .get();
      const inTestTrip = openTrips.docs.some((doc) => doc.data().isTest === true);
      messageBody = markAsTest(buildCheckinMessage({
        userName: sender.name,
        message: typeof data.message === 'string' ? data.message : null,
        lat: location?.lat ?? null,
        lng: location?.lng ?? null,
      }), inTestTrip);
      payload = { lat: location?.lat ?? null, lng: location?.lng ?? null };
    }

    const contacts = await getTrustedContacts(uid, contactIds);
    if (contacts.length === 0) {
      throw new functions.https.HttpsError('failed-precondition', 'No trusted contacts with valid phone numbers');
    }

    const recipients = contacts
      .filter((c) => (data.type === 'checkin' ? c.notifyOnCheckIn !== false : c.notifyOnTripShare !== false))
      .map((c) => ({ id: c.id, name: c.name, phoneE164: c.phoneE164 }));
    if (recipients.length === 0) {
      throw new functions.https.HttpsError('failed-precondition', 'No contacts enabled for this notification type');
    }

    const rate = await checkAndIncrementRateLimit(uid, data.type, recipients.length);
    if (!rate.allowed) {
      throw new functions.https.HttpsError('resource-exhausted', rate.error || 'Rate limit exceeded');
    }

    const delivery = await deliverSafetySms({ uid, type: data.type, recipients, messageBody, payload });

    if (delivery.status === 'blocked') {
      return {
        success: false,
        status: 'blocked',
        sent: 0,
        failed: recipients.length,
        logId: delivery.logId,
        message: 'SMS sending is not available yet. You can share via WhatsApp instead.',
      };
    }

    return {
      success: delivery.status !== 'failed',
      status: delivery.status,
      sent: delivery.sent,
      failed: delivery.failed,
      logId: delivery.logId,
    };
  });
