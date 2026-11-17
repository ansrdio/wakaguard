import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  noteSignedIn,
  wasSignedIn,
  signInWaitMs,
  waitLeftMs,
  SIGNED_IN_WAIT_MS,
  SIGNED_OUT_WAIT_MS,
  SLOW_SIGN_IN_MS,
} from '../../src/lib/signedInHint';

type Store = Map<string, string>;

function withStorage(store: Store = new Map()) {
  (globalThis as unknown as { window: unknown }).window = {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      removeItem: (key: string) => void store.delete(key),
    },
  };
  return store;
}

afterEach(() => {
  delete (globalThis as unknown as { window?: unknown }).window;
});

test('a phone where nobody has signed in yet is not waited for longer', () => {
  withStorage();
  assert.equal(wasSignedIn(), false);
  assert.equal(signInWaitMs(wasSignedIn()), SIGNED_OUT_WAIT_MS);
});

test('once Firebase reports an account, the next start waits the long time', () => {
  withStorage();
  noteSignedIn(true);
  assert.equal(wasSignedIn(), true);
  assert.equal(signInWaitMs(wasSignedIn()), SIGNED_IN_WAIT_MS);
});

test('signing out, deleting the account or a sign-in that has ended clears the note', () => {
  withStorage();
  noteSignedIn(true);
  noteSignedIn(false);
  assert.equal(wasSignedIn(), false);
});

test('the note survives a restart of the app (it lives in the phone storage)', () => {
  const store = withStorage();
  noteSignedIn(true);
  withStorage(store);
  assert.equal(wasSignedIn(), true);
});

test('with no storage at all, nothing breaks and the app waits the short time, as before', () => {
  assert.doesNotThrow(() => noteSignedIn(true));
  assert.equal(wasSignedIn(), false);
  (globalThis as unknown as { window: unknown }).window = {
    localStorage: {
      getItem: () => { throw new Error('blocked'); },
      setItem: () => { throw new Error('blocked'); },
      removeItem: () => { throw new Error('blocked'); },
    },
  };
  assert.doesNotThrow(() => noteSignedIn(false));
  assert.equal(wasSignedIn(), false);
});

test('the long wait covers Firebase\'s two start-up requests at 30 seconds each', () => {
  assert.ok(SIGNED_IN_WAIT_MS >= 2 * 30_000);
  assert.equal(SIGNED_OUT_WAIT_MS, 5_000);
});

test('"this takes longer" appears after the old 5 seconds and well before the wait ends', () => {
  assert.ok(SLOW_SIGN_IN_MS > SIGNED_OUT_WAIT_MS);
  assert.ok(SLOW_SIGN_IN_MS < SIGNED_IN_WAIT_MS);
});

test('the wait is counted once from the start, not again by a screen that asks later', () => {
  const start = 1_000_000;
  assert.equal(waitLeftMs(start, start, true), SIGNED_IN_WAIT_MS);
  assert.equal(waitLeftMs(start, start + 20_000, true), SIGNED_IN_WAIT_MS - 20_000);
  assert.equal(waitLeftMs(start, start + 2_000, false), SIGNED_OUT_WAIT_MS - 2_000);
});

test('a screen that asks after the wait has run out does not wait at all', () => {
  const start = 1_000_000;
  assert.equal(waitLeftMs(start, start + SIGNED_IN_WAIT_MS + 1, true), 0);
  assert.equal(waitLeftMs(start, start + 6_000, false), 0);
});
