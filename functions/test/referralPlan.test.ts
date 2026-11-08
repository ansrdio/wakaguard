import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ACCOUNTS_FROM_MS, addTrip, balanceOf, CASH_OUT_OPENS_MS, cashOutProblem, deadlineOf, joinProblem, lagosDay,
  lagosMonth, monthStart, nigerianMobile, paidDetails, placeReward, readPayTo, readUsername, refusalFor, tripProblem,
  tripsDone, TripFacts,
} from '../src/referralPlan';
import { joinProblemText } from '../../src/lib/referralWords';
import { readFileSync } from 'node:fs';

const MIN = 60 * 1000;
const DAY = 24 * 60 * MIN;
const JOINED = Date.UTC(2026, 10, 12, 9, 0);
// About 1.1 km apart, north to south
const HERE = { lat: 6.5, lng: 3.35 };
const THERE = { lat: 6.51, lng: 3.35 };

const realTrip = (changes: Partial<TripFacts> = {}): TripFacts => ({
  status: 'completed', isTest: false, startMs: JOINED, endMs: JOINED + 30 * MIN, createdMs: JOINED,
  endedSeenMs: JOINED + 30 * MIN, startLocation: HERE, endLocation: THERE, farthestM: 1200, positions: 12, ...changes,
});

test('a username typed into "Who invited you?" is read like the database rules read one', () => {
  assert.equal(readUsername('Deve'), 'Deve');
  assert.equal(readUsername('  @lord_elijah '), 'lord_elijah');
  for (const bad of ['', 'ab', '1abc', 'has space', 'a'.repeat(21), 42, null]) assert.equal(readUsername(bad), null, String(bad));
});

test('someone can name who invited them only on a new account, once, and not themselves', () => {
  const signedUp = ACCOUNTS_FROM_MS + DAY;
  const fine = { uid: 'friend', accountCreatedMs: signedUp, alreadyJoined: false, inviterUid: 'inviter', nowMs: signedUp + DAY };
  assert.equal(joinProblem(fine), null);
  assert.equal(joinProblem({ ...fine, alreadyJoined: true }), 'already');
  assert.equal(joinProblem({ ...fine, accountCreatedMs: ACCOUNTS_FROM_MS - 1 }), 'too_early', 'accounts from before the public launch cannot name anyone');
  assert.equal(joinProblem({ ...fine, accountCreatedMs: ACCOUNTS_FROM_MS }), null);
  assert.equal(joinProblem({ ...fine, nowMs: signedUp + 7 * DAY + 1 }), 'too_late');
  assert.equal(joinProblem({ ...fine, inviterUid: null }), 'not_found');
  assert.equal(joinProblem({ ...fine, inviterUid: 'friend' }), 'self');
});

test('a real trip is not a test, lasts 15 minutes, moves about 1 km and ends with "I\'ve arrived"', () => {
  assert.equal(tripProblem(realTrip()), null);
  assert.equal(tripProblem(realTrip({ status: 'cancelled' })), 'not_arrived');
  assert.equal(tripProblem(realTrip({ isTest: true })), 'test');
  assert.equal(tripProblem(realTrip({ endMs: JOINED + 14 * MIN, endedSeenMs: JOINED + 14 * MIN })), 'too_short');
  assert.equal(tripProblem(realTrip({ positions: 2 })), 'too_few_positions');
  assert.equal(tripProblem(realTrip({ positions: undefined })), 'too_few_positions');
  assert.equal(tripProblem(realTrip({ endLocation: HERE, farthestM: 900 })), 'did_not_move');
  // A round trip ends where it began; how far it got counts
  assert.equal(tripProblem(realTrip({ endLocation: HERE, farthestM: 1500 })), null);
});

test('the phone cannot make a trip longer than the server saw it', () => {
  // Says it started an hour ago, but the server saw it made 5 minutes before it ended
  assert.equal(tripProblem(realTrip({ startMs: JOINED - 60 * MIN, createdMs: JOINED + 25 * MIN })), 'too_short');
  // Says it ended an hour later than the server saw
  assert.equal(tripProblem(realTrip({ endMs: JOINED + 90 * MIN, endedSeenMs: JOINED + 10 * MIN })), 'too_short');
});

test('4 trips on 4 different days in Nigeria, within 30 days of signing up', () => {
  let progress = { joinedMs: JOINED, days: [] as string[], devices: [] as string[] };
  const add = (ms: number, device = 'phone-a') => addTrip(progress, ms, device);

  progress = add(JOINED + 2 * 60 * MIN)!;
  assert.deepEqual(progress.days, ['2026-11-12']);
  assert.equal(add(JOINED + 5 * 60 * MIN), null, 'a second trip the same day adds nothing');
  // 23:30 UTC is 00:30 the next day in Nigeria
  progress = add(Date.UTC(2026, 10, 12, 23, 30))!;
  assert.deepEqual(progress.days, ['2026-11-12', '2026-11-13']);
  assert.equal(add(JOINED - MIN), null, 'nothing from before they signed up');
  assert.equal(add(deadlineOf(JOINED)), null, 'nothing after the 30 days');

  progress = add(JOINED + 3 * DAY, 'phone-b')!;
  assert.deepEqual(progress.devices, ['phone-a', 'phone-b']);
  assert.equal(tripsDone(progress), false);
  progress = add(JOINED + 10 * DAY)!;
  assert.equal(tripsDone(progress), true);
  assert.equal(add(JOINED + 11 * DAY), null, 'nothing more once the 4 are there');
});

test('no reward when the trips came from the inviter\'s phone, or from a phone that earned one already', () => {
  assert.equal(refusalFor(['a', 'b'], new Set(['c']), new Set()), null);
  assert.equal(refusalFor(['a', 'b'], new Set(['b']), new Set()), 'same_phone');
  assert.equal(refusalFor(['a'], new Set(), new Set(['a'])), 'phone_used');
});

test('a reward is held 7 days, and moves to a later month past 10 a person or the month\'s budget', () => {
  const none = () => 0;
  const qualified = Date.UTC(2026, 11, 2, 12, 0);
  assert.deepEqual(placeReward(qualified, none, none), { month: '2026-12', availableMs: qualified + 7 * DAY });

  // Late in the month the 7 days run into the next
  const late = Date.UTC(2026, 11, 28, 12, 0);
  assert.equal(placeReward(late, none, none).month, '2027-01');

  const tenInDecember = (month: string) => (month === '2026-12' ? 10 : 0);
  assert.deepEqual(placeReward(qualified, tenInDecember, none), { month: '2027-01', availableMs: monthStart('2027-01') });
  const budgetSpent = (month: string) => (month === '2026-12' || month === '2027-01' ? 400 : 0);
  assert.equal(placeReward(qualified, none, budgetSpent).month, '2027-02');
  assert.equal(monthStart('2027-01'), Date.UTC(2026, 11, 31, 23, 0), 'midnight in Nigeria');
});

test('the balance: waiting, ready, asked for and paid', () => {
  const now = Date.UTC(2026, 11, 20);
  const rewards = [
    { amount: 500, availableMs: now - DAY },
    { amount: 500, availableMs: now - 2 * DAY },
    { amount: 500, availableMs: now - 3 * DAY },
    { amount: 500, availableMs: now + 3 * DAY },
  ];
  assert.deepEqual(balanceOf(rewards, [], now), { waiting: 500, ready: 1500, requested: 0, paid: 0, nextReadyMs: now + 3 * DAY });
  assert.deepEqual(
    balanceOf(rewards, [{ amount: 1000, state: 'paid' }, { amount: 500, state: 'requested' }, { amount: 500, state: 'refused' }], now),
    { waiting: 500, ready: 0, requested: 500, paid: 1000, nextReadyMs: now + 3 * DAY },
    'a refused request goes back into the balance',
  );
});

test('cash out opens on 15 December, from ₦1,000, one request at a time', () => {
  const ready = (amount: number, requested = 0) => ({ waiting: 0, ready: amount, requested, paid: 0, nextReadyMs: null });
  assert.equal(cashOutProblem(ready(5000), CASH_OUT_OPENS_MS - 1), 'not_open');
  assert.equal(cashOutProblem(ready(5000), CASH_OUT_OPENS_MS), null);
  assert.equal(cashOutProblem(ready(500), CASH_OUT_OPENS_MS), 'too_little');
  assert.equal(cashOutProblem(ready(1000, 500), CASH_OUT_OPENS_MS), 'open_request');
  assert.equal(lagosDay(CASH_OUT_OPENS_MS), '2026-12-15');
  assert.equal(lagosMonth(CASH_OUT_OPENS_MS), '2026-12');
});

test('airtime goes to a Nigerian mobile number; a bank transfer needs a 10-digit account', () => {
  assert.equal(nigerianMobile('0700 000 0000'), '+2347000000000');
  assert.equal(nigerianMobile('+234 800 000 0000'), '+2348000000000');
  for (const bad of ['0100 000 0000', '070000000', '+1 555 000 0000', '', null]) assert.equal(nigerianMobile(bad), null, String(bad));

  assert.deepEqual(readPayTo({ method: 'airtime', phone: '0900 000 0000' }), { method: 'airtime', phone: '+2349000000000' });
  assert.deepEqual(
    readPayTo({ method: 'bank', bankName: ' Some  Bank ', accountNumber: '00000 00000', accountName: 'Ada <b>Obi</b>' }),
    { method: 'bank', bankName: 'Some Bank', accountNumber: '0000000000', accountName: 'Ada bObi/b' },
  );
  assert.equal(readPayTo({ method: 'bank', bankName: 'Some Bank', accountNumber: '123', accountName: 'Ada Obi' }), null);
  assert.equal(readPayTo({ method: 'cash' }), null);
});

test('once paid, only the last 4 digits of where it went are kept', () => {
  assert.deepEqual(paidDetails({ method: 'airtime', phone: '+2347000001234' }), { method: 'airtime', phoneEnding: '1234' });
  assert.deepEqual(
    paidDetails({ method: 'bank', bankName: 'Some Bank', accountNumber: '0000005678', accountName: 'Ada Obi' }),
    { method: 'bank', bankName: 'Some Bank', accountEnding: '5678' },
  );
});

test('invites start at midnight on 1 December 2026 in Nigeria, and the app and Terms say so', () => {
  assert.equal(new Date(ACCOUNTS_FROM_MS).toISOString(), '2026-11-30T23:00:00.000Z');
  assert.equal(lagosDay(ACCOUNTS_FROM_MS), '2026-12-01');
  assert.equal(lagosDay(ACCOUNTS_FROM_MS - 1), '2026-11-30');
  assert.match(joinProblemText('too_early', 'someone'), /from 1 December 2026/);
  const terms = readFileSync(new URL('../../src/app/terms/page.tsx', import.meta.url), 'utf8');
  assert.match(terms, /Only accounts created from 1 December 2026 can be invited/);
});
