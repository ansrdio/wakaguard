/**
 * "Stop WakaGuard texts to my number" against the Firestore emulator.
 * Run with: npm run test:monitor
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as admin from 'firebase-admin';
import { stopTexts } from '../../src/index';
import { markIfStopped } from '../../src/textOptOut';
import { getTrustedContacts } from '../../src/safetyDelivery';

const db = () => admin.firestore();
let seq = 0;
// Made-up numbers in a range no network gives out
const number = () => `+2340000${String(1000000 + seq++).slice(1)}`;

async function makeTrip(contacts: Array<{ id: string; phoneE164: string }>, tripContactIds?: string[]) {
  const uid = `optout_user_${Date.now()}_${seq++}`;
  const tripId = `optout_trip_${Date.now()}_${seq++}`;
  for (const c of contacts) {
    await db().doc(`users/${uid}/trustedContacts/${c.id}`).set({ name: `Contact ${c.id}`, phoneE164: c.phoneE164 });
  }
  await db().doc(`users/${uid}/trips/${tripId}`).set({ uid, status: 'completed', ...(tripContactIds ? { trustedContactIds: tripContactIds } : {}) });
  await db().doc(`sharedTrips/${tripId}`).set({ uid, tripId, status: 'completed' });
  return { uid, tripId };
}

function call(body: unknown, method = 'POST', origin?: string): Promise<{ status: number; body: any; headers: Record<string, string> }> {
  return new Promise((resolve, reject) => {
    const headers: Record<string, string> = {};
    const res: any = {
      statusCode: 200,
      set(name: string, value: string) { headers[name] = value; return this; },
      status(code: number) { this.statusCode = code; return this; },
      json(payload: unknown) { resolve({ status: this.statusCode, body: payload, headers }); },
      send(payload: unknown) { resolve({ status: this.statusCode, body: payload, headers }); },
    };
    Promise.resolve((stopTexts as any)({ method, body, headers: origin ? { origin } : {} }, res)).catch(reject);
  });
}

const mark = async (path: string) => (await db().doc(path).get()).get('smsOptedOut');

test('a contact stops texts with the trip link, for every traveller who has their number', async () => {
  const phone = number();
  const { uid, tripId } = await makeTrip([{ id: 'c1', phoneE164: phone }, { id: 'c2', phoneE164: number() }]);
  // Someone else who also has this number as a contact
  const other = await makeTrip([{ id: 'x', phoneE164: phone }]);

  assert.deepEqual((await call({ token: tripId, phoneE164: phone })).body, { ok: true, done: 'stopped' });
  const listed = await db().doc(`smsOptOuts/${phone}`).get();
  assert.equal(listed.get('stopped'), true);
  assert.equal(listed.get('viaTripId'), tripId);
  assert.equal(await mark(`users/${uid}/trustedContacts/c1`), true);
  assert.equal(await mark(`users/${uid}/trustedContacts/c2`), undefined);
  assert.equal(await mark(`users/${other.uid}/trustedContacts/x`), true);

  // The server leaves them out of every text from now on
  assert.deepEqual((await getTrustedContacts(uid)).map((c) => c.id), ['c2']);
  assert.deepEqual(await getTrustedContacts(other.uid), []);

  // And texts can be turned back on the same way
  assert.deepEqual((await call({ token: tripId, phoneE164: phone, action: 'resume' })).body, { ok: true, done: 'resumed' });
  assert.equal((await db().doc(`smsOptOuts/${phone}`).get()).get('stopped'), false);
  assert.equal(await mark(`users/${uid}/trustedContacts/c1`), undefined);
  assert.equal(await mark(`users/${other.uid}/trustedContacts/x`), undefined);
  assert.deepEqual((await getTrustedContacts(uid)).map((c) => c.id).sort(), ['c1', 'c2']);
});

test('a number the trip did not text, or a link that is no trip, is refused and changes nothing', async () => {
  const phone = number();
  const stranger = number();
  const { tripId } = await makeTrip([{ id: 'c1', phoneE164: phone }, { id: 'c2', phoneE164: number() }], ['c2']);
  assert.equal((await call({ token: tripId, phoneE164: phone })).status, 403, 'a contact this trip did not text');
  assert.equal((await call({ token: tripId, phoneE164: stranger })).status, 403);
  assert.equal((await call({ token: 'no_such_trip', phoneE164: phone })).status, 403);
  assert.equal((await db().doc(`smsOptOuts/${phone}`).get()).exists, false);
  assert.equal((await db().doc('textOptOutTries/no_such_trip').get()).exists, false, 'nothing written for a code that is no trip');
  assert.equal((await call({ token: tripId, phoneE164: '0800' })).status, 400);
  assert.equal((await call({ token: tripId, phoneE164: phone }, 'GET')).status, 405);
});

test('numbers cannot be guessed one after another from a link', async () => {
  const { tripId } = await makeTrip([{ id: 'c1', phoneE164: number() }]);
  for (let i = 0; i < 10; i++) assert.equal((await call({ token: tripId, phoneE164: number() })).status, 403);
  assert.equal((await call({ token: tripId, phoneE164: number() })).status, 429);
});

test('a contact saved after they stopped texts is marked when saved', async () => {
  const phone = number();
  const { tripId } = await makeTrip([{ id: 'c1', phoneE164: phone }]);
  await call({ token: tripId, phoneE164: phone });
  const later = db().doc(`users/later_${Date.now()}/trustedContacts/new`);
  await later.set({ name: 'New', phoneE164: phone });
  await markIfStopped(later, (await later.get()).data());
  assert.equal((await later.get()).get('smsOptedOut'), true);
  // A mark the app wrote over is put back; one on a number not stopped is taken off
  await later.update({ smsOptedOut: false });
  await markIfStopped(later, (await later.get()).data());
  assert.equal((await later.get()).get('smsOptedOut'), true);
  await later.set({ name: 'New', phoneE164: number(), smsOptedOut: true });
  await markIfStopped(later, (await later.get()).data());
  assert.equal((await later.get()).get('smsOptedOut'), undefined);
});

test('the website may ask before posting; other sites are not named', async () => {
  const asked = await call(undefined, 'OPTIONS', 'https://wakaguard.com');
  assert.equal(asked.status, 204);
  assert.equal(asked.headers['Access-Control-Allow-Origin'], 'https://wakaguard.com');
  assert.equal(asked.headers['Access-Control-Allow-Methods'], 'POST');
  const other = await call(undefined, 'OPTIONS', 'https://example.com');
  assert.equal(other.headers['Access-Control-Allow-Origin'], undefined);
});
