import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  decideOverdueAction,
  MAX_ALERT_ATTEMPTS,
  OVERDUE_GRACE_MS,
  OVERDUE_MAX_AGE_MS,
  STALE_CLAIM_MS,
} from '../src/overdueLogic';
import { buildAllClearMessage, buildOverdueMessage, buildSosMessage } from '../src/templates';

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
      decideOverdueAction({ deadlineMs: DEADLINE, overdueAlertState: state, overdueAlertAttempts: 1 }, DEADLINE + 10 * MIN),
      'none',
      state
    );
  }
});

test('a failed alert is retried up to the attempt limit', () => {
  const at = DEADLINE + 10 * MIN;
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
  assert.match(msg, /Last location received Tue,? 3:49\s?pm: https:\/\/maps\.google\.com\/\?q=6\.335,5\.6037/i);
  assert.match(msg, /\/s\?token=abc123/);
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
