import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lengthForRoute } from '../../src/lib/tripLength';

const DEFAULT = 30;

test('a road time fills in the length when nobody has chosen one', () => {
  assert.deepEqual(lengthForRoute(45, 'default', DEFAULT, DEFAULT), { minutes: 45, source: 'route' });
});

test('a length the person picked themselves is never changed by the road time', () => {
  assert.equal(lengthForRoute(45, 'chosen', 120, DEFAULT), null);
  assert.equal(lengthForRoute(null, 'chosen', 120, DEFAULT), null);
});

test('a new place with a new road time updates a length that came from the road', () => {
  assert.deepEqual(lengthForRoute(60, 'route', 45, DEFAULT), { minutes: 60, source: 'route' });
});

test('the same road time again changes nothing', () => {
  assert.equal(lengthForRoute(45, 'route', 45, DEFAULT), null);
});

test('when the place is cleared, a length from the road goes back to the usual length', () => {
  assert.deepEqual(lengthForRoute(null, 'route', 45, DEFAULT), { minutes: DEFAULT, source: 'default' });
  // Nothing to undo when it never came from the road
  assert.equal(lengthForRoute(null, 'default', DEFAULT, DEFAULT), null);
});
