/**
 * The daily deletion and the hourly text check, against the Firestore
 * emulator. Records of every kind are made just past and just inside their
 * time, and only the ones past it must go.
 * Run with: npm run test:monitor
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as admin from 'firebase-admin';
import '../../src/index';
import { runRecordDeletion } from '../../src/recordRetention';
import { runTextWatch } from '../../src/serverWatch';
import { DAY_MS } from '../../src/retentionPlan';

const db = () => admin.firestore();
const NOW = Date.now();
const at = (daysAgo: number) => admin.firestore.Timestamp.fromMillis(NOW - daysAgo * DAY_MS);
const tag = `rr${NOW}`;
const exists = async (path: string) => (await db().doc(path).get()).exists;
/** A backup made yesterday, as the daily schedule makes */
const backedUp = async () => NOW - DAY_MS;

test("a trip's destination spot goes 30 days after its link expired, and the trip stays (build 27)", async () => {
  const uid = `${tag}_spots`;
  const spot = { lat: 6.6135, lng: 3.3584 };
  const made: Record<string, Record<string, unknown>> = {
    [`users/${uid}/trips/pastSpot`]: { status: 'completed', expiresAt: at(31), destination: 'Ikeja City Mall', destinationPoint: spot },
    [`users/${uid}/trips/cancelledPast`]: { status: 'cancelled', expiresAt: at(35), destinationPoint: spot },
    [`users/${uid}/trips/insideSpot`]: { status: 'completed', expiresAt: at(29), destinationPoint: spot },
    [`users/${uid}/trips/running`]: { status: 'active', expiresAt: at(31), destinationPoint: spot },
    [`trips/${tag}_legacySpot`]: { status: 'completed', expiresAt: at(31), destinationPoint: spot },
  };
  await Promise.all(Object.entries(made).map(([path, data]) => db().doc(path).set(data)));

  const counts = await runRecordDeletion(NOW, backedUp);
  assert.ok(counts.destinationSpots >= 2);

  const spotOf = async (path: string) => (await db().doc(path).get()).get('destinationPoint');
  assert.equal(await spotOf(`users/${uid}/trips/pastSpot`), undefined);
  assert.equal(await spotOf(`users/${uid}/trips/cancelledPast`), undefined);
  assert.equal((await db().doc(`users/${uid}/trips/pastSpot`).get()).get('destination'), 'Ikeja City Mall');
  assert.deepEqual(await spotOf(`users/${uid}/trips/insideSpot`), spot);
  assert.deepEqual(await spotOf(`users/${uid}/trips/running`), spot);
  assert.deepEqual(await spotOf(`trips/${tag}_legacySpot`), spot);
});

test('records past their time are deleted, and nothing else', async () => {
  const uid = `${tag}_u`;
  const made: Record<string, Record<string, unknown>> = {
    // Trips in the account: an ended one past 90 days goes; a recent one, and a running one, stay
    [`users/${uid}/trips/old`]: { status: 'completed', expiresAt: at(91) },
    [`users/${uid}/trips/cancelledOld`]: { status: 'cancelled', expiresAt: at(120) },
    [`users/${uid}/trips/recent`]: { status: 'completed', expiresAt: at(89) },
    [`users/${uid}/trips/running`]: { status: 'active', expiresAt: at(91) },
    // A copy from before the January data moved into accounts is left alone
    [`trips/${tag}_legacy`]: { status: 'completed', expiresAt: at(200) },
    // The contacts' page: a week after its link stopped working
    [`sharedTrips/${tag}_old`]: { status: 'completed', expiresAt: at(8) },
    [`sharedTrips/${tag}_new`]: { status: 'completed', expiresAt: at(6) },
    // SOS, checkpoint stops and old timers: 90 days
    [`users/${uid}/alerts/old`]: { type: 'sos', createdAt: at(91) },
    [`users/${uid}/alerts/new`]: { type: 'sos', createdAt: at(10) },
    [`users/${uid}/checkIns/old`]: { createdAt: at(91) },
    [`users/${uid}/checkIns/new`]: { createdAt: at(10) },
    [`users/${uid}/safetyTimers/old`]: { createdAt: at(91) },
    [`users/${uid}/safetyTimers/new`]: { createdAt: at(10) },
    // The log of texts: 90 days after sending
    [`safetyMessageLogs/${tag}_old`]: { uid, createdAt: at(91), recipients: [] },
    [`safetyMessageLogs/${tag}_new`]: { uid, createdAt: at(89), recipients: [] },
    // Road reports: expired or resolved ones 90 days after they expired; live and flagged ones stay
    [`reports/${tag}_expired`]: { uid, status: 'expired', expiresAt: at(91) },
    [`reports/${tag}_resolved`]: { uid, status: 'resolved', expiresAt: at(95) },
    [`reports/${tag}_expiredRecent`]: { uid, status: 'expired', expiresAt: at(30) },
    [`reports/${tag}_active`]: { uid, status: 'active', expiresAt: at(91) },
    [`reports/${tag}_flagged`]: { uid, status: 'flagged', expiresAt: at(91) },
    // Removed comments: 30 days after posting; shown ones stay with their report
    [`comments/${tag}_removedOld`]: { reportId: `${tag}_active`, status: 'removed', createdAt: at(31) },
    [`comments/${tag}_removedNew`]: { reportId: `${tag}_active`, status: 'removed', createdAt: at(5) },
    [`comments/${tag}_shownOld`]: { reportId: `${tag}_active`, status: 'active', createdAt: at(60) },
    // Working records: two days
    [`textOptOutTries/${tag}_old`]: { startMs: NOW - 3 * DAY_MS, count: 1 },
    [`textOptOutTries/${tag}_new`]: { startMs: NOW - DAY_MS, count: 1 },
    [`placeNameTries/${tag}_old`]: { startMs: NOW - 3 * DAY_MS, count: 1 },
    [`placeSearchTries/${tag}_old`]: { startMs: NOW - 3 * DAY_MS, suggestCount: 1 },
    [`placeSearchTries/${tag}_new`]: { startMs: NOW - DAY_MS, suggestCount: 1 },
    [`placeNameTries/${tag}_new`]: { startMs: NOW - DAY_MS, count: 1 },
    [`weatherForecasts/${tag}_old`]: { fetchedMs: NOW - 3 * DAY_MS, expiresMs: NOW - 3 * DAY_MS, timeseries: [] },
    [`weatherForecasts/${tag}_new`]: { fetchedMs: NOW - DAY_MS, expiresMs: NOW, timeseries: [] },
  };
  await Promise.all(Object.entries(made).map(([path, data]) => db().doc(path).set(data)));

  const counts = await runRecordDeletion(NOW, backedUp);
  for (const [kind, n] of Object.entries(counts)) assert.ok(n >= 0, `${kind} failed`);

  const gone = [
    `users/${uid}/trips/old`, `users/${uid}/trips/cancelledOld`, `sharedTrips/${tag}_old`,
    `users/${uid}/alerts/old`, `users/${uid}/checkIns/old`, `users/${uid}/safetyTimers/old`,
    `safetyMessageLogs/${tag}_old`, `reports/${tag}_expired`, `reports/${tag}_resolved`,
    `comments/${tag}_removedOld`, `textOptOutTries/${tag}_old`, `placeNameTries/${tag}_old`, `placeSearchTries/${tag}_old`,
    `weatherForecasts/${tag}_old`,
  ];
  const kept = Object.keys(made).filter((path) => !gone.includes(path));
  for (const path of gone) assert.equal(await exists(path), false, `${path} should be deleted`);
  for (const path of kept) assert.equal(await exists(path), true, `${path} should be kept`);
});

test('a second run deletes nothing more, so it is safe to run again', async () => {
  const uid = `${tag}_again`;
  await db().doc(`users/${uid}/trips/recent`).set({ status: 'completed', expiresAt: at(30) });
  await runRecordDeletion(NOW, backedUp);
  await runRecordDeletion(NOW, backedUp);
  assert.equal(await exists(`users/${uid}/trips/recent`), true);
});

test('without a recent backup nothing is deleted', async () => {
  const uid = `${tag}_nobackup`;
  await db().doc(`users/${uid}/trips/old`).set({ status: 'completed', expiresAt: at(200) });
  assert.deepEqual(await runRecordDeletion(NOW, async () => null), {});
  assert.deepEqual(await runRecordDeletion(NOW, async () => NOW - 4 * DAY_MS), {}, 'a backup four days old is too old');
  assert.deepEqual(await runRecordDeletion(NOW, async () => { throw new Error('cannot list backups'); }), {});
  assert.equal(await exists(`users/${uid}/trips/old`), true);
  await runRecordDeletion(NOW, backedUp);
  assert.equal(await exists(`users/${uid}/trips/old`), false);
});

test('the text check warns when texts jump and when a text wallet is low', async () => {
  const uid = `${tag}_texts`;
  const recipients = (n: number) => Array.from({ length: n }, (_, i) => ({ name: `C${i}`, phoneE164: `+2340000000${String(i).padStart(3, '0')}` }));
  await db().doc(`safetyMessageLogs/${tag}_burst`).set({ uid, provider: 'termii', recipients: recipients(41), createdAt: at(1 / 48) });
  // Held back while texting was off: not counted
  await db().doc(`safetyMessageLogs/${tag}_held`).set({ uid, provider: 'blocked', recipients: recipients(30), createdAt: at(1 / 48) });
  // Older than an hour: not counted
  await db().doc(`safetyMessageLogs/${tag}_earlier`).set({ uid, provider: 'termii', recipients: recipients(30), createdAt: at(1 / 12) });

  const previous = { main: process.env.SMS_PROVIDER, backup: process.env.SMS_FALLBACK_PROVIDER };
  process.env.SMS_PROVIDER = 'africastalking';
  process.env.SMS_FALLBACK_PROVIDER = 'termii';
  try {
    const low = await runTextWatch(NOW, { africastalking: async () => 2500, termii: async () => 6978.23 });
    assert.ok(low.texts >= 41 && low.texts < 71, `counted ${low.texts}`);
    assert.deepEqual(low.wallets, [{ name: "Africa's Talking", balanceNgn: 2500 }, { name: 'Termii', balanceNgn: 6978.23 }]);
    assert.ok(low.alarms.some((a) => /texts jumped/.test(a)));
    assert.ok(low.alarms.some((a) => /wallet low: Africa's Talking has NGN 2500\.00/.test(a)));
    assert.ok(!low.alarms.some((a) => /Termii/.test(a)), 'the backup wallet is not low');

    const unreadable = await runTextWatch(NOW, {
      africastalking: async () => { throw new Error("Africa's Talking is down"); },
      termii: async () => 100,
    });
    assert.equal(unreadable.wallets[0].balanceNgn, null);
    assert.ok(!unreadable.alarms.some((a) => /Africa's Talking/.test(a)), 'a wallet that cannot be read is not an alarm');
    assert.ok(unreadable.alarms.some((a) => /wallet low: Termii has NGN 100\.00/.test(a)), 'the other wallet is still checked');

    process.env.SMS_PROVIDER = 'mock';
    delete process.env.SMS_FALLBACK_PROVIDER;
    assert.deepEqual((await runTextWatch(NOW)).wallets, [], 'no provider with a wallet, nothing read');
  } finally {
    for (const [key, value] of [['SMS_PROVIDER', previous.main], ['SMS_FALLBACK_PROVIDER', previous.backup]] as const) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
