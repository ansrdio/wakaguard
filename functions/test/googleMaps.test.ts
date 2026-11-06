import { test } from 'node:test';
import assert from 'node:assert/strict';
import { groupNearby, worldPixel } from '../../src/lib/mapGroups';
import { scriptUrl } from '../../src/lib/googleMaps';

const at = (id: string, lat: number, lng: number) => ({ id, location: { lat, lng } });

test("Google's script is asked for in English, as seen from Nigeria, loading in the background", () => {
  const url = new URL(scriptUrl('test-key'));
  assert.equal(url.origin + url.pathname, 'https://maps.googleapis.com/maps/api/js');
  assert.equal(url.searchParams.get('key'), 'test-key');
  assert.equal(url.searchParams.get('language'), 'en');
  assert.equal(url.searchParams.get('region'), 'NG');
  assert.equal(url.searchParams.get('loading'), 'async');
  assert.ok(url.searchParams.get('callback'));
});

test('world pixels: the middle of the map at zoom 0 is (128, 128), and each zoom doubles the distance', () => {
  const middle = worldPixel(0, 0, 0);
  assert.ok(Math.abs(middle.x - 128) < 1e-9 && Math.abs(middle.y - 128) < 1e-9);
  const a = worldPixel(6.5, 3.38, 10);
  const b = worldPixel(6.5, 3.38, 11);
  assert.ok(Math.abs(b.x - 2 * a.x) < 1e-6 && Math.abs(b.y - 2 * a.y) < 1e-6);
});

test('reports a few metres apart are one group zoomed out, and apart once zoomed in', () => {
  // Two reports about 200 m apart in Ikeja, one in Abuja
  const reports = [at('a', 6.6018, 3.3515), at('b', 6.6036, 3.3515), at('c', 9.0579, 7.4951)];
  const far = groupNearby(reports, 50, 10);
  assert.deepEqual(far.map((g) => g.members.map((r) => r.id)), [['a', 'b'], ['c']]);
  assert.ok(Math.abs(far[0].center.lat - 6.6027) < 1e-9);

  const close = groupNearby(reports, 50, 17);
  assert.deepEqual(close.map((g) => g.members.map((r) => r.id)), [['a'], ['b'], ['c']]);
});

test('a radius of 0 leaves every report on its own, even in one spot', () => {
  const reports = [at('a', 6.6, 3.35), at('b', 6.6, 3.35)];
  assert.equal(groupNearby(reports, 0, 5).length, 2);
  assert.equal(groupNearby(reports, 50, 5).length, 1);
});

test('no reports, no groups', () => {
  assert.deepEqual(groupNearby([], 50, 12), []);
});
