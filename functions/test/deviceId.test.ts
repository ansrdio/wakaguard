import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getDeviceId, sendsTripLocation } from '../../src/lib/deviceId';

test('sendsTripLocation: the device a trip was started on sends its positions', () => {
  assert.equal(sendsTripLocation('phone-a', 'phone-a'), true);
});

test('sendsTripLocation: another device signed in to the same account does not', () => {
  assert.equal(sendsTripLocation('phone-a', 'phone-b'), false);
});

test('sendsTripLocation: a trip from an older version, with no device recorded, is sent by any device', () => {
  assert.equal(sendsTripLocation(undefined, 'phone-b'), true);
  assert.equal(sendsTripLocation(null, 'phone-b'), true);
  assert.equal(sendsTripLocation('', 'phone-b'), true);
});

test('getDeviceId: gives the same id every time, even with no browser storage', () => {
  const first = getDeviceId();
  assert.ok(first.length >= 10);
  assert.equal(getDeviceId(), first);
});
