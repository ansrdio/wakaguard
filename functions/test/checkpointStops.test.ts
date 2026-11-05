import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAX_STOPS_SHOWN, SAME_STOP_MS, withStop } from '../src/checkpointStops';

test('stops are kept in time order, one per press, with a place when there is one', () => {
  const first = withStop(undefined, 1_000_000, { lat: 6.5, lng: 3.4 });
  assert.deepEqual(first, [{ atMs: 1_000_000, lat: 6.5, lng: 3.4 }]);
  assert.equal(withStop(first, 1_000_000 + SAME_STOP_MS - 1, null), null, 'a second press straight after');
  assert.deepEqual(withStop(first, 1_000_000 + SAME_STOP_MS, 'nowhere'), [
    { atMs: 1_000_000, lat: 6.5, lng: 3.4 },
    { atMs: 1_000_000 + SAME_STOP_MS },
  ]);
});

test('a page holds at most 20 stops, and nothing odd from the alert gets onto it', () => {
  const full = Array.from({ length: MAX_STOPS_SHOWN }, (_, i) => ({ atMs: i * SAME_STOP_MS * 2 }));
  assert.equal(withStop(full, 99 * SAME_STOP_MS, null), null);
  assert.deepEqual(withStop([], 5, { lat: 200, lng: 3 }), [{ atMs: 5 }]);
  assert.deepEqual(withStop([], 5, { lat: 6, lng: 3, note: 'x' }), [{ atMs: 5, lat: 6, lng: 3 }]);
});
