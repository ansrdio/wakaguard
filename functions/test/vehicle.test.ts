import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as server from '../src/vehicle';
import { cleanPlate, cleanVehicleDetails, MAX_PLATE_LENGTH, MAX_VEHICLE_DETAILS_LENGTH, readVehicle, storedVehicle, vehicleSummary } from '../../src/lib/vehicle';
import { buildOverdueMessage, buildSosMessage } from '../src/templates';

test('the app and the server keep the same limits', () => {
  assert.equal(MAX_PLATE_LENGTH, server.MAX_PLATE_LENGTH);
  assert.equal(MAX_VEHICLE_DETAILS_LENGTH, server.MAX_VEHICLE_DETAILS_LENGTH);
});

test('a plate is tidied, not checked against a format', () => {
  assert.equal(cleanPlate('  abc  12-x! '), 'ABC 12-X');
  assert.equal(cleanPlate('A'.repeat(20)), 'A'.repeat(MAX_PLATE_LENGTH));
  assert.equal(cleanPlate(42), '');
  assert.equal(cleanVehicleDetails('  Blue   bus\nfrom the park '), 'Blue bus from the park');
  assert.equal(cleanVehicleDetails('x'.repeat(80)).length, MAX_VEHICLE_DETAILS_LENGTH);
});

test('nothing typed is no vehicle; either box alone is enough', () => {
  assert.equal(readVehicle(' ', ''), null);
  assert.deepEqual(readVehicle('ab 1', ''), { plate: 'AB 1', details: '' });
  assert.deepEqual(readVehicle('', 'Blue keke'), { plate: '', details: 'Blue keke' });
  assert.equal(storedVehicle(null), null);
  assert.deepEqual(storedVehicle({ plate: 'ab 1', details: 7 }), { plate: 'AB 1', details: '' });
  assert.equal(vehicleSummary({ plate: 'AB 1', details: 'Blue keke' }), 'Plate AB 1 \u00b7 Blue keke');
  assert.equal(vehicleSummary({ plate: '', details: 'Blue keke' }), 'Blue keke');
});

test('the server cleans what the app saved, and links never reach contacts', () => {
  assert.deepEqual(server.readTripVehicle({ vehicle: { plate: 'ab 1', details: 'see https://x.example now' } }), { plate: 'AB 1', details: 'see now' });
  assert.deepEqual(server.vehicleForContacts({ vehicle: { plate: '', details: '' } }), {});
  assert.deepEqual(server.vehicleForContacts({}), {});
  assert.equal(server.plateForText({ vehicle: { plate: '', details: 'Blue bus' } }), null);
  assert.equal(server.plateForText({ vehicle: { plate: 'ab 1' } }), 'AB 1');
});

test('the alert texts carry the plate only', () => {
  const overdue = buildOverdueMessage({ userName: 'Ada', kind: 'trip', deadlineMs: Date.UTC(2026, 9, 6, 15, 30), destination: 'Ibadan', plate: 'AB 1' });
  assert.match(overdue, /No location was received\. Vehicle plate: AB 1\. Please call them\./);
  const sos = buildSosMessage({ userName: 'Ada', plate: 'AB 1' });
  assert.match(sos, /^WakaGuard SOS: Ada needs help\. Vehicle plate: AB 1\. Call them or 112\./);
  assert.doesNotMatch(buildSosMessage({ userName: 'Ada' }), /Vehicle/);
});

test('the plate is left out only when it would make the overdue text a third page', () => {
  const longest = buildOverdueMessage({
    userName: 'W'.repeat(30), kind: 'trip', deadlineMs: Date.UTC(2026, 9, 6, 15, 30), destination: 'D'.repeat(40),
    lat: -12.345678, lng: -123.456789, lastUpdateMs: Date.UTC(2026, 9, 6, 15, 30), token: 'Zk3_9aQbT-1xYp0LmN4rSw', plate: 'P'.repeat(12),
  });
  assert.doesNotMatch(longest, /Vehicle plate/);
  const usual = buildOverdueMessage({
    userName: 'Ada', kind: 'trip', deadlineMs: Date.UTC(2026, 9, 6, 15, 30), destination: 'Ibadan',
    lat: 7.38, lng: 3.95, lastUpdateMs: Date.UTC(2026, 9, 6, 15, 10), token: 'Zk3_9aQbT-1xYp0LmN4rSw', plate: 'AB 123 CD',
  });
  assert.match(usual, /Vehicle plate: AB 123 CD\./);
});
