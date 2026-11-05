/**
 * "Stopped at a checkpoint?" on the contacts' page (build 27), against the
 * Firestore emulator. Run with: npm run test:monitor
 */
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import * as admin from 'firebase-admin';
import { onCheckpointStop } from '../../src/index';

const db = () => admin.firestore();
let seq = 0;

before(() => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'Firestore emulator must be running');
});

async function tripWithPage(status = 'active', pageUid?: string) {
  const uid = `cp_${Date.now()}_${seq++}`;
  const tripId = `cp_trip_${Date.now()}_${seq++}`;
  await db().doc(`users/${uid}/trips/${tripId}`).set({ uid, status, lastLocation: { lat: 6.6, lng: 3.3 } });
  await db().doc(`sharedTrips/${tripId}`).set({ uid: pageUid ?? uid, tripId, status: 'active' });
  return { uid, tripId };
}

async function press(uid: string, data: Record<string, unknown>) {
  const ref = db().doc(`users/${uid}/alerts/checkpoint_${uid}_${seq++}`);
  await ref.set({ type: 'checkpoint_stop', acknowledged: false, ...data });
  await (onCheckpointStop as any).run(await ref.get(), { params: { uid, alertId: ref.id } });
}

const stopsOn = async (tripId: string) => (await db().doc(`sharedTrips/${tripId}`).get()).get('checkpoints');

test('a checkpoint stop on a running trip shows on its page, with the time and where', async () => {
  const { uid, tripId } = await tripWithPage();
  await press(uid, { tripId, location: { lat: 6.51, lng: 3.41 } });
  const stops = await stopsOn(tripId);
  assert.equal(stops.length, 1);
  assert.deepEqual([stops[0].lat, stops[0].lng], [6.51, 3.41]);
  assert.ok(Math.abs(stops[0].atMs - Date.now()) < 60_000);

  // A second press straight after is the same stop
  await press(uid, { tripId });
  assert.equal((await stopsOn(tripId)).length, 1);
});

test('with no fix of its own, the stop takes the trip\'s latest position', async () => {
  const { uid, tripId } = await tripWithPage();
  await press(uid, { tripId });
  const [stop] = await stopsOn(tripId);
  assert.deepEqual([stop.lat, stop.lng], [6.6, 3.3]);
});

test('nothing reaches a page that is not the traveller\'s own, or a trip that has ended', async () => {
  const other = await tripWithPage('active', 'someone_else');
  await press(other.uid, { tripId: other.tripId });
  assert.equal(await stopsOn(other.tripId), undefined);

  const ended = await tripWithPage('completed');
  await press(ended.uid, { tripId: ended.tripId });
  assert.equal(await stopsOn(ended.tripId), undefined);

  const noTrip = await tripWithPage();
  await press(noTrip.uid, { tripId: null });
  await press(noTrip.uid, { tripId: '../bad' });
  assert.equal(await stopsOn(noTrip.tripId), undefined);
});
