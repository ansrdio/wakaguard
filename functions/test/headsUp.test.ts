import { test } from 'node:test';
import assert from 'node:assert/strict';
import { headsUpMessage, metresFromLine, reportsNearRoute, roadWords, roundSpot, weatherWords, RoadReport } from '../src/headsUp';
import { usualTimes } from '../src/usualTimes';

const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
// 7:10 am, Tuesday 17 November 2026, Nigeria time
const MORNING = Date.UTC(2026, 10, 17, 6, 10);
const IKORODU = { lat: 6.62, lng: 3.51 };
const YABA = { lat: 6.51, lng: 3.38 };
// Ojota lies on the way from Ikorodu to Yaba
const OJOTA = { lat: 6.58, lng: 3.38 + (3.51 - 3.38) * 0.65 };
const LEKKI = { lat: 6.44, lng: 3.47 };

const report = (spot: { lat: number; lng: number }, over: Partial<RoadReport> = {}): RoadReport => ({
  type: 'checkpoint', lat: spot.lat, lng: spot.lng, address: null, createdMs: MORNING - 2 * HOUR, ...over,
});

test('a place is kept to about a kilometre, and junk is not a place', () => {
  assert.deepEqual(roundSpot({ lat: 6.524379, lng: 3.379206 }), { lat: 6.52, lng: 3.38 });
  assert.equal(roundSpot(null), null);
  assert.equal(roundSpot({ lat: 'x', lng: 3 }), null);
  assert.equal(roundSpot({ lat: 95, lng: 3 }), null);
});

test('distance from the straight line between start and destination', () => {
  assert.ok(metresFromLine(YABA, IKORODU, YABA) < 1);
  assert.ok(metresFromLine(LEKKI, IKORODU, YABA) > 5000);
});

test('only road reports near the usual route are mentioned, newest first', () => {
  const older = report(IKORODU, { createdMs: MORNING - 10 * HOUR });
  const newer = report(YABA, { type: 'accident', createdMs: MORNING - HOUR });
  const far = report(LEKKI);
  const near = reportsNearRoute([older, far, newer], IKORODU, YABA);
  assert.deepEqual(near, [newer, older]);
  // With no destination on the map, around where they set off
  assert.deepEqual(reportsNearRoute([older, far, newer], IKORODU, null), [older]);
});

test('a report half-way along the route counts', () => {
  assert.equal(reportsNearRoute([report(OJOTA)], IKORODU, YABA).length, 1);
});

test('one road report says what, where and when', () => {
  assert.equal(
    roadWords([report(OJOTA, { address: 'Ojota Bus Stop, Ikorodu Road, Lagos', createdMs: MORNING })]),
    'On your way: a checkpoint was reported near Ojota Bus Stop at 7:10 am.',
  );
  assert.equal(roadWords([report(OJOTA, { type: 'roadwork', address: null })]), 'On your way: roadworks were reported at 5:10 am.');
});

test('several road reports are counted, with up to two kinds', () => {
  assert.equal(
    roadWords([report(OJOTA), report(YABA, { type: 'accident' }), report(IKORODU, { type: 'traffic' })]),
    'On your way: 3 road reports since last night, including a checkpoint and an accident.',
  );
  assert.equal(roadWords([]), null);
});

test('the weather in a few words, only when it is worth saying', () => {
  const rainAt4 = { kind: 'rain' as const, startsAtMs: Date.UTC(2026, 10, 17, 15), hottest: 31 };
  assert.equal(weatherWords(rainAt4, MORNING), 'Rain likely from about 4 pm.');
  assert.equal(weatherWords({ kind: 'storm', startsAtMs: MORNING + 10 * MIN, hottest: 30 }, MORNING), 'Thunderstorms likely soon.');
  assert.equal(weatherWords({ kind: 'showers', startsAtMs: Date.UTC(2026, 10, 17, 14), hottest: 31 }, MORNING), 'A chance of showers from about 3 pm.');
  assert.equal(weatherWords({ kind: 'heat', startsAtMs: null, hottest: 38, feelsLike: 44 }, MORNING), 'Very hot today: it will feel like 44°C.');
  assert.equal(weatherWords({ kind: null, startsAtMs: null, hottest: 30 }, MORNING), null);
  assert.equal(weatherWords(null, MORNING), null);
});

test('the heads-up names the destination and ends with a tap to start; nothing to say keeps the plain reminder', () => {
  const rainAt4 = { kind: 'rain' as const, startsAtMs: Date.UTC(2026, 10, 17, 15), hottest: 31 };
  const checkpoint = report(OJOTA, { address: 'Ojota', createdMs: MORNING });
  assert.deepEqual(headsUpMessage('Yaba', { weather: rainAt4, reports: [checkpoint] }, MORNING), {
    title: 'Heading to Yaba?',
    body: 'Rain likely from about 4 pm. On your way: a checkpoint was reported near Ojota at 7:10 am. Tap to start your trip.',
  });
  assert.deepEqual(headsUpMessage(null, { weather: null, reports: [checkpoint] }, MORNING), {
    title: 'Heading out?',
    body: 'On your way: a checkpoint was reported near Ojota at 7:10 am. Tap to start your trip.',
  });
  assert.equal(headsUpMessage('Yaba', { weather: null, reports: [] }, MORNING), null);
});

test('the usual time keeps where the latest trip to the usual place started and went, rounded', () => {
  const at = (d: number) => MORNING - d * DAY;
  const starts = [3, 2, 1].map((d) => ({
    atMs: at(d), destination: 'Yaba', minutes: 45,
    from: roundSpot({ lat: 6.6213 + d / 1000, lng: 3.5099 }), to: roundSpot({ lat: 6.5095, lng: 3.3792 }),
  }));
  const [usual] = usualTimes(starts, MORNING);
  assert.deepEqual(usual.from, { lat: 6.62, lng: 3.51 });
  assert.deepEqual(usual.to, { lat: 6.51, lng: 3.38 });
  // Trips with no start position leave them unknown
  const [plain] = usualTimes(starts.map(({ atMs, destination }) => ({ atMs, destination })), MORNING);
  assert.equal(plain.from, null);
  assert.equal(plain.to, null);
});
