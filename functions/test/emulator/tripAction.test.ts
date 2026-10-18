/**
 * tripAction endpoint against the Firestore emulator.
 * Run with: npm run test:monitor
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as admin from 'firebase-admin';
import { tripAction } from '../../src/index';

const KEY = 'k'.repeat(64);
const MIN = 60 * 1000;
const db = () => admin.firestore();
let seq = 0;

async function makeTrip(fields: Record<string, unknown> = {}) {
  const uid = `act_user_${Date.now()}_${seq++}`;
  const tripId = `act_trip_${Date.now()}_${seq++}`;
  const ts = (ms: number) => admin.firestore.Timestamp.fromMillis(ms);
  await db().doc(`users/${uid}/trips/${tripId}`).set({
    uid, status: 'active', locationKey: KEY, startTime: ts(Date.now() - 20 * MIN), endsAt: ts(Date.now() + 10 * MIN),
    expiresAt: ts(Date.now() + 24 * 60 * MIN), extensionCount: 0, extendedMinutes: 0, ...fields,
  });
  await db().doc(`sharedTrips/${tripId}`).set({ uid, tripId, status: 'active', endsAt: ts(Date.now() + 10 * MIN) });
  return { uid, tripId };
}

function post(body: unknown, method = 'POST'): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const res: any = {
      statusCode: 200,
      status(code: number) { this.statusCode = code; return this; },
      json(payload: unknown) { resolve({ status: this.statusCode, body: payload }); },
    };
    Promise.resolve((tripAction as any)({ method, body }, res)).catch(reject);
  });
}

const trip = async (uid: string, tripId: string) => (await db().doc(`users/${uid}/trips/${tripId}`).get()).data()!;
const shared = async (tripId: string) => (await db().doc(`sharedTrips/${tripId}`).get()).data()!;

test('a backup "I\'ve arrived" ends the trip and its public page, once', async () => {
  const { uid, tripId } = await makeTrip();
  assert.deepEqual(await post({ uid, tripId, key: KEY, action: 'end' }), { status: 200, body: { ok: true, done: 'ended' } });
  const t = await trip(uid, tripId);
  assert.equal(t.status, 'completed');
  assert.equal(t.endedVia, 'backup');
  assert.ok(t.endTime);
  assert.equal((await shared(tripId)).status, 'completed');
  // The database save arriving too, or the press sent again, changes nothing
  assert.deepEqual(await post({ uid, tripId, key: KEY, action: 'end' }), { status: 200, body: { ok: true, done: 'already' } });
});

test('backup extra time is added once per press, to the private trip and the public page', async () => {
  const { uid, tripId } = await makeTrip();
  const before = (await trip(uid, tripId)).endsAt.toMillis();
  const press = { uid, tripId, key: KEY, action: 'extend', minutes: 15, requestId: 'press_first1' };

  assert.deepEqual(await post(press), { status: 200, body: { ok: true, done: 'extended' } });
  const t = await trip(uid, tripId);
  assert.ok(Math.abs(t.endsAt.toMillis() - (before + 15 * MIN)) < 2000);
  assert.equal(t.extensionCount, 1);
  assert.equal(t.extendedMinutes, 15);
  assert.equal(t.lastExtendRequestId, 'press_first1');
  assert.equal((await shared(tripId)).endsAt.toMillis(), t.endsAt.toMillis());

  assert.deepEqual(await post(press), { status: 200, body: { ok: true, done: 'already' } });
  assert.equal((await trip(uid, tripId)).extensionCount, 1, 'the same press again adds nothing');

  assert.deepEqual(await post({ ...press, requestId: 'press_second' }), { status: 200, body: { ok: true, done: 'extended' } });
  assert.equal((await trip(uid, tripId)).extensionCount, 2, 'a new press adds again');
});

test('a wrong key, a missing trip and a bad request are refused alike', async () => {
  const { uid, tripId } = await makeTrip();
  assert.equal((await post({ uid, tripId, key: 'x'.repeat(64), action: 'end' })).status, 403);
  assert.equal((await post({ uid, tripId: 'no_such_trip', key: KEY, action: 'end' })).status, 403);
  assert.equal((await post({ uid, tripId, key: KEY, action: 'cancel' })).status, 400);
  assert.equal((await post({ uid, tripId, key: KEY, action: 'end' }, 'GET')).status, 405);
  assert.equal((await trip(uid, tripId)).status, 'active');
});

test('an ended trip gets no extra time', async () => {
  const { uid, tripId } = await makeTrip({ status: 'completed' });
  assert.deepEqual(await post({ uid, tripId, key: KEY, action: 'extend', minutes: 15, requestId: 'press_late01' }), { status: 410, body: { error: 'trip_ended' } });
});
