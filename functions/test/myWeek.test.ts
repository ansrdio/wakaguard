import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MISSED_WORDS, missedLine, MyWeek, weekEnds, weekLines } from '../../src/lib/myWeekWords';
import { REASONS, lastMissedTrip, parseLagosTime, pointsFor, WEEK_MS } from '../src/weeklyRules';

const from = parseLagosTime('2026-11-01');
const week = (changes: Partial<MyWeek> = {}): MyWeek => ({
  fromMs: from, toMs: from + WEEK_MS, points: 11, realTrips: 3, roadReports: 1, firstTestTrip: false, everydayBonus: false, days: 3, missed: null, ...changes,
});
const MIN = 60 * 1000;

test('every reason a trip can fail has words for the card', () => {
  for (const reason of [REASONS.notEnded, REASONS.endedLater, REASONS.tooShort, REASONS.noLocation, REASONS.didNotMove,
    REASONS.overLimit, REASONS.wentOverdue]) {
    assert.ok(MISSED_WORDS[reason], reason);
  }
});

test('the card says the week in plain words', () => {
  assert.deepEqual(weekLines(week()), ['3 trips counted · 1 road report']);
  assert.deepEqual(weekLines(week({ realTrips: 1, roadReports: 0, everydayBonus: true, firstTestTrip: true })),
    ['1 trip counted · 0 road reports', 'Everyday bonus: +5', 'First test trip: +2']);
  assert.equal(weekEnds(week()), 'Sunday 6 pm');
  const tuesday = from + 2 * 24 * 60 * MIN;
  assert.equal(missedLine(week({ missed: { atMs: tuesday, reason: REASONS.wentOverdue } })),
    'Your trip on Tue didn\'t count. It ran past its time, so your contacts would have been texted. Next time, tap "More time…" before your time is up.');
  assert.equal(missedLine(week()), null);
});

test('the points add up as on Sunday, and the last trip that missed is the one shown', () => {
  assert.equal(pointsFor({ realTrips: 3, roadReports: 1, firstTestTrip: true, problemReports: 0, everydayBonus: false }), 13);
  const start = { lat: 6.5, lng: 3.35 };
  const far = { lat: 6.514, lng: 3.35 };
  const trip = (startMin: number, lengthMin: number, extra = {}) => ({
    status: 'completed', startMs: from + startMin * MIN, endMs: from + (startMin + lengthMin) * MIN,
    startLocation: start, endLocation: far, positions: 10, longestGapMs: MIN, ...extra,
  });
  const missed = lastMissedTrip([
    trip(60, 5),
    trip(120, 30),
    trip(24 * 60, 30, { overdueMs: from + 24 * 60 * MIN + 31 * MIN }),
    trip(48 * 60, 30),
  ], from, from + WEEK_MS);
  assert.equal(missed.reason, REASONS.wentOverdue);
  assert.equal(lastMissedTrip([trip(120, 30)], from, from + WEEK_MS), null);
});
