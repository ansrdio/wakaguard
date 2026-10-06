/**
 * End-to-end checks for the safety monitor against the Firestore emulator.
 * Run with: npm run test:monitor
 * SMS goes through the provider mock, so nothing is actually sent.
 */
process.env.TWILIO_MOCK = 'true';
process.env.TWILIO_ACCOUNT_SID = 'ACtest';
process.env.TWILIO_AUTH_TOKEN = 'test';
process.env.TWILIO_FROM_NUMBER = '+15005550006';

import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import * as admin from 'firebase-admin';
import { checkOverdueTrips, onTripUpdated, onSafetyTimerUpdated, onSOSAlert } from '../../src/index';

const MIN = 60 * 1000;
const ts = (ms: number) => admin.firestore.Timestamp.fromMillis(ms);
const db = () => admin.firestore();
let seq = 0;

before(() => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'Firestore emulator must be running');
});

async function makeUser(opts: { contacts?: number } = {}) {
  const uid = `user_${Date.now()}_${seq++}`;
  await db().doc(`users/${uid}`).set({ displayName: 'Ada' });
  const contactIds: string[] = [];
  for (let i = 0; i < (opts.contacts ?? 1); i++) {
    const ref = await db().collection(`users/${uid}/trustedContacts`).add({
      name: `Contact ${i}`,
      phoneE164: `+23480000000${i}${seq % 10}`,
    });
    contactIds.push(ref.id);
  }
  return { uid, contactIds };
}

async function makeTrip(uid: string, contactIds: string[], fields: Record<string, unknown>) {
  const tripId = `trip_${Date.now()}_${seq++}`;
  const now = Date.now();
  await db().doc(`users/${uid}/trips/${tripId}`).set({
    uid,
    shareToken: tripId,
    status: 'active',
    destination: 'Benin City',
    expiresAt: ts(now + 60 * MIN),
    lastLocation: { lat: 6.7, lng: 4.9 },
    lastUpdate: ts(now - 41 * MIN),
    trustedContactIds: contactIds,
    shouldNotifyContacts: true,
    notifiedContacts: [],
    ...fields,
  });
  await db().doc(`sharedTrips/${tripId}`).set({
    uid,
    tripId,
    status: 'active',
    expiresAt: ts(now + 60 * MIN),
    lastLocation: { lat: 6.7, lng: 4.9 },
    lastUpdate: ts(now - 41 * MIN),
    destination: 'Benin City',
    createdAt: ts(now - 120 * MIN),
    endsAt: fields.endsAt ?? null,
  });
  return tripId;
}

const runMonitor = () => (checkOverdueTrips as any).run({}, {});
const trip = async (uid: string, id: string) => (await db().doc(`users/${uid}/trips/${id}`).get()).data()!;
const logs = async (uid: string, type: string) =>
  (await db().collection('safetyMessageLogs').where('uid', '==', uid).where('type', '==', type).get()).docs.map((d) => d.data());

/** Apply an update the way a client would, then fire the trigger with before/after. */
async function updateAndTrigger(trigger: any, path: string, update: Record<string, unknown>, params: Record<string, string>) {
  const ref = db().doc(path);
  const beforeSnap = await ref.get();
  await ref.update(update);
  const afterSnap = await ref.get();
  await trigger.run({ before: beforeSnap, after: afterSnap }, { params });
}

test('trip just past its deadline: traveller is warned, contacts are not alerted yet', async () => {
  const { uid, contactIds } = await makeUser();
  const id = await makeTrip(uid, contactIds, { endsAt: ts(Date.now() - 1 * MIN) });

  await runMonitor();

  const t = await trip(uid, id);
  assert.ok(t.overdueWarnedAt, 'warning recorded');
  assert.equal(t.overdueAlertState, undefined);
  assert.equal((await logs(uid, 'overdue')).length, 0);
});

test('trip past the grace period: contacts are alerted exactly once and the link is kept alive', async () => {
  const { uid, contactIds } = await makeUser({ contacts: 2 });
  const id = await makeTrip(uid, contactIds, { endsAt: ts(Date.now() - 10 * MIN) });

  await runMonitor();
  await runMonitor();

  const t = await trip(uid, id);
  assert.equal(t.overdueAlertState, 'sent');
  assert.equal(t.overdueAlertAttempts, 1);
  assert.deepEqual([...t.notifiedContacts].sort(), [...contactIds].sort());

  const sent = await logs(uid, 'overdue');
  assert.equal(sent.length, 1, 'one message batch, not one per run');
  assert.equal(sent[0].recipients.length, 2);
  assert.match(sent[0].messageBody, /Ada has not checked in from a trip to Benin City/);
  assert.match(sent[0].messageBody, /maps\.google\.com\/\?q=6\.7,4\.9/);
  assert.match(sent[0].messageBody, new RegExp(`/s\\?token=${id}`));

  const shared = (await db().doc(`sharedTrips/${id}`).get()).data()!;
  assert.ok(shared.overdueAt, 'public page shows overdue');
  assert.ok(shared.expiresAt.toMillis() > Date.now() + 24 * 60 * MIN, 'share link extended');

  const alerts = await db().collection(`users/${uid}/alerts`).get();
  assert.equal(alerts.size, 1);
  assert.equal(alerts.docs[0].data().type, 'check_in_missed');
});

test('only the contacts chosen for the trip are alerted', async () => {
  const { uid, contactIds } = await makeUser({ contacts: 2 });
  await makeTrip(uid, [contactIds[0]], { endsAt: ts(Date.now() - 10 * MIN) });

  await runMonitor();

  const sent = await logs(uid, 'overdue');
  assert.equal(sent[0].recipients.length, 1);
});

test('no contacts: trip is still marked overdue, nothing is sent', async () => {
  const { uid } = await makeUser({ contacts: 0 });
  const id = await makeTrip(uid, [], { endsAt: ts(Date.now() - 10 * MIN) });

  await runMonitor();

  assert.equal((await trip(uid, id)).overdueAlertState, 'no_contacts');
  assert.equal((await logs(uid, 'overdue')).length, 0);
});

test('trips that are on time, ended, or have no deadline are left alone', async () => {
  const { uid, contactIds } = await makeUser();
  const onTime = await makeTrip(uid, contactIds, { endsAt: ts(Date.now() + 30 * MIN) });
  const ended = await makeTrip(uid, contactIds, { endsAt: ts(Date.now() - 10 * MIN), status: 'completed' });
  const open = await makeTrip(uid, contactIds, { endsAt: null });

  await runMonitor();

  for (const id of [onTime, ended, open]) {
    const t = await trip(uid, id);
    assert.equal(t.overdueAlertState, undefined, id);
    assert.equal(t.overdueWarnedAt, undefined, id);
  }
  assert.equal((await logs(uid, 'overdue')).length, 0);
});

test('adding time after an alert re-arms the alarm and tells contacts', async () => {
  const { uid, contactIds } = await makeUser();
  const id = await makeTrip(uid, contactIds, { endsAt: ts(Date.now() - 10 * MIN) });
  await runMonitor();

  const newEnd = Date.now() + 30 * MIN;
  await updateAndTrigger(onTripUpdated, `users/${uid}/trips/${id}`, { endsAt: ts(newEnd) }, { uid, tripId: id });

  const t = await trip(uid, id);
  assert.equal(t.overdueAlertState, undefined);
  assert.equal(t.overdueAt, undefined);
  assert.equal((await db().doc(`sharedTrips/${id}`).get()).data()!.overdueAt, undefined);

  const clear = await logs(uid, 'all_clear');
  assert.equal(clear.length, 1);
  assert.match(clear[0].messageBody, /Ada has checked in and extended the trip/);

  // Missing the new deadline alerts again
  await db().doc(`users/${uid}/trips/${id}`).update({ endsAt: ts(Date.now() - 6 * MIN) });
  await runMonitor();
  assert.equal((await logs(uid, 'overdue')).length, 2);
});

test('ending an alerted trip tells contacts once', async () => {
  const { uid, contactIds } = await makeUser();
  const id = await makeTrip(uid, contactIds, { endsAt: ts(Date.now() - 10 * MIN) });
  await runMonitor();

  const path = `users/${uid}/trips/${id}`;
  const beforeSnap = await db().doc(path).get();
  await db().doc(path).update({ status: 'completed' });
  const afterSnap = await db().doc(path).get();
  // Triggers can be delivered more than once
  await (onTripUpdated as any).run({ before: beforeSnap, after: afterSnap }, { params: { uid, tripId: id } });
  await (onTripUpdated as any).run({ before: beforeSnap, after: afterSnap }, { params: { uid, tripId: id } });

  const clear = await logs(uid, 'all_clear');
  assert.equal(clear.length, 1);
  assert.match(clear[0].messageBody, /ended the trip safely/);
});

test('ending a trip that was never alerted sends nothing', async () => {
  const { uid, contactIds } = await makeUser();
  const id = await makeTrip(uid, contactIds, { endsAt: ts(Date.now() + 30 * MIN) });

  await updateAndTrigger(onTripUpdated, `users/${uid}/trips/${id}`, { status: 'completed' }, { uid, tripId: id });

  assert.equal((await logs(uid, 'all_clear')).length, 0);
});

test('standalone timer: alerted when expired, all-clear on check-in; trip-linked timers are ignored', async () => {
  const { uid } = await makeUser();
  const base = { uid, acknowledged: false, shouldNotifyContacts: true, expiresAt: ts(Date.now() - 10 * MIN) };
  await db().doc(`users/${uid}/safetyTimers/alone`).set(base);
  await db().doc(`users/${uid}/safetyTimers/linked`).set({ ...base, tripId: 'some_trip' });

  await runMonitor();

  const alone = (await db().doc(`users/${uid}/safetyTimers/alone`).get()).data()!;
  const linked = (await db().doc(`users/${uid}/safetyTimers/linked`).get()).data()!;
  assert.equal(alone.overdueAlertState, 'sent');
  assert.equal(linked.overdueAlertState, undefined);
  const sent = await logs(uid, 'overdue');
  assert.equal(sent.length, 1);
  assert.match(sent[0].messageBody, /set a safety timer and has not checked in/);

  await updateAndTrigger(onSafetyTimerUpdated, `users/${uid}/safetyTimers/alone`, { acknowledged: true }, { uid, timerId: 'alone' });
  assert.equal((await logs(uid, 'all_clear')).length, 1);
});

test('SOS without a GPS fix uses the trip\'s last known location and messages contacts once', async () => {
  const { uid, contactIds } = await makeUser();
  const id = await makeTrip(uid, contactIds, { endsAt: ts(Date.now() + 30 * MIN), status: 'emergency' });
  const ref = db().doc(`users/${uid}/alerts/sos_1`);
  await ref.set({ type: 'sos', location: null, tripId: id, acknowledged: false, notifiedContacts: [] });

  const snap = await ref.get();
  await (onSOSAlert as any).run(snap, { params: { uid, alertId: 'sos_1' } });
  await (onSOSAlert as any).run(snap, { params: { uid, alertId: 'sos_1' } });

  const sent = await logs(uid, 'sos');
  assert.equal(sent.length, 1);
  assert.match(sent[0].messageBody, /SOS: Ada needs help\./);
  assert.match(sent[0].messageBody, /maps\.google\.com\/\?q=6\.7,4\.9/);
  assert.equal((await ref.get()).data()!.smsState, 'sent');
});

test('a user cannot make the server send unlimited overdue alerts', async () => {
  const { uid, contactIds } = await makeUser();
  for (let i = 0; i < 7; i++) {
    await makeTrip(uid, contactIds, { endsAt: ts(Date.now() - 10 * MIN) });
  }

  await runMonitor();

  assert.ok((await logs(uid, 'overdue')).length <= 5, 'capped by the per-type hourly limit');
});
