/**
 * Deleting an account, from the app's "Delete account" button.
 *
 * Everything held about the person goes at once: their profile, contacts,
 * trips and positions, trip links, the road reports, comments and votes they
 * posted, their photos, and the sign-in itself.
 *
 * One thing is kept: the log of texts sent to their contacts, for
 * LOG_RETENTION_DAYS, in case a contact disputes a message or the SMS
 * provider's bill needs checking. Each log entry is stamped with the date it
 * may go, and Firestore deletes it then (the time-to-live rule on
 * `deleteAfter` in firestore.indexes.json).
 *
 * The sign-in is deleted last. If a step fails before that, the person is
 * still signed in and can try again: every step finds what is left and
 * deletes it, so repeating one does no harm.
 */

import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

export const LOG_RETENTION_DAYS = 90;

/**
 * How recently the person must have signed in. The app asks for the password
 * again before deleting, so that a phone left unlocked is not enough.
 */
export const RECENT_SIGN_IN_SECONDS = 10 * 60;

const DAY_MS = 24 * 60 * 60 * 1000;
// A Firestore batch takes 500 writes at most
const BATCH_SIZE = 400;

type Query = FirebaseFirestore.Query;

/** Deletes everything a query finds, a batch at a time. */
async function deleteAll(query: Query): Promise<number> {
  const db = admin.firestore();
  let deleted = 0;
  for (;;) {
    const found = await query.limit(BATCH_SIZE).get();
    if (found.empty) return deleted;
    const batch = db.batch();
    found.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    deleted += found.size;
  }
}

/** Marks the texts sent for this person so that Firestore deletes them after the retention period. */
async function scheduleLogDeletion(uid: string, nowMs: number): Promise<number> {
  const db = admin.firestore();
  const stamp = {
    accountDeletedAt: Timestamp.fromMillis(nowMs),
    deleteAfter: Timestamp.fromMillis(nowMs + LOG_RETENTION_DAYS * DAY_MS),
  };

  const logs = await db.collection('safetyMessageLogs').where('uid', '==', uid).get();
  // An earlier attempt may have stamped some already; its date stands
  const unstamped = logs.docs.filter((doc) => !doc.data().deleteAfter);
  for (let i = 0; i < unstamped.length; i += BATCH_SIZE) {
    const batch = db.batch();
    unstamped.slice(i, i + BATCH_SIZE).forEach((doc) => batch.update(doc.ref, stamp));
    await batch.commit();
  }
  return logs.size;
}

/** The person's road reports, and what other people attached to them. */
async function deleteReports(uid: string): Promise<number> {
  const db = admin.firestore();
  let deleted = 0;
  for (;;) {
    const reports = await db.collection('reports').where('uid', '==', uid).limit(50).get();
    if (reports.empty) return deleted;
    for (const report of reports.docs) {
      await deleteAll(db.collection('comments').where('reportId', '==', report.id));
      await deleteAll(db.collection('votes').where('reportId', '==', report.id));
      await deleteAll(db.collection('flags').where('targetId', '==', report.id));
      // Takes the report's own resolution votes with it
      await db.recursiveDelete(report.ref);
      deleted += 1;
    }
  }
}

export interface DeletedCounts {
  reports: number;
  comments: number;
  votes: number;
  tripLinks: number;
  messageLogsKept: number;
}

/**
 * Deletes what is stored about one person. The sign-in is not touched here;
 * the caller deletes it afterwards.
 */
export async function deleteAccountData(uid: string, nowMs: number = Date.now()): Promise<DeletedCounts> {
  const db = admin.firestore();

  const messageLogsKept = await scheduleLogDeletion(uid, nowMs);

  const reports = await deleteReports(uid);
  await admin.storage().bucket().deleteFiles({ prefix: `report_photos/${uid}/` });

  // What they added to other people's reports
  const comments = await deleteAll(db.collection('comments').where('uid', '==', uid));
  const votes = await deleteAll(db.collection('votes').where('uid', '==', uid));
  await deleteAll(db.collection('flags').where('reporterId', '==', uid));
  await deleteAll(db.collectionGroup('resolutionVotes').where('uid', '==', uid));

  const tripLinks = await deleteAll(db.collection('sharedTrips').where('uid', '==', uid));
  await db.doc(`pushSubscriptions/${uid}`).delete();
  await deleteAll(db.collection('usernames').where('uid', '==', uid));

  // The profile with everything under it: contacts, trips, alerts, timers,
  // check-ins, points. It goes last so that the app, which reads the profile
  // while this runs, sees it disappear only when the rest is done.
  await db.recursiveDelete(db.doc(`users/${uid}`));

  return { reports, comments, votes, tripLinks, messageLogsKept };
}

/** A trip or timer that could still alert the person's contacts. */
async function hasTripRunning(uid: string, nowMs: number): Promise<boolean> {
  const db = admin.firestore();
  const [trips, timers] = await Promise.all([
    db.collection(`users/${uid}/trips`).where('status', 'in', ['active', 'emergency']).limit(1).get(),
    db.collection(`users/${uid}/safetyTimers`).where('acknowledged', '==', false).limit(50).get(),
  ]);
  // A timer that ran out and was never answered has done all it will do
  const countingDown = timers.docs.some((doc) => (doc.data().expiresAt?.toMillis?.() ?? 0) > nowMs);
  return !trips.empty || countingDown;
}

export const deleteMyAccount = functions
  // Switch on once App Check is registered for the app (see docs/SAFETY-ALERTS-SETUP.md)
  .runWith({ enforceAppCheck: process.env.ENFORCE_APP_CHECK === 'true', timeoutSeconds: 300 })
  .https.onCall(async (_data: unknown, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
    }
    if (context.auth.token.firebase?.sign_in_provider === 'anonymous') {
      throw new functions.https.HttpsError('permission-denied', 'There is no account to delete');
    }

    const uid = context.auth.uid;
    const signedInAt = context.auth.token.auth_time;
    if (typeof signedInAt !== 'number' || Date.now() / 1000 - signedInAt > RECENT_SIGN_IN_SECONDS) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Sign in again to delete your account',
        { reason: 'recent-sign-in-required' }
      );
    }

    // Deleting now would leave contacts with an alert, or a link, that leads nowhere
    if (await hasTripRunning(uid, Date.now())) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'End your trip before deleting your account',
        { reason: 'trip-running' }
      );
    }

    const counts = await deleteAccountData(uid);
    try {
      await admin.auth().deleteUser(uid);
    } catch (error: any) {
      // Already gone: an earlier attempt got this far
      if (error?.code !== 'auth/user-not-found') throw error;
    }

    console.log(
      `Account deleted: ${counts.reports} reports, ${counts.comments} comments, ${counts.votes} votes, ` +
      `${counts.tripLinks} trip links; ${counts.messageLogsKept} message logs kept for ${LOG_RETENTION_DAYS} days`
    );
    return { deleted: true };
  });
