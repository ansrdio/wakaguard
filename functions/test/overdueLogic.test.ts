import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  decideOverdueAction,
  decideReminder,
  HEADS_UP_BEFORE_MS,
  STILL_OPEN_EVERY_MS,
  MAX_STILL_OPEN_REMINDERS,
  MAX_ALERT_ATTEMPTS,
  OVERDUE_GRACE_MS,
  LAST_WARNING_BEFORE_MS,
  OVERDUE_MAX_AGE_MS,
  STALE_CLAIM_MS,
  decideQuietNudge,
  MAX_QUIET_NUDGES,
  QUIET_AFTER_MS,
  QUIET_NUDGE_EVERY_MS,
} from '../src/overdueLogic';
import { buildAllClearMessage, buildOverdueMessage, buildSosMessage, markAsTest, TEST_PREFIX } from '../src/templates';
import { isGsm7 } from '../src/smsText';

const DEADLINE = Date.UTC(2026, 9, 6, 15, 30); // 4:30 PM in Lagos
const MIN = 60 * 1000;

test('nothing happens before the deadline', () => {
  assert.equal(decideOverdueAction({ deadlineMs: DEADLINE }, DEADLINE - MIN), 'none');
});

test('traveller is warned once at the deadline', () => {
  assert.equal(decideOverdueAction({ deadlineMs: DEADLINE }, DEADLINE + MIN), 'warn');
  assert.equal(
    decideOverdueAction({ deadlineMs: DEADLINE, overdueWarnedAtMs: DEADLINE + MIN }, DEADLINE + 2 * MIN),
    'none'
  );
});

test('contacts are alerted after the grace period, even if the warning was never sent', () => {
  assert.equal(decideOverdueAction({ deadlineMs: DEADLINE }, DEADLINE + OVERDUE_GRACE_MS), 'alert');
});

test('a delivered or final alert is not repeated', () => {
  for (const state of ['sent', 'partial', 'blocked', 'no_contacts'] as const) {
    assert.equal(
      decideOverdueAction({ deadlineMs: DEADLINE, overdueAlertState: state, overdueAlertAttempts: 1 }, DEADLINE + OVERDUE_GRACE_MS + 5 * MIN),
      'none',
      state
    );
  }
});

test('a failed alert is retried up to the attempt limit', () => {
  const at = DEADLINE + OVERDUE_GRACE_MS + 5 * MIN;
  assert.equal(
    decideOverdueAction({ deadlineMs: DEADLINE, overdueAlertState: 'failed', overdueAlertAttempts: 1 }, at),
    'alert'
  );
  assert.equal(
    decideOverdueAction({ deadlineMs: DEADLINE, overdueAlertState: 'failed', overdueAlertAttempts: MAX_ALERT_ATTEMPTS }, at),
    'none'
  );
});

test('an in-flight claim blocks other runs until it goes stale', () => {
  const claimedAt = DEADLINE + OVERDUE_GRACE_MS;
  const subject = {
    deadlineMs: DEADLINE,
    overdueAlertState: 'sending' as const,
    overdueAlertAttempts: 1,
    overdueAlertClaimedAtMs: claimedAt,
  };
  assert.equal(decideOverdueAction(subject, claimedAt + MIN), 'none');
  assert.equal(decideOverdueAction(subject, claimedAt + STALE_CLAIM_MS + MIN), 'alert');
});

test('stale deadlines and opted-out trips are ignored', () => {
  assert.equal(decideOverdueAction({ deadlineMs: DEADLINE }, DEADLINE + OVERDUE_MAX_AGE_MS + MIN), 'none');
  assert.equal(
    decideOverdueAction({ deadlineMs: DEADLINE, shouldNotifyContacts: false }, DEADLINE + 10 * MIN),
    'none'
  );
  assert.equal(decideOverdueAction({ deadlineMs: NaN }, DEADLINE), 'none');
});

test('overdue trip message names the traveller, deadline, last location and link', () => {
  const msg = buildOverdueMessage({
    userName: 'Ada',
    kind: 'trip',
    deadlineMs: DEADLINE,
    destination: 'Benin City',
    lat: 6.335,
    lng: 5.6037,
    lastUpdateMs: DEADLINE - 41 * MIN,
    token: 'abc123',
  });
  assert.match(msg, /Ada has not checked in from a trip to Benin City, due Tue,? 4:30\s?pm/i);
  assert.match(msg, /Please call them\.\n\nLast seen Tue,? 3:49\s?pm:\nhttps:\/\/maps\.google\.com\/\?q=6\.335,5\.6037\n\nFollow their trip:\n/i);
  assert.match(msg, /\/s\?t=abc123/);
});

test('overdue trip message says so when no location was received', () => {
  const msg = buildOverdueMessage({ userName: 'Ada', kind: 'trip', deadlineMs: DEADLINE });
  assert.match(msg, /No location was received\./);
});

test('all-clear and SOS messages name the traveller', () => {
  assert.match(buildAllClearMessage({ userName: 'Ada', reason: 'ended' }), /Ada has checked in and ended the trip safely/);
  assert.match(
    buildAllClearMessage({ userName: 'Ada', reason: 'extended', newDeadlineMs: DEADLINE }),
    /New expected arrival Tue,? 4:30\s?pm/i
  );
  assert.match(buildSosMessage({ userName: 'Ada', lat: 6.5, lng: 3.3 }), /SOS: Ada needs help\./);
});

// ---------------------------------------------------------------------------
// Test trips
// ---------------------------------------------------------------------------

test('test trip: contacts are alerted after one minute, a real trip after fifteen', () => {
  const now = Date.now();
  const lateBy = (ms: number, isTest: boolean) =>
    decideOverdueAction({ deadlineMs: now - ms, isTest, overdueWarnedAtMs: now - ms, lastWarnedAtMs: now - ms }, now);

  assert.equal(OVERDUE_GRACE_MS, 15 * MIN);
  assert.equal(lateBy(30 * 1000, true), 'none', 'warned already, still inside the minute');
  assert.equal(lateBy(61 * 1000, true), 'alert');
  assert.equal(lateBy(61 * 1000, false), 'none');
  assert.equal(lateBy(6 * MIN, false), 'none', 'five minutes late is no longer enough');
  assert.equal(lateBy(15 * MIN + 1000, false), 'alert');
});

test('five minutes before contacts are texted, the traveller is told so, once', () => {
  const warned = { deadlineMs: DEADLINE, overdueWarnedAtMs: DEADLINE + 30 * 1000 };
  assert.equal(decideOverdueAction(warned, DEADLINE + 9 * MIN), 'none');
  assert.equal(decideOverdueAction(warned, DEADLINE + OVERDUE_GRACE_MS - LAST_WARNING_BEFORE_MS), 'last_warning');
  assert.equal(decideOverdueAction(warned, DEADLINE + 12 * MIN), 'last_warning', 'a late run still sends it');
  assert.equal(decideOverdueAction({ ...warned, lastWarnedAtMs: DEADLINE + 10 * MIN }, DEADLINE + 12 * MIN), 'none');
  assert.equal(decideOverdueAction({ ...warned, lastWarnedAtMs: DEADLINE + 10 * MIN }, DEADLINE + OVERDUE_GRACE_MS), 'alert');
  // The first warning always comes first, even when the monitor runs late
  assert.equal(decideOverdueAction({ deadlineMs: DEADLINE }, DEADLINE + 11 * MIN), 'warn');
});

test('a test trip, whose whole wait is a minute, gets no last warning', () => {
  const now = Date.now();
  assert.equal(decideOverdueAction({ deadlineMs: now - 40 * 1000, isTest: true, overdueWarnedAtMs: now - 30 * 1000 }, now), 'none');
});

test('test trip: the traveller is warned at the deadline, exactly as on a real trip', () => {
  const now = Date.now();
  assert.equal(decideOverdueAction({ deadlineMs: now - 5000, isTest: true }, now), 'warn');
  assert.equal(decideOverdueAction({ deadlineMs: now + 5000, isTest: true }, now), 'none');
});

test('markAsTest: labels a test message and leaves a real one alone', () => {
  assert.equal(markAsTest('WakaGuard: Ada has checked in safely.', true), 'WAKAGUARD TEST ALERT. NOT A REAL EMERGENCY. WakaGuard: Ada has checked in safely.');
  assert.equal(markAsTest('WakaGuard: Ada has checked in safely.', false), 'WakaGuard: Ada has checked in safely.');
  assert.equal(markAsTest('x', undefined), 'x');
  // Stays in the plain SMS alphabet, so the label does not push a text into the costlier encoding
  assert.ok(isGsm7(TEST_PREFIX));
});

// ---------------------------------------------------------------------------
// Reminders to the traveller
// ---------------------------------------------------------------------------

const START = DEADLINE - 30 * MIN;
const trip30 = { deadlineMs: DEADLINE, deadlineSetAtMs: START };

test('a heads-up goes out once, five minutes before the time runs out', () => {
  assert.equal(decideReminder(trip30, DEADLINE - HEADS_UP_BEFORE_MS - MIN), 'none');
  assert.equal(decideReminder(trip30, DEADLINE - HEADS_UP_BEFORE_MS), 'heads_up');
  assert.equal(decideReminder(trip30, DEADLINE - MIN), 'heads_up');
  assert.equal(
    decideReminder({ ...trip30, sent: { deadlineMs: DEADLINE, headsUp: true } }, DEADLINE - MIN),
    'none',
  );
});

test('no heads-up for a test trip, a very short trip, or a few minutes just added', () => {
  assert.equal(decideReminder({ ...trip30, isTest: true }, DEADLINE - MIN), 'none');
  assert.equal(decideReminder({ deadlineMs: DEADLINE, deadlineSetAtMs: DEADLINE - 8 * MIN }, DEADLINE - MIN), 'none');
  // Extended by an app that does not say when
  assert.equal(decideReminder({ deadlineMs: DEADLINE, deadlineSetAtMs: null }, DEADLINE - MIN), 'none');
});

test('time added starts the heads-up afresh for the new deadline', () => {
  const later = DEADLINE + 30 * MIN;
  const extended = { deadlineMs: later, deadlineSetAtMs: DEADLINE - MIN, sent: { deadlineMs: DEADLINE, headsUp: true } };
  assert.equal(decideReminder(extended, later - 10 * MIN), 'none');
  assert.equal(decideReminder(extended, later - 4 * MIN), 'heads_up');
});

test('a trip left open is asked about every fifteen minutes after contacts are texted, four times in all', () => {
  const alerted = DEADLINE + OVERDUE_GRACE_MS;
  assert.equal(decideReminder(trip30, alerted), 'none', 'not in the same minute as the alert');
  assert.equal(decideReminder(trip30, alerted + STILL_OPEN_EVERY_MS - MIN), 'none');
  assert.equal(decideReminder(trip30, alerted + STILL_OPEN_EVERY_MS), 'still_open');

  const once = { ...trip30, sent: { deadlineMs: DEADLINE, headsUp: true, stillOpenCount: 1 } };
  assert.equal(decideReminder(once, alerted + STILL_OPEN_EVERY_MS + MIN), 'none');
  assert.equal(decideReminder(once, alerted + 2 * STILL_OPEN_EVERY_MS), 'still_open');

  const done = { ...trip30, sent: { deadlineMs: DEADLINE, stillOpenCount: MAX_STILL_OPEN_REMINDERS } };
  assert.equal(decideReminder(done, DEADLINE + 10 * STILL_OPEN_EVERY_MS), 'none');
});

test('a deadline from long ago is left alone, and a missing one is ignored', () => {
  assert.equal(decideReminder(trip30, DEADLINE + 13 * 60 * MIN), 'none');
  assert.equal(decideReminder({ deadlineMs: NaN, deadlineSetAtMs: START }, DEADLINE), 'none');
});


// ---------------------------------------------------------------------------
// A phone that has stopped sending its position
// ---------------------------------------------------------------------------

// A two-hour trip that started an hour ago
const QUIET_START = DEADLINE - 120 * MIN;
const NOW = DEADLINE - 60 * MIN;
const quietFor = (minutes: number, over: object = {}) => ({
  startMs: QUIET_START, lastHeardMs: NOW - minutes * MIN, deadlineMs: DEADLINE, ...over,
});

test('ten minutes of silence, and not a minute less, is told to the traveller', () => {
  assert.equal(QUIET_AFTER_MS, 10 * MIN);
  assert.equal(decideQuietNudge(quietFor(9), NOW), false);
  assert.equal(decideQuietNudge(quietFor(10), NOW), true);
  assert.equal(decideQuietNudge(quietFor(45), NOW), true);
});

test('a trip that never sent a position is counted from its start', () => {
  assert.equal(decideQuietNudge({ startMs: NOW - 9 * MIN, lastHeardMs: null, deadlineMs: DEADLINE }, NOW), false);
  assert.equal(decideQuietNudge({ startMs: NOW - 11 * MIN, lastHeardMs: null, deadlineMs: DEADLINE }, NOW), true);
});

test('the same silence is told again every twenty minutes, three times in all', () => {
  assert.equal(QUIET_NUDGE_EVERY_MS, 20 * MIN);
  assert.equal(MAX_QUIET_NUDGES, 3);
  const heardMs = NOW - 40 * MIN;
  const told = (count: number, minutesAgo: number) =>
    quietFor(40, { sent: { heardMs, count, lastAtMs: NOW - minutesAgo * MIN } });
  assert.equal(decideQuietNudge(told(1, 19), NOW), false);
  assert.equal(decideQuietNudge(told(1, 20), NOW), true);
  assert.equal(decideQuietNudge(told(2, 20), NOW), true);
  assert.equal(decideQuietNudge(told(3, 60), NOW), false);
});

test('a position arriving ends the silence, and the next one starts afresh', () => {
  // Told three times about an earlier silence, then heard from, then quiet again
  const earlier = { heardMs: NOW - 90 * MIN, count: 3, lastAtMs: NOW - 30 * MIN };
  assert.equal(decideQuietNudge(quietFor(12, { sent: earlier }), NOW), true);
  assert.equal(decideQuietNudge(quietFor(2, { sent: earlier }), NOW), false);
});

test('nothing is sent on a test trip, or close to the time, or after it', () => {
  assert.equal(decideQuietNudge(quietFor(30, { isTest: true }), NOW), false);
  // Five minutes from the end the "5 minutes left" reminder takes over
  assert.equal(decideQuietNudge({ startMs: QUIET_START, lastHeardMs: DEADLINE - 40 * MIN, deadlineMs: DEADLINE }, DEADLINE - 5 * MIN), false);
  assert.equal(decideQuietNudge({ startMs: QUIET_START, lastHeardMs: DEADLINE - 40 * MIN, deadlineMs: DEADLINE }, DEADLINE - 6 * MIN), true);
  assert.equal(decideQuietNudge({ startMs: QUIET_START, lastHeardMs: DEADLINE - 40 * MIN, deadlineMs: DEADLINE }, DEADLINE + 20 * MIN), false);
});

test('a trip with nothing to go on is left alone', () => {
  assert.equal(decideQuietNudge({ startMs: null, lastHeardMs: null, deadlineMs: DEADLINE }, NOW), false);
  assert.equal(decideQuietNudge({ startMs: QUIET_START, lastHeardMs: NOW - 30 * MIN, deadlineMs: NaN }, NOW), false);
});
