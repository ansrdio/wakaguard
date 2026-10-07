import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pathToDraw, readTripPath, tripTitle } from '../../src/lib/tripPath';

const p = (lat: number, at: number) => ({ lat, lng: 3.35, at });

test('readTripPath: drops anything malformed and sorts by time', () => {
  const raw = [p(6.62, 3), 'x', null, { lat: 6.6 }, { lat: 91, lng: 3, at: 1 }, p(6.6, 1), { ...p(6.61, 2), extra: 'ignored' }];
  assert.deepEqual(readTripPath(raw), [p(6.6, 1), p(6.61, 2), p(6.62, 3)]);
  assert.deepEqual(readTripPath(null), []);
  assert.deepEqual(readTripPath('not a list'), []);
});

test('pathToDraw: the line ends at the latest position', () => {
  const path = [p(6.6, 1), p(6.61, 2)];
  assert.deepEqual(pathToDraw(path, { lat: 6.615, lng: 3.35 }), [[6.6, 3.35], [6.61, 3.35], [6.615, 3.35]]);
  assert.deepEqual(pathToDraw(path, { lat: 6.61, lng: 3.35 }), [[6.6, 3.35], [6.61, 3.35]], 'no doubled end point');
  assert.deepEqual(pathToDraw(path, null), [[6.6, 3.35], [6.61, 3.35]]);
  assert.deepEqual(pathToDraw([], { lat: 6.6, lng: 3.35 }), [[6.6, 3.35]]);
  assert.deepEqual(pathToDraw([], null), []);
});

test('tripTitle: uses what is known', () => {
  assert.equal(tripTitle('Ada', 'Ikeja'), "Ada's trip to Ikeja");
  assert.equal(tripTitle('Ada', ''), "Ada's trip");
  assert.equal(tripTitle('', 'Ikeja'), 'Trip to Ikeja');
  assert.equal(tripTitle(undefined, null), 'Shared trip');
});
