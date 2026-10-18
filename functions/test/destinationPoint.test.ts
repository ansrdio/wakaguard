import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readPoint } from '../../src/lib/destinationPoint';

test('a destination pin is a real point, rounded to about a metre', () => {
  assert.deepEqual(readPoint({ lat: 6.6018123, lng: 3.3515456 }), { lat: 6.60181, lng: 3.35155 });
  assert.equal(readPoint(null), null);
  assert.equal(readPoint({ lat: '6.6', lng: 3.3 }), null);
  assert.equal(readPoint({ lat: 91, lng: 3.3 }), null);
  assert.equal(readPoint({ lat: NaN, lng: 3.3 }), null);
});
