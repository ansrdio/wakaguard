/**
 * The one-off heat-season notice against the Firestore emulator, with
 * nothing really sent. Run with: npm run test:monitor
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as admin from 'firebase-admin';
import '../../src/index';
import { HEAT_SEASON_MESSAGE, runHeatSeasonNotice } from '../../src/heatSeasonNotice';

const DAY = 24 * 60 * 60 * 1000;
// Mon 2 Nov 2026, 9 am in Nigeria
const NINE_AM = Date.UTC(2026, 10, 2, 8);
const db = () => admin.firestore();
let seq = 0;

async function person(opts: { build?: number; off?: boolean; lookedDaysAgo?: number; hadWeatherToday?: boolean } = {}) {
  const uid = `heat_${Date.now()}_${seq++}`;
  await db().doc(`weatherAreas/${uid}`).set({
    key: '6.5_3.4', lat: 6.5, lng: 3.4,
    at: admin.firestore.Timestamp.fromMillis(NINE_AM - (opts.lookedDaysAgo ?? 1) * DAY),
    ...(opts.hadWeatherToday ? { lastSentDay: '2026-11-02' } : {}),
  });
  await db().doc(`users/${uid}`).set(opts.off ? { morningWeather: false } : {});
  const token = `token-${uid}`;
  await db().doc(`pushSubscriptions/${uid}`).set({ fcmToken: token, platform: 'android', appBuild: opts.build ?? 25, appBuildToken: token });
  return { uid, token };
}

test('the heat-season notice goes once, only to those who get the morning weather', async () => {
  const wanted = await person();
  const oldBuild = await person({ build: 23 });
  const switchedOff = await person({ off: true });
  const forgotten = await person({ lookedDaysAgo: 40 });
  const hadOneToday = await person({ hadWeatherToday: true });
  const sentTo: string[] = [];
  const send = async (message: any) => {
    sentTo.push(message.token);
    // A quiet weather notification, opening the start form
    assert.equal(message.notification.title, HEAT_SEASON_MESSAGE.title);
    assert.equal(message.android.notification.channelId, 'weather');
    assert.deepEqual(message.data, { kind: 'weather', type: 'heat-season' });
  };

  // A dry run counts and changes nothing
  const dry = await runHeatSeasonNotice(NINE_AM, send, { dryRun: true });
  assert.ok(dry.eligible >= 1);
  assert.equal(dry.sent, 0);
  assert.deepEqual(sentTo, []);
  assert.equal((await db().doc(`weatherAreas/${wanted.uid}`).get()).get('heatSeasonSent'), undefined);

  await runHeatSeasonNotice(NINE_AM, send);
  assert.ok(sentTo.includes(wanted.token));
  for (const left of [oldBuild, switchedOff, forgotten, hadOneToday]) {
    assert.ok(!sentTo.includes(left.token), `not sent to ${left.uid}`);
  }
  assert.equal((await db().doc(`weatherAreas/${wanted.uid}`).get()).get('heatSeasonSent'), true);

  // Never twice
  const before = sentTo.filter((t) => t === wanted.token).length;
  await runHeatSeasonNotice(NINE_AM + 60_000, send);
  assert.equal(sentTo.filter((t) => t === wanted.token).length, before);
});
