import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  decodePolyline6,
  directionsUrl,
  distanceM,
  formatDistance,
  guide,
  isOverview,
  linesDue,
  parseRoute,
  placeOnRoute,
  routeProfile,
  suggestedTripMinutes,
  OFF_ROUTE_M,
} from '../../src/lib/directions';

// A real answer from Mapbox for Yaba to Ikeja, Lagos (23 October 2026), with its request id removed
const ANSWER = JSON.parse(readFileSync(join(__dirname, 'fixtures', 'mapbox-route-yaba-ikeja.json'), 'utf8'));
const DESTINATION = { lat: 6.6018, lng: 3.3515 };
const route = parseRoute(ANSWER, 'driving-traffic', DESTINATION)!;

test('the route is read from Mapbox\'s answer', () => {
  assert.ok(route);
  assert.equal(Math.round(route.distanceM), 15898);
  assert.equal(Math.round(route.durationS), 1484);
  assert.equal(route.steps.length, 14);
  assert.equal(route.steps[1].instruction, 'Turn left onto Murtula Muhammed Way/A5.');
  assert.ok(route.steps[1].voice.some((v) => v.text === 'In 400 meters, Turn left onto Commercial Avenue.'));
  // Metres along the route add up to about Mapbox's own distance
  const total = route.along[route.along.length - 1];
  assert.ok(Math.abs(total - route.distanceM) < route.distanceM * 0.02, `${total} against ${route.distanceM}`);
  // Steps follow on from each other
  for (let i = 1; i < route.steps.length; i++) assert.equal(route.steps[i].startM, route.steps[i - 1].endM);
});

test('anything that is not a usable route is refused', () => {
  assert.equal(parseRoute(null, 'driving-traffic', DESTINATION), null);
  assert.equal(parseRoute({ code: 'NoRoute', routes: [] }, 'driving-traffic', DESTINATION), null);
  assert.equal(parseRoute({ code: 'Ok', routes: [{ distance: 1, duration: 1, geometry: 12, legs: [] }] }, 'driving-traffic', DESTINATION), null);
});

test('outlines are decoded, and a stored one is checked before it is drawn', () => {
  // Mapbox's documented example at precision 6
  assert.deepEqual(decodePolyline6('_izlhA~rlgdF_{geC~ywl@_kwzCn`{nI'), [
    { lat: 38.5, lng: -120.2 },
    { lat: 40.7, lng: -120.95 },
    { lat: 43.252, lng: -126.453 },
  ]);
  assert.ok(isOverview(route.overview));
  assert.equal(isOverview(''), false);
  assert.equal(isOverview('abc<script>'), false);
  assert.equal(isOverview('a'.repeat(20001)), false);
  assert.equal(isOverview(42), false);
});

test('people on foot get walking directions; everyone else driving with traffic', () => {
  assert.equal(routeProfile('foot'), 'walking');
  for (const mode of ['bus', 'keke', 'okada', 'car', 'taxi', 'other', null, undefined]) {
    assert.equal(routeProfile(mode), 'driving-traffic');
  }
  const url = directionsUrl({ lat: 6.5095, lng: 3.3711 }, DESTINATION, 'walking', 'pk.test');
  assert.ok(url.startsWith('https://api.mapbox.com/directions/v5/mapbox/walking/3.371100,6.509500;3.351500,6.601800?'));
  assert.ok(url.includes('voice_instructions=true') && url.includes('voice_units=metric') && url.includes('access_token=pk.test'));
});

test('a position on the route finds the next turn and the distance to it', () => {
  // Part way along the second step (Murtula Muhammed Way), before Commercial Avenue
  const second = route.steps[1];
  const midway = route.points[route.along.findIndex((m) => m > second.startM + (second.endM - second.startM) / 2)];
  const g = guide(route, midway);
  assert.equal(g.stepIndex, 1);
  assert.equal(g.nextInstruction, 'Turn left onto Commercial Avenue.');
  assert.ok(g.toNextM > 0 && g.toNextM < second.endM - second.startM);
  assert.equal(g.offRoute, false);
  assert.equal(g.arrived, false);
  assert.ok(placeOnRoute(route, midway).offM < 1);
});

test('a position well off the route is noticed', () => {
  // About 300 m east of the first point
  const start = route.points[0];
  const away = { lat: start.lat, lng: start.lng + 0.0028 };
  const g = guide(route, away);
  assert.ok(placeOnRoute(route, away).offM > OFF_ROUTE_M);
  assert.equal(g.offRoute, true);
  assert.deepEqual(linesDue(route, g, new Set()), [], 'nothing is read out while off the route');
});

test('arriving is noticed near the destination', () => {
  const end = route.points[route.points.length - 1];
  assert.equal(guide(route, end).arrived, true);
  assert.ok(distanceM(end, DESTINATION) < 200);
});

test('each spoken line is due once, when its mark is reached', () => {
  const second = route.steps[1];
  // 300 m before the end of the second step: the "In 400 meters" line is due
  const target = second.endM - 300;
  const i = route.along.findIndex((m) => m >= target);
  const g = guide(route, route.points[i]);
  const due = linesDue(route, g, new Set());
  assert.equal(due.length, 1);
  assert.equal(due[0].text, 'In 400 meters, Turn left onto Commercial Avenue.');
  assert.deepEqual(linesDue(route, g, new Set([due[0].key])), [], 'not said twice');
});

test('the suggested trip length adds a margin for traffic', () => {
  assert.equal(suggestedTripMinutes(1484), 40); // 25 min by Mapbox
  assert.equal(suggestedTripMinutes(300), 15); // never under 15
  assert.equal(suggestedTripMinutes(8 * 3600), 630); // a long road trip
});

test('distances read the way people say them', () => {
  assert.equal(formatDistance(4), '10 m');
  assert.equal(formatDistance(437), '440 m');
  assert.equal(formatDistance(1520), '1.5 km');
  assert.equal(formatDistance(15898), '16 km');
});
