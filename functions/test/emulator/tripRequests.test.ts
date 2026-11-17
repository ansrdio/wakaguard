/**
 * "Let me know you got there" links (build 29), against the emulators.
 * Run with: npm run test:monitor
 */
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import * as admin from 'firebase-admin';
import '../../src/index';
import { createRequest, deleteTripRequests, MAX_A_DAY, readRequest, REQUEST_DAYS, TRIP_REQUESTS } from '../../src/tripRequests';
import { KINDS } from '../../src/recordRetention';

const DAY = 24 * 60 * 60 * 1000;
const db = () => admin.firestore();
// Not a real person's number: the emulators never text, and nothing here is sent
const ASKER_TYPED = '0800 000 0001';
const ASKER = '+2348000000001';

before(() => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'Firestore emulator must be running');
  assert.ok(process.env.FIREBASE_AUTH_EMULATOR_HOST, 'Auth emulator must be running');
});

async function person(confirmed: boolean) {
  const uid = `ask_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await admin.auth().createUser({ uid, email: `${uid}@example.com`, emailVerified: confirmed });
  return uid;
}

test('a confirmed account makes a link; someone else opens it and sees the name and number', async () => {
  const mum = await person(true);
  const child = await person(false);
  const now = Date.now();
  const made = await createRequest(mum, { name: '  Mum ', phone: ASKER_TYPED }, now);
  assert.equal(made.ok, true);
  const id = (made as { id: string }).id;

  const stored = (await db().doc(`${TRIP_REQUESTS}/${id}`).get()).data();
  assert.equal(stored?.phoneE164, ASKER);
  assert.equal(stored?.expiresAt.toMillis(), now + REQUEST_DAYS * DAY);

  assert.deepEqual(await readRequest(child, { id }, now + DAY), { ok: true, name: 'Mum', phone: ASKER });
  assert.deepEqual(await readRequest(mum, { id }, now), { ok: false, problem: 'own' }, 'not for the asker themselves');
  assert.deepEqual(await readRequest(child, { id }, now + REQUEST_DAYS * DAY + 1), { ok: false, problem: 'expired' });
  assert.deepEqual(await readRequest(child, { id: 'nothing-like-it' }, now), { ok: false, problem: 'not_found' });
});

test('a link needs a name, a Nigerian mobile number and a confirmed account', async () => {
  const unconfirmed = await person(false);
  const confirmed = await person(true);
  const now = Date.now();
  assert.deepEqual(await createRequest(confirmed, { name: '', phone: ASKER }, now), { ok: false, problem: 'name' });
  assert.deepEqual(await createRequest(confirmed, { name: 'Mum', phone: '+447700900000' }, now), { ok: false, problem: 'phone' });
  assert.deepEqual(await createRequest(unconfirmed, { name: 'Mum', phone: ASKER }, now), { ok: false, problem: 'not_confirmed' });
});

test(`at most ${MAX_A_DAY} links a day`, async () => {
  const busy = await person(true);
  const now = Date.now();
  for (let i = 0; i < MAX_A_DAY; i++) assert.equal((await createRequest(busy, { name: 'Mum', phone: ASKER }, now)).ok, true);
  assert.deepEqual(await createRequest(busy, { name: 'Mum', phone: ASKER }, now), { ok: false, problem: 'too_many' });
  assert.equal((await createRequest(busy, { name: 'Mum', phone: ASKER }, now + DAY + 1)).ok, true, 'a day later it works again');
});

test("deleting the asker's account removes their links, and the daily deletion removes expired ones", async () => {
  const mum = await person(true);
  const now = Date.now();
  const made = await createRequest(mum, { name: 'Mum', phone: ASKER }, now);
  assert.equal(await deleteTripRequests(mum), 1);
  assert.equal((await db().doc(`${TRIP_REQUESTS}/${(made as { id: string }).id}`).get()).exists, false);

  const kind = KINDS.find((k) => k.name === 'tripRequests');
  assert.ok(kind, 'the daily deletion knows about the links');
  const old = await createRequest(await person(true), { name: 'Dad', phone: ASKER }, now - 8 * DAY);
  const found = await kind.query(db(), now).get();
  assert.ok(found.docs.some((d) => d.id === (old as { id: string }).id), 'a link 8 days old is due to go');
});
