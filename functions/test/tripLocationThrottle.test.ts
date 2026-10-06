import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HEARTBEAT_MS, MIN_INTERVAL_MS, shouldSendFix } from '../../src/lib/tripLocation';

const far = () => 500;
const near = () => 5;
const T0 = 1_000_000;
const prev = { lat: 6.5, lng: 3.3, at: T0 };
const next = { lat: 6.6, lng: 3.4 };

test('first fix is always sent', () => {
  assert.equal(shouldSendFix(null, next, T0, near), true);
});

test('nothing is sent inside the minimum interval, even after moving', () => {
  assert.equal(shouldSendFix(prev, next, T0 + MIN_INTERVAL_MS - 1, far), false);
});

test('movement is sent once the minimum interval has passed', () => {
  assert.equal(shouldSendFix(prev, next, T0 + MIN_INTERVAL_MS, far), true);
  assert.equal(shouldSendFix(prev, next, T0 + MIN_INTERVAL_MS, near), false);
});

test('a stationary phone still sends a heartbeat', () => {
  assert.equal(shouldSendFix(prev, next, T0 + HEARTBEAT_MS, near), true);
});

test('invalid coordinates are never sent', () => {
  assert.equal(shouldSendFix(null, { lat: NaN, lng: 3.3 }, T0, near), false);
});
