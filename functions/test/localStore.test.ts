import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RESTART_GAP_MS, errorText, isLocalStoreFailure, mayRestart } from '../../src/lib/localStore';

// The two lines an iPhone 16 logged when the on-phone database stopped working in the background
const UNHANDLED = 'Attempt to get a record from database without an in-progress transaction';
const ASSERTION =
  'FIRESTORE (12.8.0) INTERNAL ASSERTION FAILED: Unexpected state (ID: b815) CONTEXT: {"Pc":"Attempt to get a record from database without an in-progress transaction"}';

test('isLocalStoreFailure: the errors the iPhone gave', () => {
  assert.equal(isLocalStoreFailure(new Error(UNHANDLED)), true);
  assert.equal(isLocalStoreFailure(new Error(ASSERTION)), true);
});

test('isLocalStoreFailure: other faults of the on-phone database', () => {
  assert.equal(
    isLocalStoreFailure({ code: 'unavailable', message: "IndexedDB transaction 'Locally write mutations' failed: UnknownError" }),
    true
  );
  assert.equal(isLocalStoreFailure(new Error('Connection to Indexed Database server lost. Refresh the page to try again')), true);
});

test('isLocalStoreFailure: ordinary failures are not it', () => {
  // What a working database answers when asked for a document it does not hold
  assert.equal(isLocalStoreFailure({ code: 'unavailable', message: 'Failed to get document from cache. (However, this document may exist on the server.)' }), false);
  assert.equal(isLocalStoreFailure({ code: 'permission-denied', message: 'Missing or insufficient permissions.' }), false);
  assert.equal(isLocalStoreFailure({ code: 'unavailable', message: 'Failed to get document because the client is offline.' }), false);
  assert.equal(isLocalStoreFailure(new Error('Network request failed')), false);
  assert.equal(isLocalStoreFailure(null), false);
  assert.equal(isLocalStoreFailure(undefined), false);
});

test('mayRestart: once, then not again until the gap has passed', () => {
  const now = 1_800_000_000_000;
  assert.equal(mayRestart(null, now), true);
  assert.equal(mayRestart(now - 1000, now), false);
  assert.equal(mayRestart(now - RESTART_GAP_MS + 1, now), false);
  assert.equal(mayRestart(now - RESTART_GAP_MS, now), true);
});

test('mayRestart: a remembered time that makes no sense does not block a restart', () => {
  assert.equal(mayRestart(0, 1_800_000_000_000), true);
  assert.equal(mayRestart(Number.NaN, 1_800_000_000_000), true);
});

test('errorText: name, code and message on one line', () => {
  assert.equal(errorText({ name: 'FirebaseError', code: 'unavailable', message: 'offline' }), 'FirebaseError | unavailable | offline');
  assert.equal(errorText(new Error(UNHANDLED)), `Error | ${UNHANDLED}`);
  assert.equal(errorText('plain text'), 'plain text');
});
