/**
 * Server-side safety monitor.
 *
 * The server, not the traveller's phone, decides when a trip or safety timer is
 * overdue. This keeps the alarm working when the phone is off, out of coverage
 * or out of battery.
 *
 * - checkOverdueTrips: runs every minute, warns the traveller at the deadline and
 *   alerts trusted contacts after the grace period.
 * - checkQuietTrips: runs every two minutes and tells a traveller whose phone
 *   has stopped sending its position, so they can open the app again.
 * - onTripUpdated / onSafetyTimerUpdated: tell contacts when an overdue person
 *   checks in, extends or ends the trip.
 * - onSOSAlert: sends SOS messages to trusted contacts.
 */

import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { checkAndIncrementRateLimit } from './rateLimit';
import { getNumberSetting } from './config';
import { deliverSafetySms, DeliveryResult, getSenderProfile, getTrustedContacts, Recipient, UNKNOWN_NAME } from './safetyDelivery';
import { AllClearReason, buildAllClearMessage, buildOverdueMessage, buildSosMessage, markAsTest } from './templates';
import { addPathPoint, distanceMeters, readPath } from './tripPath';
import { buildTravellerPush, TravellerMessage } from './reminderPush';
import {
  decideOverdueAction,
  decideQuietNudge,
  decideReminder,
  HEADS_UP_BEFORE_MS,
  LAST_WARNING_BEFORE_MS,
  QuietSubject,
  ReminderSubject,
  graceMs,
  OverdueAlertState,
  OverdueSubject,
  OVERDUE_MAX_AGE_MS,
  wasAlertDelivered,
} from './overdueLogic';

type DocRef = FirebaseFirestore.DocumentReference;
type DocData = FirebaseFirestore.DocumentData;
type Kind = 'trip' | 'timer';

const BATCH_LIMIT = 200;


/** Once contacts are alerted, keep the share link readable for this long. */
const OVERDUE_LINK_MS = 72 * 60 * 60 * 1000;

const toMillis = (v: any): number | null =>
  v && typeof v.toMillis === 'function' ? v.toMillis() : null;

function deadlineField(kind: Kind): 'endsAt' | 'expiresAt' {
  return kind === 'trip' ? 'endsAt' : 'expiresAt';
}

function isStillActive(kind: Kind, data: DocData): boolean {
  if (kind === 'trip') return data.status === 'active';
  // Timers linked to a trip are covered by the trip's own deadline
  return data.acknowledged === false && !data.tripId;
}

function toSubject(kind: Kind, data: DocData): OverdueSubject {
  return {
    deadlineMs: toMillis(data[deadlineField(kind)]) ?? NaN,
    shouldNotifyContacts: data.shouldNotifyContacts,
    overdueWarnedAtMs: toMillis(data.overdueWarnedAt),
    lastWarnedAtMs: toMillis(data.overdueLastWarnedAt),
    overdueAlertState: data.overdueAlertState ?? null,
    overdueAlertAttempts: data.overdueAlertAttempts ?? 0,
    overdueAlertClaimedAtMs: toMillis(data.overdueAlertClaimedAt),
    isTest: data.isTest === true,
  };
}

function toReminderSubject(data: DocData): ReminderSubject {
  const sent = data.arrivalReminders;
  return {
    deadlineMs: toMillis(data.endsAt) ?? NaN,
    // A trip extended by an older app, which does not say when, gets no heads-up
    deadlineSetAtMs: toMillis(data.extendedAt) ?? ((data.extensionCount ?? 0) > 0 ? null : toMillis(data.startTime)),
    isTest: data.isTest === true,
    sent: sent ? { deadlineMs: sent.deadlineMs, headsUp: sent.headsUp === true, stillOpenCount: sent.stillOpenCount ?? 0 } : null,
  };
}

function toQuietSubject(data: DocData): QuietSubject {
  const sent = data.quietNudges;
  return {
    startMs: toMillis(data.startTime),
    lastHeardMs: toMillis(data.lastUpdate),
    deadlineMs: toMillis(data.endsAt) ?? NaN,
    isTest: data.isTest === true,
    sent: sent ? { heardMs: sent.heardMs ?? null, count: sent.count ?? 0, lastAtMs: toMillis(sent.lastAt) } : null,
  };
}

/** uid is the parent of the subcollection: users/{uid}/trips/{id} */
function uidFromRef(ref: DocRef): string {
  return ref.parent.parent!.id;
}

// -----------------------------------------------------------------------------
// Scheduled monitor
// -----------------------------------------------------------------------------

export const checkOverdueTrips = functions.pubsub
  .schedule('every 1 minutes')
  .onRun(async () => {
    const db = admin.firestore();
    const nowMs = Date.now();
    const now = Timestamp.fromMillis(nowMs);
    const oldest = Timestamp.fromMillis(nowMs - OVERDUE_MAX_AGE_MS);

    const [trips, timers] = await Promise.all([
      // Trips are picked up a little before their time, for the heads-up
      db.collectionGroup('trips')
        .where('status', '==', 'active')
        .where('endsAt', '<=', Timestamp.fromMillis(nowMs + HEADS_UP_BEFORE_MS))
        .where('endsAt', '>=', oldest)
        .limit(BATCH_LIMIT)
        .get(),
      db.collectionGroup('safetyTimers')
        .where('acknowledged', '==', false)
        .where('expiresAt', '<=', now)
        .where('expiresAt', '>=', oldest)
        .limit(BATCH_LIMIT)
        .get(),
    ]);

    const work: Array<Promise<void>> = [];
    const queue = (kind: Kind, snap: FirebaseFirestore.QuerySnapshot) => {
      snap.forEach((doc) => {
        const data = doc.data();
        if (!isStillActive(kind, data)) return;

        const action = decideOverdueAction(toSubject(kind, data), nowMs);
        if (action === 'warn') work.push(safely(() => warnTraveller(doc.ref, kind)));
        if (action === 'last_warning') work.push(safely(() => lastWarnTraveller(doc.ref, kind)));
        if (action === 'alert') work.push(safely(() => alertContacts(doc.ref, kind)));
        if (kind === 'trip' && decideReminder(toReminderSubject(data), nowMs) !== 'none') {
          work.push(safely(() => remindTraveller(doc.ref)));
        }
      });
    };

    queue('trip', trips);
    queue('timer', timers);

    await Promise.all(work);
    if (work.length > 0) {
      console.log(`Overdue monitor handled ${work.length} item(s)`);
    }
    return null;
  });

/** One failing trip must not stop the others from being processed. */
async function safely(fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (err) {
    console.error('Overdue monitor item failed:', err);
  }
}

/**
 * Deadline reached: push a reminder to the traveller so they can check in or
 * add time before contacts are alerted.
 */
async function warnTraveller(ref: DocRef, kind: Kind): Promise<void> {
  const db = admin.firestore();
  const uid = uidFromRef(ref);

  const claimed = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.data();
    if (!data || !isStillActive(kind, data)) return null;
    if (decideOverdueAction(toSubject(kind, data), Date.now()) !== 'warn') return null;
    tx.update(ref, { overdueWarnedAt: FieldValue.serverTimestamp() });
    return data;
  });
  if (!claimed) return;

  const isTest = claimed.isTest === true;
  const graceMinutes = Math.round(graceMs({ isTest }) / 60000);
  await pushToTraveller(uid, {
    title: isTest ? 'Test trip: are you okay?' : 'Are you okay?',
    body: `Check in or add time. Your contacts will be alerted in ${graceMinutes} minute${graceMinutes === 1 ? '' : 's'}.`,
    data: { type: 'overdue_warning', kind, id: ref.id },
  });
}

/**
 * Five minutes before contacts are texted: say so plainly, once. Added on 14
 * October 2026 with the longer wait, so that the wait ends with a warning
 * nobody can mistake for another reminder.
 */
async function lastWarnTraveller(ref: DocRef, kind: Kind): Promise<void> {
  const db = admin.firestore();
  const uid = uidFromRef(ref);

  const claimed = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.data();
    if (!data || !isStillActive(kind, data)) return null;
    if (decideOverdueAction(toSubject(kind, data), Date.now()) !== 'last_warning') return null;
    tx.update(ref, { overdueLastWarnedAt: FieldValue.serverTimestamp() });
    return data;
  });
  if (!claimed) return;

  const minutes = Math.round(LAST_WARNING_BEFORE_MS / 60000);
  await pushToTraveller(uid, {
    title: `Your contacts will be texted in ${minutes} minutes`,
    body: kind === 'trip'
      ? 'If you are safe, tap "I\'ve arrived". If you need longer, add time.'
      : 'If you are safe, check in on your timer in the app.',
    data: { type: 'overdue_last_warning', kind, id: ref.id },
  });
}

/**
 * Nearly out of time, or long past it with the trip never ended: nudge the
 * traveller. What contacts are told is not affected.
 */
async function remindTraveller(ref: DocRef): Promise<void> {
  const db = admin.firestore();
  const uid = uidFromRef(ref);

  const reminder = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.data();
    if (!data || !isStillActive('trip', data)) return null;
    const subject = toReminderSubject(data);
    const action = decideReminder(subject, Date.now());
    if (action === 'none') return null;

    const sameDeadline = subject.sent?.deadlineMs === subject.deadlineMs;
    tx.update(ref, {
      arrivalReminders: {
        deadlineMs: subject.deadlineMs,
        headsUp: action === 'heads_up' || (sameDeadline && subject.sent?.headsUp === true),
        stillOpenCount: (sameDeadline ? subject.sent?.stillOpenCount ?? 0 : 0) + (action === 'still_open' ? 1 : 0),
        lastAt: FieldValue.serverTimestamp(),
      },
    });
    return action;
  });
  if (!reminder) return;

  await pushToTraveller(uid, reminder === 'heads_up'
    ? {
      title: '5 minutes left',
      body: 'Have you arrived? Tap "I\'ve arrived", or add time if you need longer.',
      data: { type: 'trip_reminder', kind: 'trip', id: ref.id },
    }
    : {
      title: 'Is your trip finished?',
      body: 'Your trip is still open, past its time. If you have arrived, tap "I\'ve arrived".',
      data: { type: 'trip_reminder', kind: 'trip', id: ref.id },
    });
}

// -----------------------------------------------------------------------------
// A phone that has stopped sending its position
// -----------------------------------------------------------------------------

/**
 * Kept apart from checkOverdueTrips on purpose: that function is what alerts
 * contacts, and nothing added for a reminder should be able to slow it or
 * stop it.
 *
 * Reads every running trip that is not close to its time, with the index the
 * overdue check already uses. That is a handful of trips today. If there are
 * ever more than QUIET_BATCH_LIMIT running at once, ask instead for trips by
 * how long ago they were heard from, which needs an index of its own.
 */
const QUIET_BATCH_LIMIT = 500;

export const checkQuietTrips = functions.pubsub
  .schedule('every 2 minutes')
  .onRun(async () => {
    const db = admin.firestore();
    const nowMs = Date.now();

    const trips = await db.collectionGroup('trips')
      .where('status', '==', 'active')
      .where('endsAt', '>', Timestamp.fromMillis(nowMs + HEADS_UP_BEFORE_MS))
      .limit(QUIET_BATCH_LIMIT)
      .get();

    const work: Array<Promise<void>> = [];
    trips.forEach((doc) => {
      const data = doc.data();
      if (!isStillActive('trip', data)) return;
      if (decideQuietNudge(toQuietSubject(data), nowMs)) work.push(safely(() => nudgeQuietTraveller(doc.ref)));
    });
    await Promise.all(work);
    if (trips.size === QUIET_BATCH_LIMIT) {
      console.warn(`checkQuietTrips read ${QUIET_BATCH_LIMIT} trips, its limit: some running trips were not looked at`);
    }
    return null;
  });

async function nudgeQuietTraveller(ref: DocRef): Promise<void> {
  const db = admin.firestore();
  const uid = uidFromRef(ref);

  const nudged = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.data();
    if (!data || !isStillActive('trip', data)) return false;
    const subject = toQuietSubject(data);
    if (!decideQuietNudge(subject, Date.now())) return false;

    const heardMs = subject.lastHeardMs ?? subject.startMs;
    const sameSilence = subject.sent?.heardMs === heardMs;
    tx.update(ref, {
      quietNudges: {
        heardMs,
        count: (sameSilence ? subject.sent?.count ?? 0 : 0) + 1,
        lastAt: FieldValue.serverTimestamp(),
      },
    });
    return true;
  });
  if (!nudged) return;

  await pushToTraveller(uid, {
    title: 'Your location has stopped sharing',
    body: 'WakaGuard has not received your position for a while. Open the app so your contacts can see where you are.',
    // Its own type: opening the app is the point, so it carries no buttons
    data: { type: 'location_stopped', kind: 'trip', id: ref.id },
  });
}

/** Sends one notification to the traveller's phone, if it is registered for them. Never throws. */
async function pushToTraveller(uid: string, message: TravellerMessage): Promise<void> {
  const subscription = (await admin.firestore().doc(`pushSubscriptions/${uid}`).get()).data();
  const fcmToken = subscription?.fcmToken;
  if (typeof fcmToken !== 'string' || !fcmToken) return;

  try {
    // Reminders about the trip's time carry "I've arrived" and "+15 min" (reminderPush.ts)
    await admin.messaging().send(buildTravellerPush(
      { fcmToken, platform: subscription?.platform, appBuild: subscription?.appBuild, appBuildToken: subscription?.appBuildToken },
      message,
    ));
  } catch (err) {
    console.warn(`Reminder push failed for ${uid}:`, err);
  }
}

/**
 * Grace period passed: alert trusted contacts by SMS and mark the trip overdue.
 * The 'sending' claim is taken in a transaction so overlapping runs cannot
 * both send.
 */
async function alertContacts(ref: DocRef, kind: Kind): Promise<void> {
  const db = admin.firestore();
  const uid = uidFromRef(ref);
  const field = deadlineField(kind);

  const claimed = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.data();
    if (!data || !isStillActive(kind, data)) return null;
    if (decideOverdueAction(toSubject(kind, data), Date.now()) !== 'alert') return null;

    tx.update(ref, {
      overdueAlertState: 'sending',
      overdueAlertClaimedAt: FieldValue.serverTimestamp(),
      overdueAlertAttempts: FieldValue.increment(1),
      overdueAt: data.overdueAt ?? FieldValue.serverTimestamp(),
    });
    return data;
  });
  if (!claimed) return;

  const deadlineMs = toMillis(claimed[field])!;
  const keepUntil = Timestamp.fromMillis(Date.now() + OVERDUE_LINK_MS);

  // Show the overdue state on the public page straight away, and keep the link
  // alive: contacts need it most after the trip would normally have expired.
  if (kind === 'trip') {
    await Promise.all([
      ref.update({ expiresAt: keepUntil }),
      db.doc(`sharedTrips/${ref.id}`).set(
        { overdueAt: FieldValue.serverTimestamp(), expiresAt: keepUntil, ...travelModeForContacts(claimed) },
        { merge: true }
      ),
    ]);
  }

  const contacts = await getTrustedContacts(uid, kind === 'trip' ? claimed.trustedContactIds : null);
  const sender = await getSenderProfile(uid);
  let state: OverdueAlertState;
  let notified: string[] = [];
  // How many of the trip's contacts the provider accepted a text for.
  // The app shows these, so it never claims more than was sent.
  let sentCount = 0;

  if (contacts.length === 0) {
    state = 'no_contacts';
  } else if (!sender.canSend) {
    console.warn(`Overdue alert not sent for ${uid}: ${sender.blockReason}`);
    state = 'blocked';
  } else {
    const rate = await checkAndIncrementRateLimit(uid, 'overdue', contacts.length);
    if (!rate.allowed && rate.reason === 'limit') {
      console.warn(`Overdue alert rate limited for ${uid}`);
      state = 'failed';
    } else {
      // A failed limit check (reason 'error') does not hold back a safety alert
      const messageBody = markAsTest(buildOverdueMessage({
        userName: sender.name,
        kind,
        deadlineMs,
        destination: claimed.destination ?? null,
        lat: claimed.lastLocation?.lat ?? null,
        lng: claimed.lastLocation?.lng ?? null,
        lastUpdateMs: toMillis(claimed.lastUpdate),
        token: kind === 'trip' ? ref.id : null,
      }), claimed.isTest === true);

      const recipients: Recipient[] = contacts.map((c) => ({
        id: c.id,
        name: c.name,
        phoneE164: c.phoneE164,
      }));
      const delivery = await deliverSafetySms({
        uid,
        type: 'overdue',
        recipients,
        messageBody,
        payload: { kind, id: ref.id, deadlineMs },
      });
      state = delivery.status;
      sentCount = delivery.sent;
      if (delivery.sent > 0) notified = contacts.map((c) => c.id);
    }
  }

  // Only record the outcome if the deadline has not moved while we were sending.
  // If the traveller extended in the meantime, onTripUpdated has already reset
  // the overdue fields and they must stay reset.
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.data();
    if (!data || toMillis(data[field]) !== deadlineMs) return;
    tx.update(ref, {
      overdueAlertState: state,
      overdueAlertSent: sentCount,
      overdueAlertTotal: contacts.length,
      lastContactNotificationAt: FieldValue.serverTimestamp(),
      ...(notified.length > 0 ? { notifiedContacts: notified } : {}),
    });
  });

  await db.collection(`users/${uid}/alerts`).add({
    type: kind === 'trip' ? 'check_in_missed' : 'timer_expired',
    tripId: kind === 'trip' ? ref.id : null,
    timerId: kind === 'timer' ? ref.id : null,
    acknowledged: false,
    notifiedContacts: notified,
    deliveryState: state,
    message: kind === 'trip'
      ? 'Trip passed its expected arrival time without a check-in'
      : 'Safety timer expired without check-in',
    createdAt: FieldValue.serverTimestamp(),
  });
}

// -----------------------------------------------------------------------------
// All-clear messages
// -----------------------------------------------------------------------------

const OVERDUE_RESET = () => ({
  overdueAt: FieldValue.delete(),
  overdueWarnedAt: FieldValue.delete(),
  overdueLastWarnedAt: FieldValue.delete(),
  overdueAlertState: FieldValue.delete(),
  overdueAlertSent: FieldValue.delete(),
  overdueAlertTotal: FieldValue.delete(),
  overdueAlertAttempts: FieldValue.delete(),
  overdueAlertClaimedAt: FieldValue.delete(),
});

async function sendAllClear(
  ref: DocRef,
  contactIds: string[] | null,
  reason: AllClearReason,
  newDeadlineMs?: number | null
): Promise<void> {
  const uid = uidFromRef(ref);
  const contacts = await getTrustedContacts(uid, contactIds);
  if (contacts.length === 0) return;

  const sender = await getSenderProfile(uid);
  if (!sender.canSend) return;

  const rate = await checkAndIncrementRateLimit(uid, 'all_clear', contacts.length);
  if (!rate.allowed && rate.reason === 'limit') {
    console.warn(`All-clear rate limited for ${uid}`);
    return;
  }

  const isTest = (await ref.get()).data()?.isTest === true;

  await deliverSafetySms({
    uid,
    type: 'all_clear',
    recipients: contacts.map((c) => ({ id: c.id, name: c.name, phoneE164: c.phoneE164 })),
    messageBody: markAsTest(buildAllClearMessage({ userName: sender.name, reason, newDeadlineMs }), isTest),
    payload: { id: ref.id, reason },
  });
}

/** Send an all-clear at most once per trip, even if the trigger fires twice. */
async function sendAllClearOnce(ref: DocRef, contactIds: string[] | null, reason: AllClearReason): Promise<void> {
  const first = await admin.firestore().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists || snap.data()?.allClearSentAt) return false;
    tx.update(ref, { allClearSentAt: FieldValue.serverTimestamp() });
    return true;
  });
  if (first) await sendAllClear(ref, contactIds, reason);
}

const isOpenStatus = (status: unknown) => status === 'active' || status === 'emergency';

/**
 * The ways of travelling the app offers when a trip is started. Must match
 * TRAVEL_MODES in src/lib/travelMode.ts (functions/test/travelMode.test.ts checks).
 */
export const TRAVEL_MODE_IDS = ['bus', 'keke', 'okada', 'car', 'taxi', 'foot', 'other'];

/**
 * How the traveller said they were travelling, for the page their contacts
 * open. It is put there only once contacts are being told something is wrong
 * (overdue, or an SOS): until then it stays with the private trip. Anything
 * that is not one of the app's own choices is left out.
 */
export function travelModeForContacts(trip: DocData | undefined): { travelMode?: string } {
  const mode = trip?.travelMode;
  return typeof mode === 'string' && TRAVEL_MODE_IDS.includes(mode) ? { travelMode: mode } : {};
}

/**
 * Keep the public share document's path up to date, and put the traveller's
 * name on it.
 *
 * Runs for every change to a trip, so it covers positions posted by the phone
 * app and ones written by a browser. Trigger events can arrive twice or out of
 * order; addPathPoint ignores anything that is not newer than the path's end.
 *
 * The path is removed when the trip ends. The share link stops working then,
 * and a record of where someone went should not outlive its use.
 */
/**
 * The farthest a running trip has gone from where it started, in metres
 * (farthestFromStartM on the private trip). The beta ranking counts a trip
 * that went 500 m or more: a round trip, to the market and home again, ends
 * where it began, and was counted as "did not move" when only its two ends
 * were compared (11 trips in the first week). The route itself is deleted when
 * a trip ends, so this one number is kept instead.
 */
async function recordFarthest(tripRef: DocRef, before: DocData, after: DocData): Promise<void> {
  if (!isOpenStatus(after.status)) return;
  const here = readLocation(after.lastLocation);
  const start = readLocation(after.startLocation);
  if (!here || !start || toMillis(after.lastUpdate) === toMillis(before.lastUpdate)) return;
  const metres = Math.round(distanceMeters(start, here));
  if (metres <= (typeof after.farthestFromStartM === 'number' ? after.farthestFromStartM : 0)) return;

  // Two positions close together must not leave the nearer one recorded
  await admin.firestore().runTransaction(async (tx) => {
    const now = (await tx.get(tripRef)).data();
    const sofar = typeof now?.farthestFromStartM === 'number' ? now.farthestFromStartM : 0;
    if (now && metres > sofar) tx.update(tripRef, { farthestFromStartM: metres });
  });
}

async function recordPath(tripRef: DocRef, before: DocData, after: DocData): Promise<void> {
  const db = admin.firestore();
  const sharedRef = db.doc(`sharedTrips/${tripRef.id}`);

  if (!isOpenStatus(after.status)) {
    if (isOpenStatus(before.status)) {
      await db.runTransaction(async (tx) => {
        const snap = await tx.get(sharedRef);
        if (snap.exists && snap.data()!.path !== undefined) tx.update(sharedRef, { path: FieldValue.delete() });
      });
    }
    return;
  }

  const here = readLocation(after.lastLocation);
  const atMs = toMillis(after.lastUpdate);
  const hasNewPosition = !!here && atMs != null && atMs !== toMillis(before.lastUpdate);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(sharedRef);
    // The app creates the share document; never create it here, or the app's own write would be refused
    if (!snap.exists) return;
    const shared = snap.data()!;
    const update: DocData = {};

    // An empty name is stored when none is known, so this is looked up once per trip
    if (typeof shared.name !== 'string') {
      const { name } = await getSenderProfile(uidFromRef(tripRef));
      update.name = name === UNKNOWN_NAME ? '' : name;
    }

    if (hasNewPosition) {
      let path = readPath(shared.path);
      const seeded = path.length === 0;
      if (seeded) {
        // Begin at the point the trip started from, when the phone had one
        const start = readLocation(after.startLocation);
        const startMs = toMillis(after.startTime);
        if (start && startMs != null && startMs < atMs!) path = [{ ...start, at: startMs }];
      }
      const next = addPathPoint(path, { ...here!, at: atMs! });
      if (next) update.path = next;
      else if (seeded && path.length > 0) update.path = path;
    }

    if (Object.keys(update).length > 0) tx.update(sharedRef, update);
  });
}

/**
 * Fires on every change to a trip.
 *
 * Keeps the path on the share document in step with the trip's position, and
 * tells contacts who were told someone is overdue when that person turns up
 * (an overdue trip ended or extended).
 */
export const onTripUpdated = functions.firestore
  .document('users/{uid}/trips/{tripId}')
  .onUpdate(async (change) => {
    const before = change.before.data();
    const after = change.after.data();
    const ref = change.after.ref;
    const db = admin.firestore();

    const contactIds: string[] | null = after.trustedContactIds ?? null;

    // Never let the map get in the way of the alerts below
    await recordPath(ref, before, after)
      .catch((err) => console.error(`Could not update the path of trip ${ref.id}`, err));
    await recordFarthest(ref, before, after)
      .catch((err) => console.error(`Could not record how far trip ${ref.id} went`, err));

    // Traveller ended the trip themselves (not the hourly auto-expiry)
    const endedByUser = after.status === 'completed'
      || (after.status === 'cancelled' && after.cancellationReason !== 'auto_expired');

    // An SOS went out to contacts; tell them the traveller has closed it
    if (before.status === 'emergency') {
      if (endedByUser) await sendAllClearOnce(ref, contactIds, 'sos_ended');
      return null;
    }

    if (before.status !== 'active') return null;

    const beforeEnds = toMillis(before.endsAt);
    const afterEnds = toMillis(after.endsAt);
    const wasFlagged = !!(before.overdueAt || before.overdueWarnedAt);
    const contactsWereTold = wasAlertDelivered(before.overdueAlertState);

    // Traveller added time after the deadline: re-arm the alarm
    const extended = after.status === 'active'
      && beforeEnds != null && afterEnds != null && afterEnds > beforeEnds;
    if (extended && wasFlagged) {
      await Promise.all([
        ref.update(OVERDUE_RESET()),
        db.doc(`sharedTrips/${ref.id}`).set(
          { overdueAt: FieldValue.delete() },
          { merge: true }
        ),
      ]);
      if (contactsWereTold) await sendAllClear(ref, contactIds, 'extended', afterEnds);
      return null;
    }

    if (endedByUser && contactsWereTold) {
      await sendAllClearOnce(ref, contactIds, 'ended');
    }

    return null;
  });

/** Standalone safety timer acknowledged after contacts were alerted. */
export const onSafetyTimerUpdated = functions.firestore
  .document('users/{uid}/safetyTimers/{timerId}')
  .onUpdate(async (change) => {
    const before = change.before.data();
    const after = change.after.data();

    if (before.acknowledged !== false || after.acknowledged !== true) return null;
    if (after.tripId || !wasAlertDelivered(before.overdueAlertState)) return null;

    await sendAllClear(change.after.ref, null, 'checked_in');
    return null;
  });

// -----------------------------------------------------------------------------
// SOS
// -----------------------------------------------------------------------------

/** A trip location this recent is treated as where the traveller is now. */
const LIVE_LOCATION_MS = 5 * 60 * 1000;

const SOS_SEND_ATTEMPTS = 3;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

interface SosLocation {
  lat: number;
  lng: number;
  /** Set when the position is older than the SOS itself */
  atMs: number | null;
}

function readLocation(loc: any): { lat: number; lng: number } | null {
  return loc && typeof loc.lat === 'number' && typeof loc.lng === 'number'
    ? { lat: loc.lat, lng: loc.lng }
    : null;
}

/**
 * Best position for an SOS. The app creates the alert at once and attaches a
 * GPS fix a few seconds later, so when nothing recent is known we wait
 * briefly for that fix before falling back to older data.
 */
async function resolveSosLocation(
  alertRef: DocRef,
  alertData: DocData,
  trip: DocData | null
): Promise<SosLocation | null> {
  const fromAlert = readLocation(alertData.location);
  if (fromAlert) return { ...fromAlert, atMs: null };

  const fromTrip = readLocation(trip?.lastLocation);
  const tripUpdateMs = toMillis(trip?.lastUpdate);
  if (fromTrip && tripUpdateMs && Date.now() - tripUpdateMs <= LIVE_LOCATION_MS) {
    return { ...fromTrip, atMs: null };
  }

  const waitMs = getNumberSetting('SOS_LOCATION_WAIT_MS', 8000);
  const stepMs = 2000;
  for (let waited = 0; waited < waitMs; waited += stepMs) {
    await sleep(Math.min(stepMs, waitMs - waited));
    const late = readLocation((await alertRef.get()).data()?.location);
    if (late) return { ...late, atMs: null };
  }

  return fromTrip ? { ...fromTrip, atMs: tripUpdateMs } : null;
}

/**
 * SOS alert created: message trusted contacts with the best known location.
 * Runs on the server so it still goes out if the app is closed or suspended
 * right after the button is pressed.
 */
export const onSOSAlert = functions
  .runWith({ timeoutSeconds: 120 })
  .firestore
  .document('users/{uid}/alerts/{alertId}')
  .onCreate(async (snapshot, context) => {
    const alertData = snapshot.data();
    if (alertData.type !== 'sos') return null;

    const db = admin.firestore();
    const uid = context.params.uid as string;
    const ref = snapshot.ref;

    const claimed = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists || snap.data()?.smsState) return false;
      tx.update(ref, { smsState: 'sending' });
      return true;
    });
    if (!claimed) return null;

    const tripId: string | null = typeof alertData.tripId === 'string' ? alertData.tripId : null;
    let trip: DocData | null = null;

    if (tripId) {
      const tripRef = db.doc(`users/${uid}/trips/${tripId}`);
      const tripSnap = await tripRef.get();
      if (tripSnap.exists) {
        trip = tripSnap.data()!;
        // Make sure the trip shows as an emergency and its link stays readable,
        // even if the app did not manage to update it
        const keepUntil = Timestamp.fromMillis(Date.now() + OVERDUE_LINK_MS);
        const stillOpen = trip.status === 'active' || trip.status === 'emergency';
        const update = { expiresAt: keepUntil, ...(stillOpen ? { status: 'emergency' } : {}) };
        await Promise.all([
          tripRef.update({ ...update, sosAlertState: 'sending' }),
          db.doc(`sharedTrips/${tripId}`).set({ ...update, ...travelModeForContacts(trip) }, { merge: true }),
        ]);
      }
    }

    // The trip card reads the outcome from the trip, so it says what was actually sent
    const recordOnTrip = async (state: string, sent: number, total: number) => {
      if (!trip || !tripId) return;
      await db.doc(`users/${uid}/trips/${tripId}`)
        .update({ sosAlertState: state, sosAlertSent: sent, sosAlertTotal: total })
        .catch((err) => console.warn(`Could not record the SOS outcome on trip ${tripId}`, err));
    };

    const contacts = (await getTrustedContacts(uid)).filter((c) => c.notifyOnSOS !== false);
    if (contacts.length === 0) {
      await ref.update({ smsState: 'no_contacts' });
      await recordOnTrip('no_contacts', 0, 0);
      return null;
    }

    const sender = await getSenderProfile(uid);
    if (!sender.canSend) {
      await ref.update({ smsState: 'blocked', smsError: sender.blockReason ?? null });
      await recordOnTrip('blocked', 0, contacts.length);
      return null;
    }

    const rate = await checkAndIncrementRateLimit(uid, 'sos', contacts.length);
    if (!rate.allowed && rate.reason === 'limit') {
      await ref.update({ smsState: 'failed', smsError: 'rate_limited' });
      await recordOnTrip('failed', 0, contacts.length);
      return null;
    }

    const location = await resolveSosLocation(ref, alertData, trip);
    const messageBody = markAsTest(buildSosMessage({
      userName: sender.name,
      lat: location?.lat ?? null,
      lng: location?.lng ?? null,
      locationAtMs: location?.atMs ?? null,
      // Only link to a trip the contacts can actually open
      token: trip ? tripId : null,
    }), trip?.isTest === true);
    const recipients: Recipient[] = contacts.map((c) => ({ id: c.id, name: c.name, phoneE164: c.phoneE164 }));

    // Nothing else retries an SOS, so retry here when the provider rejects it
    let delivery: DeliveryResult | null = null;
    for (let attempt = 1; attempt <= SOS_SEND_ATTEMPTS; attempt++) {
      delivery = await deliverSafetySms({
        uid,
        type: 'sos',
        recipients,
        messageBody,
        payload: { alertId: ref.id, tripId, lat: location?.lat ?? null, lng: location?.lng ?? null, attempt },
      });
      if (delivery.status !== 'failed') break;
      if (attempt < SOS_SEND_ATTEMPTS) await sleep(attempt * getNumberSetting('SOS_RETRY_DELAY_MS', 3000));
    }

    await ref.update({
      smsState: delivery!.status,
      notifiedContacts: delivery!.sent > 0 ? contacts.map((c) => c.id) : [],
    });
    await recordOnTrip(delivery!.status, delivery!.sent, recipients.length);
    return null;
  });
