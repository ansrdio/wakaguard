/**
 * "Your points this week" (build 27), against the Firestore emulator.
 * Run with: npm run test:monitor
 */
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import * as admin from 'firebase-admin';
import '../../src/index';
import { weekOf } from '../../src/myWeek';
import { REASONS, weekStartBefore } from '../../src/weeklyRules';

const MIN = 60 * 1000;
const db = () => admin.firestore();
const ts = (ms: number) => admin.firestore.Timestamp.fromMillis(ms);

before(() => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'Firestore emulator must be running');
});

test('one person\'s week is scored by the Sunday rules, from their own records only', async () => {
  const uid = `week_${Date.now()}`;
  const other = `${uid}_other`;
  const now = Date.now();
  const from = weekStartBefore(now);
  const start = { lat: 6.5, lng: 3.35 };
  const end = { lat: 6.514, lng: 3.35 };
  const trip = (id: string, startMs: number, minutes: number, extra: Record<string, unknown> = {}) =>
    db().doc(`users/${uid}/trips/${id}`).set({
      status: 'completed', startTime: ts(startMs), endTime: ts(startMs + minutes * MIN),
      startLocation: start, endLocation: end, positionCount: 12, longestPositionGapMs: MIN, ...extra,
    });
  // Within the week so far (the week may have begun moments ago, so keep to what has passed)
  const t0 = Math.max(from + MIN, now - 60 * MIN);
  await trip('good', t0, 20);
  await trip('short', t0 + 1, 5);
  await trip('test', t0 + 2, 3, { isTest: true });
  await db().doc(`users/${other}/trips/theirs`).set({
    status: 'completed', startTime: ts(t0), endTime: ts(t0 + 30 * MIN), startLocation: start, endLocation: end,
  });

  const week = await weekOf(uid, Math.max(now, t0 + 25 * MIN));
  assert.equal(week.realTrips, 1);
  assert.equal(week.firstTestTrip, true);
  assert.equal(week.points, 3 + 2);
  assert.equal(week.missed?.reason, REASONS.tooShort);
});
