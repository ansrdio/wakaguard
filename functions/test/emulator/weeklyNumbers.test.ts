/**
 * The weekly numbers, read from the Firestore emulator.
 * Run with: npm run test:monitor
 */
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import * as admin from 'firebase-admin';
// @ts-expect-error plain JavaScript module, run by hand as a script
import { collect, scoreWeek, WEEK_MS } from '../../../scripts/weekly-numbers.mjs';

if (!admin.apps.length) admin.initializeApp();

const MIN = 60 * 1000;
const HOUR = 60 * MIN;
// A week far from "now", so records made by other tests stay out of it
const FROM = Date.UTC(2031, 2, 2, 17);
const TO = FROM + WEEK_MS;
const ts = (ms: number) => admin.firestore.Timestamp.fromMillis(ms);
const db = () => admin.firestore();
const run = Date.now().toString(36);

interface Named { name: string }
interface Check extends Named {
  trips: unknown;
  reports: { confirmed: { upvoters: string[] }[] };
}
const ada = `ada-${run}`;
const tunde = `tunde-${run}`;

before(async () => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'Firestore emulator must be running');

  const start = FROM + 20 * HOUR;
  const trip = (over: Record<string, unknown>) => ({
    uid: ada,
    status: 'completed',
    startTime: ts(start),
    endTime: ts(start + 45 * MIN),
    startLocation: { lat: 6.6018, lng: 3.3515 },
    endLocation: { lat: 6.5095, lng: 3.3711 },
    // Private fields the report must never pick up
    destination: 'Yaba market',
    locationKey: 'secret',
    lastLocation: { lat: 6.5095, lng: 3.3711, accuracy: 12 },
    ...over,
  });

  await Promise.all([
    db().doc(`users/${ada}`).set({ username: ada, createdAt: ts(FROM) }),
    db().doc(`users/${tunde}`).set({ username: tunde, createdAt: ts(FROM) }),
    db().doc(`users/${ada}/trips/real-${run}`).set(trip({ overdueAt: ts(start + 40 * MIN) })),
    db().doc(`users/${ada}/trips/short-${run}`).set(trip({ endTime: ts(start + 5 * MIN) })),
    db().doc(`users/${ada}/trips/test-${run}`).set(trip({ isTest: true, endTime: ts(start + 2 * MIN) })),
    // An old collection of the same name, outside users/{uid}
    db().doc(`trips/legacy-${run}`).set(trip({})),
    db().doc(`users/${ada}/alerts/sos-${run}`).set({ type: 'sos', createdAt: ts(start), tripId: `test-${run}` }),
    db().doc(`reports/report-${run}`).set({
      uid: ada, createdAt: ts(start), flagCount: 0, photoUrls: ['photo'], description: 'Flooded road',
      location: { lat: 6.6, lng: 3.35 },
    }),
    db().doc(`votes/report-${run}_${tunde}`).set({ uid: tunde, reportId: `report-${run}`, value: 1, createdAt: ts(start) }),
  ]);
});

test('reads only what the ranking needs and scores it', async () => {
  const data = await collect(db(), { fromMs: FROM, toMs: TO });

  const mine = data.trips.filter((trip: { uid: string }) => trip.uid === ada);
  assert.equal(mine.length, 3);
  assert.ok(!data.trips.some((trip: { id: string }) => trip.id === `legacy-${run}`), 'a trip outside users/{uid} was read');
  assert.deepEqual(Object.keys(mine[0]).sort(), [
    'endLocation', 'endMs', 'farthestM', 'id', 'isTest', 'overdueMs', 'startLocation', 'startMs', 'status', 'uid',
  ]);
  assert.deepEqual(
    Object.keys(data.reports.find((report: { id: string }) => report.id === `report-${run}`)).sort(),
    ['createdMs', 'flagCount', 'hasPhotos', 'id', 'postedFarAway', 'uid'],
  );

  const result = scoreWeek(data, { fromMs: FROM, toMs: TO });
  // The real trip went overdue, which earns nothing since 15 October 2026
  assert.deepEqual(result.ranking.find((row: Named) => row.name === ada), {
    name: ada, realTrips: 0, roadReports: 1, firstTestTrip: true, problemReports: 0, total: 4,
  });
  const check: Check = result.checks.find((item: Named) => item.name === ada);
  assert.deepEqual(check.trips, {
    inThePeriod: 2, counted: 0, rejected: { 'too short': 1, 'ended after contacts would have been texted': 1 },
  });
  assert.deepEqual(check.reports.confirmed[0].upvoters, [tunde]);
  assert.equal(result.health.realOverdue, 1);
  assert.equal(result.health.sosInTestTrip, 1);
  assert.equal(result.health.reportsWithPhotos, 1);
});
