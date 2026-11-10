import { test } from 'node:test';
import assert from 'node:assert/strict';
import { backupIsRecent, cutoffMs, DAY_MS, isInAccount, KEEP_DAYS, MAX_TEXTS_PER_HOUR, textAlarms, WALLET_LOW_NGN } from '../src/retentionPlan';

test('the agreed times: trips, SOS and texts 90 days, the trip page 7, removed comments and destination spots 30', () => {
  assert.deepEqual(KEEP_DAYS, {
    endedTrip: 90, tripPage: 7, sosAndCheckIns: 90, textLog: 90, oldReport: 90, removedComment: 30, workingRecord: 2,
    // Google allows a spot from its place search to be kept 30 days at most (build 27)
    destinationSpot: 30,
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

test('the text check warns when a wallet is low or texts jump, and is quiet otherwise', () => {
  const at = (balanceNgn: number | null) => ({ name: "Africa's Talking", balanceNgn });
  const termii = (balanceNgn: number | null) => ({ name: 'Termii', balanceNgn });
  assert.deepEqual(textAlarms([at(40394.65), termii(6978.23)], 2), []);
  assert.deepEqual(textAlarms([], 0), [], 'no wallet in use, nothing to warn about');
  assert.deepEqual(textAlarms([at(null), termii(null)], 0), [], 'a wallet that could not be read is not an alarm');
  assert.deepEqual(textAlarms([at(WALLET_LOW_NGN), termii(WALLET_LOW_NGN)], 0), []);
  const low = textAlarms([at(WALLET_LOW_NGN - 0.01), termii(9000)], 0);
  assert.equal(low.length, 1);
  assert.match(low[0], /^text wallet low: Africa's Talking has NGN 2999\.99 left/);
  assert.match(textAlarms([at(9000), termii(100)], 0)[0], /^text wallet low: Termii has NGN 100\.00 left/);
  assert.match(textAlarms([at(5000)], MAX_TEXTS_PER_HOUR + 1)[0], /texts jumped: 41/);
  assert.equal(textAlarms([at(100), termii(100)], 100).length, 3);
});

test('the deletion only runs with a backup from the last three days', () => {
  const now = 100 * DAY_MS;
  assert.equal(backupIsRecent(now - DAY_MS, now), true);
  assert.equal(backupIsRecent(now - 3 * DAY_MS, now), true);
  assert.equal(backupIsRecent(now - 3 * DAY_MS - 1, now), false);
  assert.equal(backupIsRecent(null, now), false);
  assert.equal(backupIsRecent(now + DAY_MS, now), false, 'a backup dated in the future is not trusted');
});
