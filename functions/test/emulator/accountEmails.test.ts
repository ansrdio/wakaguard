/**
 * WakaGuard's own account emails, against the Auth and Firestore emulators.
 * Nothing is sent: the mock provider keeps what it was given.
 * Run with: npm run test:monitor
 */
process.env.MAIL_PROVIDER = 'mock';
process.env.APP_BASE_URL = 'https://wakaguard.com';

import { test, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import * as admin from 'firebase-admin';
import { sendPasswordResetEmail, sendVerificationEmail } from '../../src/index';
import { mockOutbox } from '../../src/mail';
import { emailLinkFrom } from '../../../src/lib/emailLinks';

let seq = 0;
const AUTH = () => `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1`;

before(() => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'Firestore emulator must be running');
  assert.ok(process.env.FIREBASE_AUTH_EMULATOR_HOST, 'Auth emulator must be running');
});
beforeEach(() => {
  mockOutbox.length = 0;
  process.env.MAIL_PROVIDER = 'mock';
});

async function makePerson(emailVerified = false) {
  const uid = `mail_${Date.now()}_${seq++}`;
  const email = `${uid}@example.com`;
  await admin.auth().createUser({ uid, email, password: 'first-password', emailVerified });
  return { uid, email };
}

const verifyAs = (uid: string, data: unknown = { from: 'app' }, provider = 'password') =>
  (sendVerificationEmail as any).run(data, { auth: { uid, token: { firebase: { sign_in_provider: provider } } } });
const resetFor = (email: unknown, from = 'app') => (sendPasswordResetEmail as any).run({ email, from }, {});

async function refusal(call: Promise<unknown>) {
  try {
    await call;
  } catch (error: any) {
    return { code: error.code as string, reason: error.details?.reason as string | undefined };
  }
  return assert.fail('The call should have been refused');
}

/** The link in an email, as our own page would read it. */
function linkIn(text: string) {
  const address = text.split('\n').find((line) => line.startsWith('https://'));
  assert.ok(address, 'the email holds a link');
  const url = new URL(address);
  assert.equal(url.origin + url.pathname, 'https://wakaguard.com/confirm');
  const link = emailLinkFrom(url.search, 'https://wakaguard.com');
  assert.ok(link && link.task !== 'other');
  return link;
}

test('a new account is sent our email, and its link verifies the address', async () => {
  const person = await makePerson();
  assert.deepEqual(await verifyAs(person.uid), { sent: true });

  assert.equal(mockOutbox.length, 1);
  const email = mockOutbox[0];
  assert.equal(email.to, person.email);
  assert.equal(email.subject, 'Confirm your email for WakaGuard');
  assert.doesNotMatch(email.text + email.html, /firebaseapp|127\.0\.0\.1|apiKey/);

  const link = linkIn(email.text);
  assert.deepEqual({ task: link.task, appOpens: link.appOpens }, { task: 'verify', appOpens: true });

  // What the page does with the code
  const applied = await fetch(`${AUTH()}/accounts:update?key=fake`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ oobCode: link.code }),
  });
  assert.equal(applied.status, 200);
  assert.equal((await admin.auth().getUser(person.uid)).emailVerified, true);
});

test('an email asked for on the website continues on the website', async () => {
  const person = await makePerson();
  await verifyAs(person.uid, { from: 'web' });
  assert.equal(linkIn(mockOutbox[0].text).appOpens, false);
  // Anything else the caller might send is treated as the website
  await verifyAs(person.uid, { from: 'somewhere-else' });
  assert.equal(linkIn(mockOutbox[1].text).appOpens, false);
});

test('nothing is sent to an address that is already verified, to a guest, or to nobody', async () => {
  const verified = await makePerson(true);
  assert.deepEqual(await verifyAs(verified.uid), { sent: false, alreadyVerified: true });

  const guest = await makePerson();
  assert.equal((await refusal(verifyAs(guest.uid, {}, 'anonymous'))).code, 'permission-denied');
  assert.equal((await refusal((sendVerificationEmail as any).run({}, {}))).code, 'unauthenticated');
  assert.equal(mockOutbox.length, 0);
});

test('with no mail provider the app is told to use Firebase\'s own email', async () => {
  const person = await makePerson();
  delete process.env.MAIL_PROVIDER;
  assert.deepEqual(await refusal(verifyAs(person.uid)), { code: 'failed-precondition', reason: 'mail-not-set-up' });
  assert.deepEqual(await refusal(resetFor(person.email)), { code: 'failed-precondition', reason: 'mail-not-set-up' });
  assert.equal(mockOutbox.length, 0);
});

test('an account can only be sent so many verification emails an hour', async () => {
  const person = await makePerson();
  for (let i = 0; i < 5; i++) await verifyAs(person.uid);
  assert.equal((await refusal(verifyAs(person.uid))).code, 'resource-exhausted');
  assert.equal(mockOutbox.length, 5);
});

test('a password reset email is ours too, and its link sets the new password', async () => {
  const person = await makePerson(true);
  assert.deepEqual(await resetFor(`  ${person.email} `), { sent: true });

  assert.equal(mockOutbox.length, 1);
  assert.equal(mockOutbox[0].to, person.email);
  assert.equal(mockOutbox[0].subject, 'Reset your WakaGuard password');
  const link = linkIn(mockOutbox[0].text);
  assert.deepEqual({ task: link.task, appOpens: link.appOpens }, { task: 'reset', appOpens: true });

  const changed = await fetch(`${AUTH()}/accounts:resetPassword?key=fake`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ oobCode: link.code, newPassword: 'second-password' }),
  });
  assert.equal(changed.status, 200);
  const signIn = await fetch(`${AUTH()}/accounts:signInWithPassword?key=fake`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: person.email, password: 'second-password', returnSecureToken: true }),
  });
  assert.equal(signIn.status, 200);
});

test('asking to reset says the same thing whoever the address belongs to', async () => {
  // No account: nothing is sent, and nothing gives that away
  assert.deepEqual(await resetFor(`nobody_${Date.now()}@example.com`), { sent: true });
  assert.equal(mockOutbox.length, 0);

  // Too many for one account: the same answer, and no more email
  const person = await makePerson(true);
  for (let i = 0; i < 7; i++) assert.deepEqual(await resetFor(person.email), { sent: true });
  assert.equal(mockOutbox.length, 5);

  // Not an address at all is the one thing that is refused
  for (const bad of ['', 'ada', 'ada@', 42, null, `${'a'.repeat(250)}@example.com`]) {
    assert.equal((await refusal(resetFor(bad))).code, 'invalid-argument', String(bad));
  }
});
