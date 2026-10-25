import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PastTrip, usualMinutes, usualTrips } from '../../src/lib/usualTrips';

const NOW = Date.UTC(2026, 9, 25, 12, 0);
const MIN = 60000;
const DAY = 24 * 60 * MIN;
const YABA = { lat: 6.5095, lng: 3.3711 };
const IKEJA = { lat: 6.6018, lng: 3.3515 };

function trip(over: Partial<PastTrip> & { daysAgo?: number; took?: number }): PastTrip {
  const startMs = NOW - (over.daysAgo ?? 1) * DAY;
  return {
    destination: 'Ikeja',
    point: null,
    arrived: true,
    isTest: false,
    startMs,
    endMs: over.took === undefined ? startMs + 20 * MIN : startMs + over.took * MIN,
    plannedMinutes: 30,
    travelMode: 'okada',
    ...over,
  };
}

test('trips to the same pin are one usual trip, under the latest name', () => {
  const list = usualTrips([
    trip({ destination: 'Ikeja City Mall', point: IKEJA, daysAgo: 1 }),
    trip({ destination: 'ikeja', point: { lat: 6.6030, lng: 3.3520 }, daysAgo: 3 }), // about 140 m away
    trip({ destination: 'Yaba', point: YABA, daysAgo: 2 }),
  ], NOW);
  assert.equal(list.length, 2);
  assert.equal(list[0].destination, 'Ikeja City Mall');
  assert.equal(list[0].count, 2);
  assert.deepEqual(list[0].point, IKEJA);
});

test('without pins, the same typed name is the same place', () => {
  const list = usualTrips([
    trip({ destination: 'Work ', daysAgo: 1 }),
    trip({ destination: 'work', daysAgo: 2 }),
    trip({ destination: 'Church', daysAgo: 3 }),
  ], NOW);
  assert.equal(list[0].count, 2);
  assert.equal(list[0].destination, 'Work');
});

test('tests, trips not ended with "I\'ve arrived" and old trips are left out', () => {
  const list = usualTrips([
    trip({ destination: 'Test', isTest: true }),
    trip({ destination: 'Cancelled', arrived: false }),
    trip({ destination: 'Long ago', daysAgo: 61 }),
    trip({ destination: '', point: null }),
    trip({ destination: 'Kept' }),
  ], NOW);
  assert.deepEqual(list.map((t) => t.destination), ['Kept']);
});

test('the length is what the trip took, with time for traffic, never under 15 minutes', () => {
  // 20, 30, 40 minutes: the middle one is 30, a third more and 5 is 44, rounded up to 45
  assert.equal(usualMinutes([trip({ took: 20 }), trip({ took: 40 }), trip({ took: 30 })]), 45);
  // A 3-minute trip still gets 15
  assert.equal(usualMinutes([trip({ took: 3 })]), 15);
  // With no end time, the length they chose
  assert.equal(usualMinutes([trip({ endMs: null, plannedMinutes: 60 })]), 60);
  // Never more than the longest trip allowed (20 hours)
  assert.equal(usualMinutes([trip({ took: 1000 })]), 1200);
});

test('the most frequent come first, then the most recent, at most three', () => {
  const list = usualTrips([
    trip({ destination: 'A', daysAgo: 1 }),
    trip({ destination: 'B', daysAgo: 2 }),
    trip({ destination: 'B', daysAgo: 4 }),
    trip({ destination: 'C', daysAgo: 3 }),
    trip({ destination: 'D', daysAgo: 5 }),
  ], NOW);
  assert.deepEqual(list.map((t) => t.destination), ['B', 'A', 'C']);
  assert.equal(list[0].travelMode, 'okada');
});
