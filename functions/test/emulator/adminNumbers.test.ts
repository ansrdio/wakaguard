/**
 * The owner's Numbers page against the Firestore and Auth emulators.
 * Run with: npm run test:monitor
 */
process.env.NUMBERS_LEAVE_OUT = 'numbers_owner';

import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as admin from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { adminNumbers } from '../../src/index';
import { lagosDate } from '../../src/adminNumbersPlan';

const db = () => admin.firestore();
const run = Date.now();
const call = (token: Record<string, unknown> | null) =>
  (adminNumbers as any).run({}, token ? { auth: { uid: 'numbers_admin', token } } : {});

async function refusal(promise: Promise<unknown>): Promise<{ code?: string }> {
  try {
    await promise;
  } catch (err: any) {
    return err;
  }
  throw new Error('expected a refusal');
}

test('only an account with the admin claim gets the numbers', async () => {
  assert.equal((await refusal(call(null))).code, 'permission-denied');
  assert.equal((await refusal(call({ admin: false }))).code, 'permission-denied');
  assert.equal((await refusal(call({ email: 'someone@example.com' }))).code, 'permission-denied');
});

test("the numbers count people, trips and texts, leaving out the owner's accounts", async () => {
  // Other test files share the emulators and run at the same time, so this
  // one dates its trips and texts twelve days back and gives its phones app
  // builds nobody else uses, and checks those exactly
  const then = Date.now() - 12 * 24 * 60 * 60 * 1000;
  const thatDay = (n: any) => n.days.find((d: any) => d.date === lagosDate(then));
  const phonesOn = (n: any, build: number) => n.phones.find((p: any) => p.build === build)?.count ?? 0;
  const before = await call({ admin: true });

  // A tester who signed up with an email and started a real trip that went overdue
  const tester = await admin.auth().createUser({ email: `numbers-${run}@example.com`, password: 'not-a-real-one' });
  await db().doc(`users/${tester.uid}`).set({ username: `tester_${run}` });
  await db().doc(`users/${tester.uid}/trips/t1`).set({ startTime: Timestamp.fromMillis(then), isTest: false, overdueAt: Timestamp.fromMillis(then) });
  await db().doc(`users/${tester.uid}/trips/t2`).set({ startTime: Timestamp.fromMillis(then), isTest: true });
  await db().collection('safetyMessageLogs').add({
    uid: tester.uid,
    provider: 'termii',
    providerResult: [{ sid: 'x1', error: null, provider: 'termii' }, { sid: 'x2', error: null, provider: 'termii' }],
    createdAt: Timestamp.fromMillis(then),
  });
  await db().doc(`pushSubscriptions/${tester.uid}`).set({ platform: 'android', appBuild: 9001 });

  // The owner's own account, left out of everything
  const owner = await admin.auth().createUser({ email: `owner-${run}@example.com`, password: 'not-a-real-one' });
  await db().doc(`users/${owner.uid}`).set({ username: 'Numbers_Owner' });
  await db().doc(`users/${owner.uid}/trips/o1`).set({ startTime: Timestamp.fromMillis(then), isTest: false });
  await db().collection('safetyMessageLogs').add({
    uid: owner.uid,
    provider: 'termii',
    providerResult: [{ sid: 'o1', error: null, provider: 'termii' }],
    createdAt: Timestamp.fromMillis(then),
  });
  await db().doc(`pushSubscriptions/${owner.uid}`).set({ platform: 'android', appBuild: 9002 });

  // An SOS counts; a checkpoint stop in the same collection does not
  await db().doc(`users/${tester.uid}/alerts/a1`).set({ type: 'sos', createdAt: Timestamp.fromMillis(then) });
  await db().doc(`users/${tester.uid}/alerts/a2`).set({ type: 'checkpoint_stop', createdAt: Timestamp.fromMillis(then) });

  // An anonymous sign-in, as the old RoutePulse app made
  await admin.auth().createUser({});

  const after = await call({ admin: true });
  assert.ok(after.people.accounts >= before.people.accounts + 1);
  assert.ok(after.people.last24h >= before.people.last24h + 1);
  assert.ok(after.oldAnonymous >= before.oldAnonymous + 1);
  assert.ok(after.leftOut >= 1);
  assert.equal(thatDay(after).realTrips, thatDay(before).realTrips + 1, "the owner's trip is not counted");
  assert.equal(thatDay(after).testTrips, thatDay(before).testTrips + 1);
  assert.equal(thatDay(after).overdue, thatDay(before).overdue + 1);
  assert.equal(thatDay(after).people, thatDay(before).people + 1);
  assert.equal(thatDay(after).sos, thatDay(before).sos + 1, 'only the SOS, not the checkpoint stop');
  assert.equal(thatDay(after).texts, thatDay(before).texts + 2, "the owner's text is not counted");
  assert.equal(phonesOn(after, 9001), 1);
  assert.equal(phonesOn(after, 9002), 0, "the owner's phone is not counted");
  assert.equal(after.database, null, 'no Google Cloud figures against the emulators');

  // Nothing personal comes back
  const everything = JSON.stringify(after);
  for (const secret of [tester.uid, owner.uid, `numbers-${run}@example.com`, `tester_${run}`]) {
    assert.ok(!everything.includes(secret), `the answer must not include ${secret}`);
  }
});
