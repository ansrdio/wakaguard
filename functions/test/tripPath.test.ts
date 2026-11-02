import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAX_PATH_POINTS, MAX_TRAVEL_SPEED_MPS, MIN_PATH_MOVE_M, addPathPoint, distanceMeters, isWildPosition, pathLengthMeters, readPath, nextPositionStats } from '../src/tripPath';

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

test('positions are counted once each, with the longest silence between two', () => {
  let stats = nextPositionStats(null, 1000);
  assert.deepEqual(stats, { count: 1, firstAtMs: 1000, lastAtMs: 1000, longestGapMs: 0 });
  stats = nextPositionStats(stats, 4000);
  assert.deepEqual(stats, { count: 2, firstAtMs: 1000, lastAtMs: 4000, longestGapMs: 3000 });
  assert.equal(nextPositionStats(stats, 4000), null, 'the same event twice');
  assert.equal(nextPositionStats(stats, 2000), null, 'a late event');
  stats = nextPositionStats(stats!, 5000);
  assert.deepEqual(stats, { count: 3, firstAtMs: 1000, lastAtMs: 5000, longestGapMs: 3000 });
  assert.deepEqual(nextPositionStats({ count: 'x' as unknown as number }, 10), { count: 1, firstAtMs: 10, lastAtMs: 10, longestGapMs: 0 });
});

test('pathLengthMeters: adds up the steps of a path', () => {
  const metres = pathLengthMeters([at(0), at(1), at(2), at(3)]);
  assert.ok(metres > 330 && metres < 336, `about 333 m, got ${metres}`);
  assert.equal(pathLengthMeters([]), 0);
  assert.equal(pathLengthMeters([at(0)]), 0);
});

test('pathLengthMeters: a wild fix far off the route is left out', () => {
  // About 11 km away a minute later, then back on the route
  const wild = { lat: 6.7, lng: 3.35, at: T0 + 60000 };
  const metres = pathLengthMeters([at(0), wild, at(1, 2)]);
  assert.ok(metres > 110 && metres < 112, `only the real step, got ${metres}`);
});

test('isWildPosition: a jump no vehicle could make, and nothing else', () => {
  const start = at(0);
  // About 11 km in a minute, as a rough fix does
  assert.equal(isWildPosition(start, { lat: 6.7, lng: 3.35, at: T0 + 60000 }), true);
  // The same distance after an hour's silence is a trip
  assert.equal(isWildPosition(start, { lat: 6.7, lng: 3.35, at: T0 + 60 * 60000 }), false);
  // Normal driving, and a phone that has not moved
  assert.equal(isWildPosition(start, at(10, 1)), false);
  assert.equal(isWildPosition(start, { ...start, at: T0 + 10000 }), false);
});

test('isWildPosition: a fix much rougher than the last good one', () => {
  const good = { ...at(0), accuracy: 20 };
  const near = at(1, 1);
  assert.equal(isWildPosition(good, { ...near, accuracy: 1500 }), true);
  assert.equal(isWildPosition(good, { ...near, accuracy: 60 }), false);
  // Rough all along, so nothing is known to be better
  assert.equal(isWildPosition({ ...good, accuracy: 1000 }, { ...near, accuracy: 1500 }), false);
  // Without both margins of error there is nothing to compare
  assert.equal(isWildPosition(at(0), { ...near, accuracy: 1500 }), false);
  assert.equal(isWildPosition(good, near), false);
});

test('isWildPosition: a good fix after a rough one is taken, however far it moved', () => {
  const rough = { lat: 6.6, lng: 3.35, at: T0, accuracy: 3000 };
  const settled = { lat: 6.626, lng: 3.35, at: T0 + 30000, accuracy: 12 };
  assert.ok(distanceMeters(rough, settled) / 30 > MAX_TRAVEL_SPEED_MPS, 'too fast if taken at face value');
  assert.equal(isWildPosition(rough, settled), false);
});

test('pathLengthMeters: when the first point was the wild one, counting starts again from the route', () => {
  const wild = { lat: 6.7, lng: 3.35, at: T0 };
  const metres = pathLengthMeters([wild, at(0, 1), at(1, 2), at(2, 3), at(3, 4)]);
  assert.ok(metres > 110 && metres < 112, `the route after it settled, got ${metres}`);
});
