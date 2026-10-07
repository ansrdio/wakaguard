/**
 * End-to-end checks for the safety monitor against the Firestore and Auth
 * emulators. Run with: npm run test:monitor
 * SMS goes through the mock provider, so nothing is actually sent.
 */
process.env.SMS_PROVIDER = 'mock';
process.env.SOS_LOCATION_WAIT_MS = '0';
process.env.SOS_RETRY_DELAY_MS = '10';

import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import * as admin from 'firebase-admin';
import {
  checkOverdueTrips,
  onTripUpdated,
  onSafetyTimerUpdated,
  onSOSAlert,
  sendSafetySms,
} from '../../src/index';

const MIN = 60 * 1000;
const ts = (ms: number) => admin.firestore.Timestamp.fromMillis(ms);
const db = () => admin.firestore();
let seq = 0;

before(() => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'Firestore emulator must be running');
  assert.ok(process.env.FIREBASE_AUTH_EMULATOR_HOST, 'Auth emulator must be running');
});

async function makeUser(opts: { contacts?: number; emailVerified?: boolean; disabled?: boolean; displayName?: string } = {}) {
  const uid = `user_${Date.now()}_${seq++}`;
  await admin.auth().createUser({
    uid,
    email: `${uid}@example.com`,
    emailVerified: opts.emailVerified ?? true,
    disabled: opts.disabled ?? false,
    displayName: opts.displayName ?? 'Ada',
  });
  await db().doc(`users/${uid}`).set({ username: 'ada_handle' });

  const contactIds: string[] = [];
  for (let i = 0; i < (opts.contacts ?? 1); i++) {
    const id = `c${i}`;
    await db().doc(`users/${uid}/trustedContacts/${id}`).set({
      name: `Contact ${i}`,
      phoneE164: `+2348${String(seq).padStart(5, '0')}${String(i).padStart(4, '0')}`,
      createdAt: ts(Date.now() - (100 - i) * MIN),
    });
    contactIds.push(id);
  }
  return { uid, contactIds };
}

async function makeTrip(uid: string, contactIds: string[], fields: Record<string, unknown>) {
  const tripId = `trip_${Date.now()}_${seq++}_padding`;
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
    status: fields.status ?? 'active',
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
  (await db().collection('safetyMessageLogs').where('uid', '==', uid).where('type', '==', type).get())
    .docs.map((d) => d.data())
    .sort((a, b) => a.createdAt.toMillis() - b.createdAt.toMillis());

/** Apply an update the way a client would, then fire the trigger with before/after. */
async function updateAndTrigger(trigger: any, path: string, update: Record<string, unknown>, params: Record<string, string>) {
  const ref = db().doc(path);
  const beforeSnap = await ref.get();
  await ref.update(update);
  const afterSnap = await ref.get();
  await trigger.run({ before: beforeSnap, after: afterSnap }, { params });
}

async function createSos(uid: string, fields: Record<string, unknown>) {
  const alertId = `sos_${seq++}`;
  const ref = db().doc(`users/${uid}/alerts/${alertId}`);
  await ref.set({ type: 'sos', location: null, tripId: null, acknowledged: false, notifiedContacts: [], ...fields });
  return { ref, alertId, fire: async () => (onSOSAlert as any).run(await ref.get(), { params: { uid, alertId } }) };
}

const callAs = (uid: string, data: unknown, provider = 'password') =>
  (sendSafetySms as any).run(data, { auth: { uid, token: { firebase: { sign_in_provider: provider } } } });

// ---------------------------------------------------------------------------
// Overdue trips
// ---------------------------------------------------------------------------

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
  assert.equal(sent[0].provider, 'mock');
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

test('no more than five contacts are ever messaged', async () => {
  const { uid, contactIds } = await makeUser({ contacts: 8 });
  await makeTrip(uid, contactIds, { endsAt: ts(Date.now() - 10 * MIN) });

  await runMonitor();

  const sent = await logs(uid, 'overdue');
  assert.equal(sent[0].recipients.length, 5);
  assert.deepEqual(sent[0].recipients.map((r: any) => r.name), ['Contact 0', 'Contact 1', 'Contact 2', 'Contact 3', 'Contact 4']);
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

// ---------------------------------------------------------------------------
// Who may send, and how much
// ---------------------------------------------------------------------------

test('accounts without a verified email, and disabled accounts, do not send SMS', async () => {
  const unverified = await makeUser({ emailVerified: false });
  const tripId = await makeTrip(unverified.uid, unverified.contactIds, { endsAt: ts(Date.now() - 10 * MIN) });
  await runMonitor();
  assert.equal((await trip(unverified.uid, tripId)).overdueAlertState, 'blocked');
  assert.equal((await logs(unverified.uid, 'overdue')).length, 0);

  const disabled = await makeUser({ disabled: true });
  const sos = await createSos(disabled.uid, {});
  await sos.fire();
  const alert = (await sos.ref.get()).data()!;
  assert.equal(alert.smsState, 'blocked');
  assert.equal(alert.smsError, 'account_disabled');
  assert.equal((await logs(disabled.uid, 'sos')).length, 0);

  const blocked = await makeUser();
  await db().doc(`users/${blocked.uid}`).update({ smsBlocked: true });
  await assert.rejects(callAs(blocked.uid, { type: 'checkin' }), /This account cannot send SMS/);
});

test('the name in a message is the real name, cleaned of links', async () => {
  const { uid, contactIds } = await makeUser({ displayName: 'Ada Obi http://evil.example/x' });
  await makeTrip(uid, contactIds, { endsAt: ts(Date.now() - 10 * MIN) });

  await runMonitor();

  const body = (await logs(uid, 'overdue'))[0].messageBody as string;
  assert.match(body, /^WakaGuard: Ada Obi has not checked in/);
  assert.doesNotMatch(body, /evil/);
});

test('the name the user chose for alerts is used ahead of the sign-in name and handle', async () => {
  const { uid, contactIds } = await makeUser({ displayName: 'Adaeze Okonkwo-Williams' });
  await db().doc(`users/${uid}`).update({ alertName: 'Ada (Chidi\'s wife) www.evil.example' });
  await makeTrip(uid, contactIds, { endsAt: ts(Date.now() - 10 * MIN) });

  await runMonitor();

  const body = (await logs(uid, 'overdue'))[0].messageBody as string;
  assert.match(body, /^WakaGuard: Ada Chidi's wife has not checked in/);
});

test('a user cannot make the server send unlimited messages', async () => {
  const { uid, contactIds } = await makeUser({ contacts: 5 });
  for (let i = 0; i < 5; i++) {
    await makeTrip(uid, contactIds, { endsAt: ts(Date.now() - 10 * MIN) });
  }

  await runMonitor();

  const sent = await logs(uid, 'overdue');
  const messages = sent.reduce((n, l) => n + l.recipients.length, 0);
  assert.equal(messages, 15, 'capped at 15 overdue messages an hour');

  const limits = (await db().doc(`users/${uid}/rateLimits/sms`).get()).data()!;
  assert.equal(limits.count, 15);
  assert.equal(limits.dayCount, 15);
});

test('the daily cap holds across hours', async () => {
  const { uid, contactIds } = await makeUser({ contacts: 5 });
  // 48 messages already sent today, in an earlier hour
  await db().doc(`users/${uid}/rateLimits/sms`).set({
    windowStart: ts(Date.now() - 2 * 60 * MIN),
    count: 20,
    perType: { overdue: 15 },
    dayStart: ts(Date.now() - 3 * 60 * MIN),
    dayCount: 48,
  });
  const id = await makeTrip(uid, contactIds, { endsAt: ts(Date.now() - 10 * MIN) });

  await runMonitor();

  assert.equal((await trip(uid, id)).overdueAlertState, 'failed');
  assert.equal((await logs(uid, 'overdue')).length, 0);
});

// ---------------------------------------------------------------------------
// SOS
// ---------------------------------------------------------------------------

test('SOS on a trip with a fresh position sends it as the location and marks the trip an emergency', async () => {
  const { uid, contactIds } = await makeUser();
  const id = await makeTrip(uid, contactIds, { endsAt: ts(Date.now() + 30 * MIN), lastUpdate: ts(Date.now() - 1 * MIN) });
  const sos = await createSos(uid, { tripId: id });

  await sos.fire();
  await sos.fire();

  const sent = await logs(uid, 'sos');
  assert.equal(sent.length, 1, 'sent once even if the trigger fires twice');
  assert.match(sent[0].messageBody, /^WakaGuard SOS: Ada needs help\. Location: https:\/\/maps\.google\.com\/\?q=6\.7,4\.9 Track: /);
  assert.equal((await sos.ref.get()).data()!.smsState, 'sent');

  assert.equal((await trip(uid, id)).status, 'emergency');
  const shared = (await db().doc(`sharedTrips/${id}`).get()).data()!;
  assert.equal(shared.status, 'emergency');
  assert.ok(shared.expiresAt.toMillis() > Date.now() + 24 * 60 * MIN);
});

test('SOS with only an old trip position labels it as last known', async () => {
  const { uid, contactIds } = await makeUser();
  const id = await makeTrip(uid, contactIds, { endsAt: ts(Date.now() + 30 * MIN) });
  const sos = await createSos(uid, { tripId: id });

  await sos.fire();

  const body = (await logs(uid, 'sos'))[0].messageBody as string;
  assert.match(body, /Last known location \(\w{3} \d{1,2}:\d{2}\s?[ap]m\): https:\/\/maps\.google\.com\/\?q=6\.7,4\.9/i);
});

test('SOS waits briefly for the phone to attach a GPS fix', async () => {
  process.env.SOS_LOCATION_WAIT_MS = '6000';
  try {
    const { uid } = await makeUser();
    const sos = await createSos(uid, {});
    setTimeout(() => sos.ref.update({ location: { lat: 9.05, lng: 7.49 } }), 500);

    await sos.fire();

    const body = (await logs(uid, 'sos'))[0].messageBody as string;
    assert.match(body, /Location: https:\/\/maps\.google\.com\/\?q=9\.05,7\.49/);
  } finally {
    process.env.SOS_LOCATION_WAIT_MS = '0';
  }
});

test('SOS with no position at all still goes out', async () => {
  const { uid } = await makeUser();
  const sos = await createSos(uid, {});

  await sos.fire();

  assert.equal((await logs(uid, 'sos'))[0].messageBody, 'WakaGuard SOS: Ada needs help. Call them or 112.');
});

test('SOS is retried when the provider rejects it', async () => {
  let requests = 0;
  const server = createServer((req, res) => {
    requests++;
    req.resume();
    req.on('end', () => {
      if (requests <= 2) {
        res.writeHead(503, { 'Content-Type': 'application/json' }).end(JSON.stringify({ message: 'Service unavailable' }));
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ code: 'ok', message_id: 'm1' }));
      }
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as AddressInfo).port;

  process.env.SMS_PROVIDER = 'termii';
  process.env.TERMII_API_KEY = 'key';
  process.env.TERMII_SENDER_ID = 'WakaGuard';
  process.env.TERMII_BASE_URL = `http://127.0.0.1:${port}`;
  try {
    const { uid } = await makeUser();
    const sos = await createSos(uid, { location: { lat: 6.5, lng: 3.3 } });

    await sos.fire();

    const attempts = await logs(uid, 'sos');
    assert.deepEqual(attempts.map((a) => a.status), ['failed', 'failed', 'sent']);
    assert.match(attempts[0].providerResult[0].error, /Termii 503: Service unavailable/);
    assert.equal(attempts[2].providerResult[0].provider, 'termii');
    assert.equal((await sos.ref.get()).data()!.smsState, 'sent');
  } finally {
    process.env.SMS_PROVIDER = 'mock';
    await new Promise((resolve) => server.close(resolve));
  }
});

test('ending a trip after an SOS asks contacts to confirm, once, without claiming all is well', async () => {
  const { uid, contactIds } = await makeUser();
  const id = await makeTrip(uid, contactIds, { endsAt: ts(Date.now() + 30 * MIN), status: 'emergency' });

  const path = `users/${uid}/trips/${id}`;
  const beforeSnap = await db().doc(path).get();
  await db().doc(path).update({ status: 'completed' });
  const afterSnap = await db().doc(path).get();
  await (onTripUpdated as any).run({ before: beforeSnap, after: afterSnap }, { params: { uid, tripId: id } });
  await (onTripUpdated as any).run({ before: beforeSnap, after: afterSnap }, { params: { uid, tripId: id } });

  const clear = await logs(uid, 'all_clear');
  assert.equal(clear.length, 1);
  assert.match(clear[0].messageBody, /Ada ended the SOS alert in the app\. Please call them to confirm they are safe\./);
});

// ---------------------------------------------------------------------------
// Messages the traveller sends themselves
// ---------------------------------------------------------------------------

test('trip share SMS describes the caller\'s own trip', async () => {
  const { uid, contactIds } = await makeUser({ contacts: 2 });
  const id = await makeTrip(uid, contactIds, { endsAt: ts(Date.now() + 30 * MIN) });

  const result = await callAs(uid, { type: 'trip_share', token: id });

  assert.equal(result.success, true);
  assert.equal(result.sent, 2);
  const body = (await logs(uid, 'trip_share'))[0].messageBody as string;
  assert.match(body, /^WakaGuard: Ada is sharing a trip to Benin City with you\. Expected arrival .+ Follow it: https:\/\/wakaguard\.com\/s\?token=/);
});

test('trip share is refused for another user\'s trip, an ended trip or a malformed token', async () => {
  const owner = await makeUser();
  const other = await makeUser();
  const theirs = await makeTrip(owner.uid, owner.contactIds, { endsAt: ts(Date.now() + 30 * MIN) });
  const ended = await makeTrip(other.uid, other.contactIds, { endsAt: ts(Date.now() + 30 * MIN), status: 'completed' });

  await assert.rejects(callAs(other.uid, { type: 'trip_share', token: theirs }), /No active trip to share/);
  await assert.rejects(callAs(other.uid, { type: 'trip_share', token: ended }), /No active trip to share/);
  await assert.rejects(callAs(other.uid, { type: 'trip_share', token: 'x&next=http://evil.example' }), /Invalid trip/);
  assert.equal((await logs(other.uid, 'trip_share')).length, 0);
});

test('check-in SMS names the sender and cannot carry a link', async () => {
  const { uid } = await makeUser();

  await callAs(uid, { type: 'checkin', message: 'All good, see https://evil.example/x', lat: 6.5, lng: 3.3 });

  const body = (await logs(uid, 'checkin'))[0].messageBody as string;
  assert.equal(body, 'WakaGuard: Ada checked in and is OK. "All good, see" Location: https://maps.google.com/?q=6.5,3.3');
});

test('the callable refuses free-form and SOS messages, guests and unverified accounts', async () => {
  const { uid } = await makeUser();
  await assert.rejects(callAs(uid, { type: 'one_time', phoneE164: '+2348012345678', message: 'hi' }), /Invalid message type/);
  await assert.rejects(callAs(uid, { type: 'sos', lat: 6.5, lng: 3.3 }), /Invalid message type/);
  await assert.rejects(callAs(uid, { type: 'checkin' }, 'anonymous'), /Anonymous users cannot send SMS/);
  await assert.rejects((sendSafetySms as any).run({ type: 'checkin' }, {}), /Must be authenticated/);

  const unverified = await makeUser({ emailVerified: false });
  await assert.rejects(callAs(unverified.uid, { type: 'checkin' }), /Verify your email/);
});
