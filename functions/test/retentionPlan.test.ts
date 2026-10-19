import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cutoffMs, DAY_MS, isInAccount, KEEP_DAYS, MAX_TEXTS_PER_HOUR, textAlarms, WALLET_LOW_NGN } from '../src/retentionPlan';

test('the agreed times: trips, SOS and texts 90 days, the trip page 7, removed comments 30', () => {
  assert.deepEqual(KEEP_DAYS, {
    endedTrip: 90, tripPage: 7, sosAndCheckIns: 90, textLog: 90, oldReport: 90, removedComment: 30, workingRecord: 2,
  });
  assert.equal(cutoffMs(100 * DAY_MS, 90), 10 * DAY_MS);
});

test("only records inside someone's account are deleted, not the old top-level copies", () => {
  assert.equal(isInAccount('users/u1/trips/t1', 'trips'), true);
  assert.equal(isInAccount('trips/t1', 'trips'), false);
  assert.equal(isInAccount('users/u1/trips/t1/extra/x', 'trips'), false);
  assert.equal(isInAccount('users/u1/alerts/a1', 'alerts'), true);
  assert.equal(isInAccount('users/u1/alerts/a1', 'checkIns'), false);
});

test('the text check warns when the wallet is low or texts jump, and is quiet otherwise', () => {
  assert.deepEqual(textAlarms(9090.43, 2), []);
  assert.deepEqual(textAlarms(null, 0), [], 'a wallet that could not be read is not an alarm');
  assert.match(textAlarms(WALLET_LOW_NGN - 0.01, 0)[0], /wallet low/);
  assert.deepEqual(textAlarms(WALLET_LOW_NGN, 0), []);
  assert.match(textAlarms(5000, MAX_TEXTS_PER_HOUR + 1)[0], /texts jumped: 41/);
  assert.equal(textAlarms(100, 100).length, 2);
});
