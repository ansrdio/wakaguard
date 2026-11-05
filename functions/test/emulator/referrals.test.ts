/**
 * Invite friends, against the Firestore and Auth emulators.
 * Run with: npm run test:monitor
 *
 * Accounts made by the emulator are made today, before the programme's first
 * day, so the start is moved back for these runs. Days are moved forward by
 * changing the clock the server code reads.
 */
process.env.REFERRALS_ACCOUNTS_FROM_MS = '0';

import { test, before, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import * as admin from 'firebase-admin';
import { onTripUpdated, onTrustedContactWrite, referrals } from '../../src/index';
import { deleteAccountData } from '../../src/accountDeletion';
import { markCashOutPaid } from '../../src/referrals';
import { CASH_OUT_OPENS_MS, REWARD_NAIRA } from '../../src/referralPlan';

const MIN = 60 * 1000;
const DAY = 24 * 60 * MIN;
const ts = (ms: number) => admin.firestore.Timestamp.fromMillis(ms);
const db = () => admin.firestore();
const realNow = Date.now;
let seq = 0;

before(() => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'Firestore emulator must be running');
  assert.ok(process.env.FIREBASE_AUTH_EMULATOR_HOST, 'Auth emulator must be running');
});
afterEach(() => { Date.now = realNow; });

const call = (uid: string, data: Record<string, unknown>) =>
  (referrals as any).run(data, { auth: { uid, token: { firebase: { sign_in_provider: 'password' } } } });

/** A confirmed account unless said otherwise: one made with Google, as most are */
async function person(prefix: string, confirmed = true) {
  const uid = `ref_${prefix}_${realNow()}_${seq++}`;
  const username = `${prefix}${seq}x${realNow() % 100000}`;
  await admin.auth().createUser({ uid, email: `${uid}@example.test`, emailVerified: confirmed });
  await db().doc(`users/${uid}`).set({ username });
  await db().doc(`usernames/${username.toLowerCase()}`).set({ uid, usernameLower: username.toLowerCase() });
  return { uid, username };
}

/** A real trip that ends `daysLater` days from now, from the given phone */
async function arrive(uid: string, daysLater: number, device: string, changes: Record<string, unknown> = {}) {
  const endMs = realNow() + daysLater * DAY + 60 * MIN;
  Date.now = () => endMs;
  const ref = db().doc(`users/${uid}/trips/trip_${seq++}`);
  await ref.set({
    uid, status: 'active', isTest: false, trackingDeviceId: device,
    startTime: ts(endMs - 30 * MIN), startLocation: { lat: 6.5, lng: 3.35 },
    positionCount: 14, farthestFromStartM: 1600, ...changes,
  });
  const beforeSnap = await ref.get();
  await ref.update({ status: 'completed', endTime: ts(endMs), endLocation: { lat: 6.514, lng: 3.35 } });
  const afterSnap = await ref.get();
  await (onTripUpdated as any).run({ before: beforeSnap, after: afterSnap }, { params: { uid, tripId: ref.id } });
}

async function addContact(uid: string) {
  const ref = db().doc(`users/${uid}/trustedContacts/c_${seq++}`);
  await ref.set({ name: 'Mum' });
  const afterSnap = await ref.get();
  const beforeSnap = await db().doc(`users/${uid}/trustedContacts/none_${seq++}`).get();
  await (onTrustedContactWrite as any).run({ before: beforeSnap, after: afterSnap }, { params: { uid, contactId: ref.id } });
}

const referral = async (uid: string) => (await db().doc(`referrals/${uid}`).get()).data();

test('a friend names who invited them once, on a new account, and not themselves', async () => {
  const inviter = await person('ada');
  const friend = await person('tunde');

  assert.deepEqual(await call(friend.uid, { action: 'join', inviter: friend.username }), { ok: false, problem: 'self' });
  assert.deepEqual(await call(friend.uid, { action: 'join', inviter: 'nobody_has_this' }), { ok: false, problem: 'not_found' });
  assert.deepEqual(await call(friend.uid, { action: 'join', inviter: `@${inviter.username.toUpperCase()}` }), { ok: true });
  assert.deepEqual(await call(friend.uid, { action: 'join', inviter: inviter.username }), { ok: false, problem: 'already' });

  const saved = await referral(friend.uid);
  assert.equal(saved!.inviterUid, inviter.uid);
  assert.equal(saved!.state, 'counting');

  const seen = await call(friend.uid, { action: 'summary' });
  assert.equal(seen.invitedBy.name, inviter.username);
  assert.equal(seen.canJoin, false);
});

test('4 real trips on 4 days and a contact earn the inviter ₦500, held 7 days', async () => {
  const inviter = await person('ngozi');
  const friend = await person('emeka');
  await call(friend.uid, { action: 'join', inviter: inviter.username });

  await arrive(friend.uid, 0, 'friend-phone');
  await arrive(friend.uid, 0, 'friend-phone');
  await arrive(friend.uid, 1, 'friend-phone', { isTest: true });
  await arrive(friend.uid, 2, 'friend-phone', { positionCount: 1 });
  await arrive(friend.uid, 3, 'friend-phone', { farthestFromStartM: 0, startLocation: { lat: 6.514, lng: 3.35 } });
  assert.deepEqual((await referral(friend.uid))!.days.length, 1, 'one day: a second trip that day, a test, too few positions and one that did not move add nothing');

  await arrive(friend.uid, 4, 'friend-phone');
  await arrive(friend.uid, 5, 'friend-phone');
  let summary = await call(inviter.uid, { action: 'summary' });
  assert.deepEqual(summary.friends.map((f: any) => [f.name, f.trips, f.state]), [[friend.username, 3, 'counting']]);
  assert.equal(summary.friends[0].days, undefined, 'the inviter never sees when the trips were');

  await arrive(friend.uid, 6, 'friend-phone');
  assert.equal((await referral(friend.uid))!.state, 'counting', 'no contact yet');
  summary = await call(inviter.uid, { action: 'summary' });
  assert.deepEqual([summary.friends[0].trips, summary.friends[0].state], [4, 'needs_contact']);

  await addContact(friend.uid);
  const done = (await referral(friend.uid))!;
  assert.equal(done.state, 'qualified');
  assert.equal(done.amount, REWARD_NAIRA);

  Date.now = () => done.availableAt.toMillis() - MIN;
  summary = await call(inviter.uid, { action: 'summary' });
  assert.deepEqual([summary.balance.waiting, summary.balance.ready], [500, 0]);
  Date.now = () => done.availableAt.toMillis();
  summary = await call(inviter.uid, { action: 'summary' });
  assert.deepEqual([summary.balance.waiting, summary.balance.ready], [0, 500]);
});

test('a friend whose email is not confirmed earns nothing until it is', async () => {
  // Security review, 4 November 2026: unconfirmed accounts cost nothing to make by the hundred
  const inviter = await person('kemi');
  const friend = await person('sola', false);
  await call(friend.uid, { action: 'join', inviter: inviter.username });
  for (const day of [0, 1, 2, 3]) await arrive(friend.uid, day, 'sola-phone');
  await addContact(friend.uid);
  assert.equal((await referral(friend.uid))!.state, 'counting');
  let summary = await call(inviter.uid, { action: 'summary' });
  assert.deepEqual([summary.friends[0].trips, summary.friends[0].state], [4, 'needs_confirmed']);

  await admin.auth().updateUser(friend.uid, { emailVerified: true });
  summary = await call(inviter.uid, { action: 'summary' });
  assert.equal(summary.friends[0].state, 'qualified', 'picked up the next time the inviter looks');
});

test('trips from the inviter\'s own phone earn nothing', async () => {
  const inviter = await person('bola');
  const friend = await person('chidi');
  await db().doc(`users/${inviter.uid}/trips/own`).set({ uid: inviter.uid, status: 'completed', trackingDeviceId: 'shared-phone' });
  await call(friend.uid, { action: 'join', inviter: inviter.username });
  await addContact(friend.uid);
  for (const day of [0, 1, 2, 3]) await arrive(friend.uid, day, 'shared-phone');

  const refused = (await referral(friend.uid))!;
  assert.equal(refused.state, 'refused');
  assert.equal(refused.refusal, 'same_phone');
});

test('cash out from 15 December: everything ready, once, then marked paid with the last 4 digits kept', async () => {
  const inviter = await person('kemi');
  for (let i = 0; i < 2; i++) {
    const friend = await person(`f${i}`);
    await db().doc(`referrals/${friend.uid}`).set({
      inviterUid: inviter.uid, state: 'qualified', amount: REWARD_NAIRA, availableAt: ts(CASH_OUT_OPENS_MS - DAY),
      createdAt: ts(realNow()), days: [], devices: [],
    });
  }
  const airtime = { action: 'cashOut', method: 'airtime', phone: '0700 000 1234' };

  Date.now = () => CASH_OUT_OPENS_MS - MIN;
  assert.deepEqual(await call(inviter.uid, airtime), { ok: false, problem: 'not_open' });
  Date.now = () => CASH_OUT_OPENS_MS;
  assert.deepEqual(await call(inviter.uid, { ...airtime, phone: '12' }), { ok: false, problem: 'details' });
  assert.deepEqual(await call(inviter.uid, airtime), { ok: true, amount: 1000 });
  assert.deepEqual(await call(inviter.uid, airtime), { ok: false, problem: 'open_request' });

  const summary = await call(inviter.uid, { action: 'summary' });
  assert.deepEqual([summary.balance.ready, summary.balance.requested], [0, 1000]);
  assert.equal(summary.cashOut.request.method, 'airtime');

  const request = (await db().collection('cashOuts').where('uid', '==', inviter.uid).get()).docs[0];
  assert.equal(await markCashOutPaid(request.id), 'paid');
  assert.equal(await markCashOutPaid(request.id), 'not_requested');
  const paid = (await request.ref.get()).data()!;
  assert.equal(paid.state, 'paid');
  assert.deepEqual(paid.payTo, { method: 'airtime', phoneEnding: '1234' });
});

test('a contact opening "Get WakaGuard" after an arrival learns only the traveller\'s username', async () => {
  const traveller = await person('yemi');
  await db().doc('sharedTrips/share_for_join').set({ uid: traveller.uid, status: 'completed', lastUpdate: ts(Date.now()) });
  assert.deepEqual(await (referrals as any).run({ action: 'fromTrip', trip: 'share_for_join' }, {}), { ok: true, name: traveller.username });
  assert.deepEqual(await (referrals as any).run({ action: 'fromTrip', trip: 'no_such_trip' }, {}), { ok: false, problem: 'not_found' });
  // Only after "I've arrived": never while the trip runs or is late, nor for a test
  await db().doc('sharedTrips/share_running').set({ uid: traveller.uid, status: 'active' });
  await db().doc('sharedTrips/share_test').set({ uid: traveller.uid, status: 'completed', isTest: true });
  // Nor a week after the trip
  await db().doc('sharedTrips/share_old').set({
    uid: traveller.uid, status: 'completed', lastUpdate: ts(Date.now() - 8 * DAY),
  });
  for (const trip of ['share_running', 'share_test', 'share_old']) {
    assert.deepEqual(await (referrals as any).run({ action: 'fromTrip', trip }, {}), { ok: false, problem: 'not_found' }, trip);
  }
  await assert.rejects((referrals as any).run({ action: 'summary' }, {}), /Must be authenticated/);
});

test('deleting an account removes a friend\'s progress but keeps a reward already earned', async () => {
  const inviter = await person('femi');
  const counting = await person('gbenga');
  const earned = await person('halima');
  await db().doc(`referrals/${counting.uid}`).set({ inviterUid: inviter.uid, state: 'counting', days: ['2026-11-12'], devices: ['p1'] });
  await db().doc(`referrals/${earned.uid}`).set({ inviterUid: inviter.uid, state: 'qualified', amount: 500, days: ['a', 'b', 'c', 'd'], devices: ['p2'] });

  await deleteAccountData(counting.uid);
  await deleteAccountData(earned.uid);
  assert.equal(await referral(counting.uid), undefined);
  const kept = (await referral(earned.uid))!;
  assert.deepEqual([kept.state, kept.friendDeleted, kept.days, kept.devices], ['qualified', true, [], []]);

  await db().collection('cashOuts').doc(`paid_${seq}`).set({ uid: inviter.uid, amount: 500, state: 'paid' });
  await db().collection('cashOuts').doc(`asked_${seq}`).set({ uid: inviter.uid, amount: 500, state: 'requested' });
  await deleteAccountData(inviter.uid);
  assert.equal(await referral(earned.uid), undefined, 'the inviter\'s friends go with the inviter');
  assert.equal((await db().doc(`cashOuts/asked_${seq}`).get()).exists, false);
  const books = (await db().doc(`cashOuts/paid_${seq}`).get()).data()!;
  assert.deepEqual([books.uid, books.accountDeleted, books.amount], [undefined, true, 500]);
});
