import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  Account, countDays, countPeople, countPhones, countReports, countTexts, countTravel, DAY_MS, DAYS_SHOWN, lagosDate,
  messageFromLog, movingMs, TripRow, WEEKS_SHOWN,
} from '../src/adminNumbersPlan';

// Wednesday 28 October 2026, 22:30 in Nigeria
const NOW = Date.UTC(2026, 9, 28, 21, 30);

test('dates are Nigerian dates, which turn an hour before UTC', () => {
  assert.equal(lagosDate(Date.UTC(2026, 9, 28, 22, 59)), '2026-10-28');
  assert.equal(lagosDate(Date.UTC(2026, 9, 28, 23, 0)), '2026-10-29');
});

test('people are counted from when they last used the app', () => {
  const account = (createdDaysAgo: number, seenDaysAgo: number, methods = ['password']): Account =>
    ({ createdMs: NOW - createdDaysAgo * DAY_MS, lastSeenMs: NOW - seenDaysAgo * DAY_MS, methods });
  const people = countPeople([
    account(20, 0.5),
    account(20, 3, ['google.com']),
    account(20, 20),
    account(10, 10, ['google.com', 'password']),
    account(0.2, 0.1),
  ], NOW);
  assert.equal(people.accounts, 5);
  assert.equal(people.last24h, 2);
  assert.equal(people.last7d, 3);
  assert.equal(people.last30d, 5);
  // The one who joined today is not counted either way yet
  assert.equal(people.couldComeBack, 4);
  assert.equal(people.cameBack, 2);
  assert.deepEqual(people.methods, { password: 3, 'google.com': 1, 'google.com + password': 1 });
  assert.equal(people.joinedByWeek.length, WEEKS_SHOWN);
  // Three joined 20 days ago, one 10 days ago, one today
  assert.deepEqual(people.joinedByWeek.slice(-3).map((w) => w.count), [3, 1, 1]);
  assert.equal(people.joinedByWeek[WEEKS_SHOWN - 1].weekEnding, '2026-10-28');
});

test('each of the last fourteen days counts trips, people and the rest', () => {
  const at = (daysAgo: number) => NOW - daysAgo * DAY_MS;
  const days = countDays({
    trips: [
      { uid: 'a', startMs: at(0), isTest: false, wentOverdue: false, arrivedMs: at(0) + 30 * 60_000, distanceM: 4200 },
      { uid: 'a', startMs: at(0), isTest: false, wentOverdue: true, arrivedMs: at(0) + 90 * 60_000, leastDistanceM: 1250 },
      { uid: 'b', startMs: at(0), isTest: true, wentOverdue: true },
      { uid: 'c', startMs: at(1), isTest: false, wentOverdue: false },
      { uid: 'd', startMs: at(30), isTest: false, wentOverdue: false },
    ],
    sosMs: [at(0), at(2)],
    checkpointMs: [at(0), at(0), at(5)],
    roadReportMs: [at(1)],
    texts: [{ ms: at(0), count: 3 }, { ms: at(0), count: 2 }],
  }, NOW);
  assert.equal(days.length, DAYS_SHOWN);
  assert.equal(days[0].date, '2026-10-15');
  const today = days[DAYS_SHOWN - 1];
  assert.deepEqual(today, {
    date: '2026-10-28', people: 2, realTrips: 2, testTrips: 1, overdue: 1, km: 5.5, sos: 1, checkpointStops: 2, roadReports: 0, texts: 5,
  });
  assert.equal(days[DAYS_SHOWN - 2].people, 1);
  assert.equal(days[DAYS_SHOWN - 2].roadReports, 1);
  assert.equal(days.reduce((n, d) => n + d.realTrips + d.testTrips, 0), 4, 'a trip older than fourteen days is left out');
});

test("texts: sent, not sent, held back, and Africa's Talking's later reports", () => {
  const atLog = messageFromLog({
    provider: 'africastalking',
    providerResult: [
      { sid: 'A1', error: null, provider: 'africastalking' },
      { sid: 'A2', error: null, provider: 'africastalking' },
      { sid: 'A3', error: null, provider: 'africastalking' },
      { sid: 'T1', error: null, provider: 'termii' },
      { sid: null, error: 'refused', provider: 'termii' },
    ],
    reports: { A1: { status: 'Success' }, A2: { status: 'Rejected' } },
    resends: { A2: { state: 'sent' } },
  }, NOW);
  const heldBack = messageFromLog({ provider: 'blocked', providerResult: [{ sid: null, error: 'off' }, { sid: null, error: 'off' }] }, NOW);
  assert.deepEqual(countTexts([atLog, heldBack]), {
    messages: 2, sent: 4, notSent: 1, heldBack: 2, viaAfricasTalking: 3, viaTermii: 1,
    delivered: 1, notDelivered: 1, noReportYet: 1, resent: 1,
  });
  assert.deepEqual(countTexts([messageFromLog({}, NOW)]).sent, 0, 'an entry with nothing in it');
});

test('phones by platform and build, newest build first', () => {
  assert.deepEqual(countPhones([
    { platform: 'android', build: 24 },
    { platform: 'android', build: 25 },
    { platform: 'android', build: 24 },
    { platform: 'android', build: undefined },
    { platform: 'ios', build: 25 },
    { platform: undefined, build: 'x' },
  ]), [
    { platform: 'android', build: 25, count: 1 },
    { platform: 'android', build: 24, count: 2 },
    { platform: 'android', build: null, count: 1 },
    { platform: 'ios', build: 25, count: 1 },
    { platform: 'unknown', build: null, count: 1 },
  ]);
});

test('time on the move: a trip left running counts only to its planned arrival', () => {
  const start = NOW - 3 * 60 * 60_000;
  const trip = (over: Partial<TripRow>): TripRow => ({ uid: 'a', startMs: start, isTest: false, wentOverdue: false, ...over });
  assert.equal(movingMs(trip({ arrivedMs: start + 25 * 60_000 })), 25 * 60_000);
  assert.equal(movingMs(trip({ arrivedMs: start + 13 * 60 * 60_000, plannedEndMs: start + 40 * 60_000, wentOverdue: true })), 40 * 60_000);
  assert.equal(movingMs(trip({ arrivedMs: start + 20 * 60 * 60_000 })), 12 * 60 * 60_000, 'never more than twelve hours');
  assert.equal(movingMs(trip({})), 0, 'still running');
});

test('distance and time on real trips the traveller ended, overall and for the last fourteen days', () => {
  const at = (daysAgo: number) => NOW - daysAgo * DAY_MS;
  const trip = (uid: string, daysAgo: number, minutes: number, over: Partial<TripRow> = {}): TripRow => ({
    uid, startMs: at(daysAgo), isTest: false, wentOverdue: false, arrivedMs: at(daysAgo) + minutes * 60_000, ...over,
  });
  const travel = countTravel([
    trip('a', 1, 30, { distanceM: 6000 }),
    trip('a', 2, 20, { leastDistanceM: 2000 }),
    trip('b', 3, 60, { distanceM: 12000, wentOverdue: true, plannedEndMs: at(3) + 45 * 60_000 }),
    trip('c', 20, 120, { distanceM: 30000 }),
    trip('a', 0, 5, { isTest: true, distanceM: 500 }),
    { uid: 'd', startMs: at(0), isTest: false, wentOverdue: false, arrivedMs: null, distanceM: 999 },
  ], NOW);
  assert.deepEqual(travel, {
    trips: 4,
    km: 50,
    hours: 3.6,
    recentTrips: 3,
    recentKm: 20,
    recentHours: 1.6,
    recentTravellers: 2,
    hoursPerTravellerWeekly: 0.4,
    medianMinutes: 30,
    endedOnTime: 2,
    measured: 3,
  });
  assert.equal(countTravel([], NOW).medianMinutes, null);
});

test('road reports, photos, votes, checkpoint stops and contacts', () => {
  const at = (daysAgo: number) => NOW - daysAgo * DAY_MS;
  assert.deepEqual(countReports({
    roadReports: [
      { ms: at(1), hasPhotos: true, votedUp: true },
      { ms: at(2), hasPhotos: false, votedUp: false },
      { ms: at(20), hasPhotos: true, votedUp: false },
    ],
    checkpointMs: [at(1), at(30)],
    withContacts: 7,
  }, NOW), {
    roadReports: 3, recentRoadReports: 2, withPhotos: 2, votedUp: 1, checkpointStops: 2, recentCheckpointStops: 1, withContacts: 7,
  });
});
