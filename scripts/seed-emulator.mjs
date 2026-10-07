/**
 * Creates a test account in the local Firebase emulators so the app can be
 * tried without touching a real project.
 *
 *   npm run emulators:all      (in one terminal)
 *   npm run seed:emulator      (in another)
 *
 * The account only exists inside the emulators and is wiped when they stop.
 * Pass --with-contacts to also add two trusted contacts.
 */

import { createRequire } from 'node:module';

const PROJECT_ID = 'demo-wakaguard';

// Test-only sign-in for the emulator. Never use these for a real account.
export const TEST_USER = {
  uid: 'test-traveller',
  email: 'traveller@wakaguard.test',
  password: 'Emulator-only-1234',
  username: 'traveller',
};

process.env.FIREBASE_AUTH_EMULATOR_HOST ||= '127.0.0.1:9099';
process.env.FIRESTORE_EMULATOR_HOST ||= '127.0.0.1:8080';
process.env.GCLOUD_PROJECT = PROJECT_ID;

for (const name of ['FIREBASE_AUTH_EMULATOR_HOST', 'FIRESTORE_EMULATOR_HOST']) {
  const host = process.env[name].split(':')[0];
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(host)) {
    console.error(`${name} is ${process.env[name]}. This script only writes to local emulators.`);
    process.exit(1);
  }
}

// firebase-admin is installed for the Cloud Functions, so load it from there
const require = createRequire(new URL('../functions/package.json', import.meta.url));
const admin = require('firebase-admin');

admin.initializeApp({ projectId: PROJECT_ID });
const auth = admin.auth();
const db = admin.firestore();

try {
  await auth.deleteUser(TEST_USER.uid).catch(() => {});
  await auth.createUser({
    uid: TEST_USER.uid,
    email: TEST_USER.email,
    password: TEST_USER.password,
    emailVerified: true,
  });

  const now = admin.firestore.FieldValue.serverTimestamp();
  await db.doc(`users/${TEST_USER.uid}`).set({
    createdAt: now,
    blockedUids: [],
    username: TEST_USER.username,
    usernameUpdatedAt: now,
  });
  await db.doc(`usernames/${TEST_USER.username}`).set({
    uid: TEST_USER.uid,
    usernameLower: TEST_USER.username,
    createdAt: now,
  });

  if (process.argv.includes('--with-contacts')) {
    const contacts = [
      { id: '2348030000001', name: 'Mum', phoneE164: '+2348030000001' },
      { id: '2348030000002', name: 'Tunde', phoneE164: '+2348030000002' },
    ];
    for (const c of contacts) {
      await db.doc(`users/${TEST_USER.uid}/trustedContacts/${c.id}`).set({
        name: c.name,
        phone: c.phoneE164,
        phoneE164: c.phoneE164,
        notifyOnSOS: true,
        notifyOnCheckIn: true,
        notifyOnTripShare: true,
        createdAt: now,
      });
    }
  }

  console.log(`Seeded ${TEST_USER.email} in the ${PROJECT_ID} emulators.`);
  console.log('The sign-in details are in scripts/seed-emulator.mjs.');
  process.exit(0);
} catch (error) {
  console.error('Seeding failed. Are the emulators running? (npm run emulators:all)');
  console.error(error?.message || error);
  process.exit(1);
}
