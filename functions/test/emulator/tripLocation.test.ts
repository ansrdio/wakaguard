/**
 * tripLocation endpoint against the Firestore emulator.
 * Run with: npm run test:monitor
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as admin from 'firebase-admin';
import { tripLocation } from '../../src/index';

const KEY = 'k'.repeat(64);
const db = () => admin.firestore();
let seq = 0;

async function makeTrip(fields: Record<string, unknown> = {}) {
  const uid = `loc_user_${Date.now()}_${seq++}`;
  const tripId = `loc_trip_${Date.now()}_${seq++}`;
  const old = admin.firestore.Timestamp.fromMillis(Date.now() - 5 * 60 * 1000);
  await db().doc(`users/${uid}/trips/${tripId}`).set({
    uid, status: 'active', locationKey: KEY, lastLocation: { lat: 6.5, lng: 3.3 }, lastUpdate: old, ...fields,
  });
  await db().doc(`sharedTrips/${tripId}`).set({
    uid, tripId, status: 'active', lastLocation: { lat: 6.5, lng: 3.3 }, lastUpdate: old,
  });
  return { uid, tripId };
}

/** Call the HTTPS handler with a minimal request/response pair. */
function post(body: unknown, method = 'POST'): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const res: any = {
      statusCode: 200,
      status(code: number) { this.statusCode = code; return this; },
      json(payload: unknown) { resolve({ status: this.statusCode, body: payload }); },
    };
    Promise.resolve((tripLocation as any)({ method, body }, res)).catch(reject);
  });
}

const shared = async (tripId: string) => (await db().doc(`sharedTrips/${tripId}`).get()).data()!;

test('valid update is written to the private and public trip documents', async () => {
  const { uid, tripId } = await makeTrip();
  const before = (await shared(tripId)).lastUpdate.toMillis();

  const res = await post({ uid, tripId, key: KEY, lat: 6.7, lng: 4.9, accuracy: 12 });

  assert.deepEqual(res, { status: 200, body: { ok: true, written: true } });
  const pub = await shared(tripId);
  assert.deepEqual(pub.lastLocation, { lat: 6.7, lng: 4.9, accuracy: 12 });
  assert.ok(pub.lastUpdate.toMillis() > before);
  const priv = (await db().doc(`users/${uid}/trips/${tripId}`).get()).data()!;
  assert.deepEqual(priv.lastLocation, { lat: 6.7, lng: 4.9, accuracy: 12 });
  assert.equal(pub.locationKey, undefined, 'key never reaches the public doc');
});

test('the first position becomes the start point, and later ones leave it alone', async () => {
  const fresh = await makeTrip();
  await post({ uid: fresh.uid, tripId: fresh.tripId, key: KEY, lat: 6.45, lng: 3.39 });
  const started = (await db().doc(`users/${fresh.uid}/trips/${fresh.tripId}`).get()).data()!;
  assert.deepEqual(started.startLocation, { lat: 6.45, lng: 3.39 });
  assert.equal((await shared(fresh.tripId)).startLocation, undefined, 'start point stays private');

  const known = await makeTrip({ startLocation: { lat: 6.6, lng: 3.35 } });
  await post({ uid: known.uid, tripId: known.tripId, key: KEY, lat: 6.7, lng: 4.9 });
  const later = (await db().doc(`users/${known.uid}/trips/${known.tripId}`).get()).data()!;
  assert.deepEqual(later.startLocation, { lat: 6.6, lng: 3.35 });
});

test('wrong key, missing key and unknown trip are all refused the same way', async () => {
  const { uid, tripId } = await makeTrip();

  for (const body of [
    { uid, tripId, key: 'x'.repeat(64), lat: 6.7, lng: 4.9 },
    { uid, tripId, lat: 6.7, lng: 4.9 },
    { uid, tripId: 'does_not_exist', key: KEY, lat: 6.7, lng: 4.9 },
  ]) {
    const res = await post(body);
    assert.equal(res.status, 403);
  }
  assert.deepEqual((await shared(tripId)).lastLocation, { lat: 6.5, lng: 3.3 });
});

test('a trip without a key cannot be updated with an empty key', async () => {
  const { uid, tripId } = await makeTrip({ locationKey: '' });
  assert.equal((await post({ uid, tripId, key: '', lat: 6.7, lng: 4.9 })).status, 403);
});

test('malformed requests are rejected', async () => {
  const { uid, tripId } = await makeTrip();
  assert.equal((await post({ uid, tripId, key: KEY, lat: 96, lng: 4.9 })).status, 400);
  assert.equal((await post({ uid, tripId, key: KEY, lat: '6.7', lng: 4.9 })).status, 400);
  assert.equal((await post({ uid: 'a/b', tripId, key: KEY, lat: 6.7, lng: 4.9 })).status, 400);
  assert.equal((await post({ uid, tripId, key: KEY, lat: 6.7, lng: 4.9 }, 'GET')).status, 405);
});

test('ended trips stop accepting updates', async () => {
  const { uid, tripId } = await makeTrip({ status: 'completed' });
  assert.equal((await post({ uid, tripId, key: KEY, lat: 6.7, lng: 4.9 })).status, 410);
});

test('emergency trips keep accepting updates', async () => {
  const { uid, tripId } = await makeTrip({ status: 'emergency' });
  assert.equal((await post({ uid, tripId, key: KEY, lat: 6.7, lng: 4.9 })).body.written, true);
});

test('updates arriving too fast are acknowledged but not written', async () => {
  const { uid, tripId } = await makeTrip();
  await post({ uid, tripId, key: KEY, lat: 6.7, lng: 4.9 });

  const res = await post({ uid, tripId, key: KEY, lat: 6.8, lng: 5.0 });

  assert.deepEqual(res.body, { ok: true, written: false });
  assert.equal((await shared(tripId)).lastLocation.lat, 6.7);
});
