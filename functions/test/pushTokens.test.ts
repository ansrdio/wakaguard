import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isDeadTokenError } from '../src/pushTokens';

test('a link FCM says is gone is dead', () => {
  assert.equal(isDeadTokenError(Object.assign(new Error('x'), { code: 'messaging/registration-token-not-registered' })), true);
  assert.equal(isDeadTokenError(Object.assign(new Error('x'), { code: 'messaging/invalid-registration-token' })), true);
  // As the live failures were logged
  assert.equal(isDeadTokenError(new Error('NotRegistered')), true);
});

test('a passing failure is not', () => {
  assert.equal(isDeadTokenError(Object.assign(new Error('x'), { code: 'messaging/server-unavailable' })), false);
  assert.equal(isDeadTokenError(Object.assign(new Error('x'), { code: 'messaging/internal-error' })), false);
  assert.equal(isDeadTokenError(new Error('timeout')), false);
  assert.equal(isDeadTokenError(null), false);
  assert.equal(isDeadTokenError(undefined), false);
});
