import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAX_PATH_POINTS, MIN_PATH_MOVE_M, addPathPoint, distanceMeters, readPath } from '../src/tripPath';

const T0 = Date.UTC(2026, 9, 7, 12, 0, 0);
// Roughly 111 m per 0.001 degree of latitude
const at = (step: number, minutes = step) => ({ lat: 6.6 + step * 0.001, lng: 3.35, at: T0 + minutes * 60000 });

test('distanceMeters: about 111 m for a thousandth of a degree of latitude', () => {
  const d = distanceMeters({ lat: 6.6, lng: 3.35 }, { lat: 6.601, lng: 3.35 });
  assert.ok(d > 110 && d < 112, `got ${d}`);
});

test('addPathPoint: the first position starts the path', () => {
  assert.deepEqual(addPathPoint([], at(0)), [at(0)]);
});

test('addPathPoint: a later position further along is added', () => {
  assert.deepEqual(addPathPoint([at(0)], at(1)), [at(0), at(1)]);
});

test('addPathPoint: standing still adds nothing', () => {
  const jitter = { lat: 6.6 + 0.0001, lng: 3.35, at: T0 + 60000 };
  assert.ok(distanceMeters(at(0), jitter) < MIN_PATH_MOVE_M);
  assert.equal(addPathPoint([at(0)], jitter), null);
});

test('addPathPoint: a repeated or late event adds nothing', () => {
  const path = [at(0), at(2)];
  assert.equal(addPathPoint(path, at(2)), null, 'the same event delivered twice');
  assert.equal(addPathPoint(path, at(5, 1)), null, 'an older event arriving late');
});

test('addPathPoint: a malformed position adds nothing', () => {
  assert.equal(addPathPoint([at(0)], { lat: 200, lng: 3.35, at: T0 + 60000 }), null);
  assert.equal(addPathPoint([at(0)], { lat: Number.NaN, lng: 3.35, at: T0 + 60000 }), null);
});

test('addPathPoint: a long trip stays under the limit and keeps its start and its latest point', () => {
  let path = [at(0)];
  for (let step = 1; step <= 1000; step++) {
    path = addPathPoint(path, at(step)) ?? path;
    assert.ok(path.length <= MAX_PATH_POINTS, `step ${step}: ${path.length} points`);
  }
  assert.deepEqual(path[0], at(0));
  assert.deepEqual(path[path.length - 1], at(1000));
  for (let i = 1; i < path.length; i++) assert.ok(path[i].at > path[i - 1].at, 'still in time order');
});

test('readPath: drops anything malformed and puts the rest in time order', () => {
  const raw = [at(2), 'nonsense', { lat: 6.6 }, null, at(0), { lat: 95, lng: 3, at: T0 }, at(1)];
  assert.deepEqual(readPath(raw), [at(0), at(1), at(2)]);
  assert.deepEqual(readPath(undefined), []);
  assert.deepEqual(readPath({ 0: at(0) }), []);
});
