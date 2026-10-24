import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MAX_OVERVIEW_LENGTH, readStoredRoute, sameRoute } from '../src/tripRoute';
import { MAX_OVERVIEW_LENGTH as APP_MAX, parseRoute, readRouteOutline, routeToStore } from '../../src/lib/directions';

// A real answer from Mapbox for Yaba to Ikeja, Lagos (23 October 2026)
const ANSWER = JSON.parse(readFileSync(join(__dirname, 'fixtures', 'mapbox-route-yaba-ikeja.json'), 'utf8'));
const route = parseRoute(ANSWER, 'driving-traffic', { lat: 6.6018, lng: 3.3515 })!;
const stored = routeToStore(route);

test('what the app stores is what the server accepts', () => {
  assert.deepEqual(Object.keys(stored).sort(), ['distanceM', 'durationS', 'overview', 'profile']);
  assert.deepEqual(readStoredRoute(stored), stored);
  assert.equal(stored.distanceM, 15898);
  assert.equal(stored.durationS, 1484);
  assert.equal(MAX_OVERVIEW_LENGTH, APP_MAX, 'the app and the server allow the same length');
});

test('anything else on the route is refused', () => {
  assert.equal(readStoredRoute({ ...stored, steps: [] }), null);
  assert.equal(readStoredRoute({ ...stored, profile: 'cycling' }), null);
  assert.equal(readStoredRoute({ ...stored, distanceM: -1 }), null);
  assert.equal(readStoredRoute({ ...stored, distanceM: Number.NaN }), null);
  assert.equal(readStoredRoute({ ...stored, distanceM: 4_000_000 }), null);
  assert.equal(readStoredRoute({ ...stored, durationS: 4 * 24 * 3600 }), null);
  assert.equal(readStoredRoute({ ...stored, durationS: '600' }), null);
  assert.equal(readStoredRoute({ ...stored, overview: '' }), null);
  assert.equal(readStoredRoute({ ...stored, overview: '<script>' }), null);
  assert.equal(readStoredRoute({ ...stored, overview: 'has spaces in it' }), null);
  assert.equal(readStoredRoute({ ...stored, overview: '?'.repeat(MAX_OVERVIEW_LENGTH + 1) }), null);
  assert.equal(readStoredRoute(null), null);
  assert.equal(readStoredRoute('route'), null);
});

test('times and lengths are rounded', () => {
  assert.deepEqual(readStoredRoute({ ...stored, distanceM: 10.6, durationS: 59.4 }), { ...stored, distanceM: 11, durationS: 59 });
});

test('two routes are the same when their outlines are', () => {
  assert.equal(sameRoute(stored, { ...stored, durationS: 1 }), true);
  assert.equal(sameRoute(stored, { ...stored, overview: 'gfo}EtohhU' }), false);
  assert.equal(sameRoute(stored, null), false);
  assert.equal(sameRoute(null, null), true);
});

test('the contacts\' page reads only a usable outline', () => {
  const points = readRouteOutline(stored)!;
  assert.ok(points.length > 10);
  assert.ok(points.every((p) => p.lat > 6.4 && p.lat < 6.7 && p.lng > 3.3 && p.lng < 3.5), 'all in Lagos');
  assert.equal(readRouteOutline(null), null);
  assert.equal(readRouteOutline({ overview: 42 }), null);
  assert.equal(readRouteOutline({ overview: '<script>' }), null);
  // One point is not a line
  assert.equal(readRouteOutline({ overview: 'gfo}EtohhU' }), null);
  // Points off the map (latitude 100) are dropped: Lagos, 100 N, 100 N leaves one point, so nothing is drawn
  assert.equal(readRouteOutline({ overview: '_ivkK_sonE_exiqD??_pR' }), null);
  // Lagos, 100 N, Lagos leaves the two in Lagos
  assert.deepEqual(readRouteOutline({ overview: '_ivkK_sonE_exiqD?~sdiqD_pR' }), [{ lat: 6.5, lng: 3.4 }, { lat: 6.51, lng: 3.41 }]);
  // Characters that never finish a number decode to nothing
  assert.equal(readRouteOutline({ overview: '~'.repeat(70) }), null);
});
