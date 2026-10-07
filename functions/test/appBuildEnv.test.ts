import { test } from 'node:test';
import assert from 'node:assert/strict';
// @ts-expect-error plain JavaScript module shared with the build scripts
import { checkAppBuildEnv } from '../../scripts/app-env.mjs';

const good = {
  NEXT_PUBLIC_FIREBASE_API_KEY: 'key',
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'routepulse-5701f.firebaseapp.com',
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'routepulse-5701f',
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: 'routepulse-5701f.firebasestorage.app',
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '123',
  NEXT_PUBLIC_FIREBASE_APP_ID: '1:123:web:abc',
  NEXT_PUBLIC_MAP_TILE_URL: 'https://tiles.example/{z}/{x}/{y}.png?key=k',
};

test('a complete production configuration passes with no warnings', () => {
  assert.deepEqual(checkAppBuildEnv(good), { errors: [], warnings: [] });
});

test('missing Firebase settings stop the build and are named', () => {
  const { errors } = checkAppBuildEnv({ ...good, NEXT_PUBLIC_FIREBASE_API_KEY: '', NEXT_PUBLIC_FIREBASE_APP_ID: undefined });
  assert.equal(errors.length, 1);
  assert.match(errors[0], /NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_APP_ID/);
});

test('emulator and demo settings stop the build', () => {
  const { errors } = checkAppBuildEnv({
    ...good,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'demo-wakaguard',
    NEXT_PUBLIC_USE_FIREBASE_EMULATORS: 'true',
  });
  assert.equal(errors.length, 2);
  assert.match(errors[0], /demo project/);
  assert.match(errors[1], /EMULATORS is on/);
});

test('a development server address stops the build', () => {
  const { errors } = checkAppBuildEnv({ ...good, CAP_SERVER_URL: 'http://192.168.1.20:3000' });
  assert.match(errors[0], /development server/);
});

test('a non-https public address stops the build', () => {
  assert.match(checkAppBuildEnv({ ...good, NEXT_PUBLIC_APP_URL: 'http://localhost:3217' }).errors[0], /public https address/);
  assert.deepEqual(checkAppBuildEnv({ ...good, NEXT_PUBLIC_APP_URL: 'https://wakaguard.com' }).errors, []);
});

test('the default map source is allowed but flagged', () => {
  const { errors, warnings } = checkAppBuildEnv({ ...good, NEXT_PUBLIC_MAP_TILE_URL: undefined });
  assert.deepEqual(errors, []);
  assert.match(warnings[0], /OpenStreetMap/);
});
