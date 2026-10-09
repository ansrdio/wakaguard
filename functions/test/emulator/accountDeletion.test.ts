/**
 * Deleting an account, against the Firestore, Auth and Storage emulators.
 * Run with: npm run test:monitor
 */
process.env.SMS_PROVIDER = 'mock';
// Outside the Functions runtime nothing says which bucket holds the photos
process.env.FIREBASE_CONFIG ??= JSON.stringify({
  projectId: process.env.GCLOUD_PROJECT,
  storageBucket: `${process.env.GCLOUD_PROJECT}.appspot.com`,
});

import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import * as admin from 'firebase-admin';
import { deleteMyAccount } from '../../src/index';
import { deleteAccountData, LOG_RETENTION_DAYS, RECENT_SIGN_IN_SECONDS } from '../../src/accountDeletion';

const MIN = 60 * 1000;
const DAY = 24 * 60 * MIN;
const ts = (ms: number) => admin.firestore.Timestamp.fromMillis(ms);
const db = () => admin.firestore();
const bucket = () => admin.storage().bucket();
let seq = 0;

before(() => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'Firestore emulator must be running');
  assert.ok(process.env.FIREBASE_AUTH_EMULATOR_HOST, 'Auth emulator must be running');
  assert.ok(process.env.FIREBASE_STORAGE_EMULATOR_HOST, 'Storage emulator must be running');
});

const exists = async (path: string) => (await db().doc(path).get()).exists;
const count = async (query: FirebaseFirestore.Query) => (await query.get()).size;
const signedIn = async (uid: string) => admin.auth().getUser(uid).then(() => true, () => false);

/** Calls the function the way the app does, with a sign-in of the given age. */
const callAs = (uid: string, signedInSecondsAgo = 5, provider = 'password') =>
  (deleteMyAccount as any).run({}, {
    auth: {
      uid,
      token: {
        auth_time: Math.floor(Date.now() / 1000) - signedInSecondsAgo,
        firebase: { sign_in_provider: provider },
      },
    },
  });

async function refusal(call: Promise<unknown>) {
  try {
    await call;
  } catch (error: any) {
    return { code: error.code as string, reason: error.details?.reason as string | undefined };
  }
  return assert.fail('The call should have been refused');
}

/** A person with something in every place the app keeps things. */
async function makePerson() {
  const uid = `person_${Date.now()}_${seq++}`;
  const username = `ada${Date.now()}${seq}`;
  const now = Date.now();
  await admin.auth().createUser({ uid, email: `${uid}@example.com`, emailVerified: true });

  await db().doc(`users/${uid}`).set({ username, alertName: 'Ada', points: 30 });
  await db().doc(`usernames/${username}`).set({ uid, usernameLower: username });
  await db().doc(`users/${uid}/trustedContacts/c0`).set({ name: 'Tobi', phoneE164: '+2348030000001' });
  await db().doc(`users/${uid}/pointHistory/p0`).set({ action: 'report', points: 10, createdAt: ts(now) });
  await db().doc(`users/${uid}/rateLimits/sms`).set({ count: 1 });
  await db().doc(`users/${uid}/alerts/a0`).set({ type: 'sos', smsState: 'sent' });
  await db().doc(`users/${uid}/checkIns/k0`).set({ createdAt: ts(now) });
  await db().doc(`pushSubscriptions/${uid}`).set({ uid, fcmToken: 'token', platform: 'android' });

  const tripId = `trip_${now}_${seq++}_padding`;
  await db().doc(`users/${uid}/trips/${tripId}`).set({
    uid, status: 'completed', destination: 'Ibadan', lastLocation: { lat: 7.37, lng: 3.94 },
  });
  await db().doc(`sharedTrips/${tripId}`).set({ uid, tripId, status: 'completed', expiresAt: ts(now - MIN) });

  const logId = `log_${now}_${seq++}`;
  await db().doc(`safetyMessageLogs/${logId}`).set({
    uid, type: 'overdue', status: 'sent', messageBody: 'WakaGuard: Ada has not checked in',
    recipients: [{ name: 'Tobi', phoneE164: '+2348030000001' }], createdAt: ts(now - DAY),
  });

  return { uid, username, tripId, logId };
}

async function makeReport(uid: string) {
  const id = `report_${Date.now()}_${seq++}`;
  await db().doc(`reports/${id}`).set({ uid, type: 'pothole', status: 'active', description: 'Deep pothole' });
  return id;
}

test('deleting an account removes everything about the person and leaves other people alone', async () => {
  const ada = await makePerson();
  const bola = await makePerson();

  // Ada's report, with what Bola attached to it, and a photo
  const adasReport = await makeReport(ada.uid);
  await db().doc(`reports/${adasReport}/resolutionVotes/${bola.uid}`).set({ uid: bola.uid, voteType: 'resolved' });
  await db().doc(`comments/on_adas_${adasReport}`).set({ uid: bola.uid, reportId: adasReport, text: 'Still there' });
  await db().doc(`votes/${bola.uid}_${adasReport}`).set({ uid: bola.uid, reportId: adasReport, value: 1 });
  await db().doc(`flags/on_adas_${adasReport}`).set({ reporterId: bola.uid, targetId: adasReport, targetType: 'report' });
  const adasPhoto = `report_photos/${ada.uid}/${adasReport}/photo.jpg`;
  await bucket().file(adasPhoto).save(Buffer.from('ada'), { contentType: 'image/jpeg' });

  // Bola's report, with what Ada attached to it, and a photo
  const bolasReport = await makeReport(bola.uid);
  await db().doc(`reports/${bolasReport}/resolutionVotes/${ada.uid}`).set({ uid: ada.uid, voteType: 'still_there' });
  await db().doc(`reports/${bolasReport}/resolutionVotes/${bola.uid}`).set({ uid: bola.uid, voteType: 'still_there' });
  await db().doc(`comments/by_ada_${bolasReport}`).set({ uid: ada.uid, reportId: bolasReport, text: 'Thanks' });
  await db().doc(`comments/by_bola_${bolasReport}`).set({ uid: bola.uid, reportId: bolasReport, text: 'Mine' });
  await db().doc(`votes/${ada.uid}_${bolasReport}`).set({ uid: ada.uid, reportId: bolasReport, value: 1 });
  await db().doc(`flags/by_ada_${bolasReport}`).set({ reporterId: ada.uid, targetId: bolasReport, targetType: 'report' });
  const bolasPhoto = `report_photos/${bola.uid}/${bolasReport}/photo.jpg`;
  await bucket().file(bolasPhoto).save(Buffer.from('bola'), { contentType: 'image/jpeg' });

  const before = Date.now();
  assert.deepEqual(await callAs(ada.uid), { deleted: true });

  // Ada: the sign-in, the profile and everything under it
  assert.equal(await signedIn(ada.uid), false);
  assert.equal(await exists(`users/${ada.uid}`), false);
  for (const sub of ['trustedContacts', 'trips', 'pointHistory', 'rateLimits', 'alerts', 'checkIns']) {
    assert.equal(await count(db().collection(`users/${ada.uid}/${sub}`)), 0, `${sub} should be empty`);
  }
  assert.equal(await exists(`usernames/${ada.username}`), false);
  assert.equal(await exists(`pushSubscriptions/${ada.uid}`), false);
  assert.equal(await exists(`sharedTrips/${ada.tripId}`), false);

  // Ada's report and what hung from it
  assert.equal(await exists(`reports/${adasReport}`), false);
  assert.equal(await count(db().collection(`reports/${adasReport}/resolutionVotes`)), 0);
  assert.equal(await exists(`comments/on_adas_${adasReport}`), false);
  assert.equal(await exists(`votes/${bola.uid}_${adasReport}`), false);
  assert.equal(await exists(`flags/on_adas_${adasReport}`), false);
  assert.deepEqual(await bucket().file(adasPhoto).exists(), [false]);

  // What Ada left on Bola's report
  assert.equal(await exists(`reports/${bolasReport}/resolutionVotes/${ada.uid}`), false);
  assert.equal(await exists(`comments/by_ada_${bolasReport}`), false);
  assert.equal(await exists(`votes/${ada.uid}_${bolasReport}`), false);
  assert.equal(await exists(`flags/by_ada_${bolasReport}`), false);

  // The log of texts sent for Ada is kept, with the date it goes
  const log = (await db().doc(`safetyMessageLogs/${ada.logId}`).get()).data()!;
  assert.equal(log.messageBody, 'WakaGuard: Ada has not checked in');
  const keptForMs = log.deleteAfter.toMillis() - before;
  assert.ok(Math.abs(keptForMs - LOG_RETENTION_DAYS * DAY) < MIN, `kept for ${keptForMs / DAY} days`);
  assert.ok(log.accountDeletedAt.toMillis() >= before - 1000);

  // Bola is untouched
  assert.equal(await signedIn(bola.uid), true);
  assert.equal(await exists(`users/${bola.uid}`), true);
  assert.equal(await exists(`users/${bola.uid}/trustedContacts/c0`), true);
  assert.equal(await exists(`usernames/${bola.username}`), true);
  assert.equal(await exists(`pushSubscriptions/${bola.uid}`), true);
  assert.equal(await exists(`sharedTrips/${bola.tripId}`), true);
  assert.equal(await exists(`reports/${bolasReport}`), true);
  assert.equal(await exists(`reports/${bolasReport}/resolutionVotes/${bola.uid}`), true);
  assert.equal(await exists(`comments/by_bola_${bolasReport}`), true);
  assert.deepEqual(await bucket().file(bolasPhoto).exists(), [true]);
  const bolasLog = (await db().doc(`safetyMessageLogs/${bola.logId}`).get()).data()!;
  assert.equal(bolasLog.deleteAfter, undefined);
});

test('the password has to have been given in the last few minutes', async () => {
  const { uid } = await makePerson();

  assert.deepEqual(await refusal(callAs(uid, RECENT_SIGN_IN_SECONDS + 60)), {
    code: 'failed-precondition',
    reason: 'recent-sign-in-required',
  });
  assert.equal(await signedIn(uid), true);
  assert.equal(await exists(`users/${uid}/trustedContacts/c0`), true);
});

test('an account cannot be deleted while a trip is running', async () => {
  const { uid } = await makePerson();
  const tripRef = db().doc(`users/${uid}/trips/running_${seq++}`);

  for (const status of ['active', 'emergency']) {
    await tripRef.set({ uid, status });
    assert.deepEqual(await refusal(callAs(uid)), { code: 'failed-precondition', reason: 'trip-running' });
    assert.equal(await signedIn(uid), true);
    assert.equal(await exists(`users/${uid}`), true);
  }

  // Once the trip is ended the account can go
  await tripRef.update({ status: 'completed' });
  assert.deepEqual(await callAs(uid), { deleted: true });
  assert.equal(await signedIn(uid), false);
});

test('a timer still counting down blocks deletion; one that ran out long ago does not', async () => {
  const { uid } = await makePerson();
  const timerRef = db().doc(`users/${uid}/safetyTimers/t0`);

  await timerRef.set({ acknowledged: false, expiresAt: ts(Date.now() + 10 * MIN) });
  assert.deepEqual(await refusal(callAs(uid)), { code: 'failed-precondition', reason: 'trip-running' });

  await timerRef.set({ acknowledged: false, expiresAt: ts(Date.now() - 3 * DAY) });
  assert.deepEqual(await callAs(uid), { deleted: true });
  assert.equal(await exists(`users/${uid}/safetyTimers/t0`), false);
});

test('someone who is not signed in to an account has nothing to delete', async () => {
  const { uid } = await makePerson();

  assert.equal((await refusal((deleteMyAccount as any).run({}, {}))).code, 'unauthenticated');
  assert.equal((await refusal(callAs(uid, 5, 'anonymous'))).code, 'permission-denied');
  assert.equal(await signedIn(uid), true);
});

test('trying again after a failure is safe, and does not move the date the logs go', async () => {
  const { uid, logId } = await makePerson();
  const firstTry = Date.now() - 10 * DAY;

  // The first attempt got as far as the data but not the sign-in
  await deleteAccountData(uid, firstTry);
  assert.equal(await signedIn(uid), true);
  assert.equal(await exists(`users/${uid}`), false);

  assert.deepEqual(await callAs(uid), { deleted: true });
  assert.equal(await signedIn(uid), false);
  const log = (await db().doc(`safetyMessageLogs/${logId}`).get()).data()!;
  assert.equal(log.deleteAfter.toMillis(), firstTry + LOG_RETENTION_DAYS * DAY);
});
