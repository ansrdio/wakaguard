/**
 * The morning weather run against the Firestore emulator, with a kept
 * forecast (nothing is asked of MET Norway) and nothing really sent.
 * Run with: npm run test:monitor
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as admin from 'firebase-admin';
import '../../src/index';
import { runMorningWeather } from '../../src/morningWeather';
import { keepArea, roughArea } from '../../src/weather';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const MORNING = Date.UTC(2026, 9, 19, 5, 30);
const db = () => admin.firestore();
let seq = 0;

async function area(key: string, symbol: string) {
  const timeseries = [0, 4, 9].map((h) => ({
    time: new Date(MORNING + h * HOUR).toISOString(),
    data: { instant: { details: { air_temperature: 30 } }, next_1_hours: { summary: { symbol_code: h === 9 ? symbol : 'cloudy' }, details: {} } },
  }));
  // Fetched "now", so the record-deletion test running alongside does not
  // take it for an old forecast and delete it mid-test
  await db().doc(`weatherForecasts/${key}`).set({ timeseries, expiresMs: MORNING + 2 * HOUR, lastModified: null, fetchedMs: Date.now() });
}

async function person(key: string, opts: { build?: number; off?: boolean; lookedDaysAgo?: number } = {}) {
  const uid = `mw_${Date.now()}_${seq++}`;
  const [lat, lng] = key.split('_').map(Number);
  await db().doc(`weatherAreas/${uid}`).set({ key, lat, lng, at: admin.firestore.Timestamp.fromMillis(MORNING - (opts.lookedDaysAgo ?? 1) * DAY) });
  await db().doc(`users/${uid}`).set(opts.off ? { morningWeather: false } : {});
  const token = `token-${uid}`;
  await db().doc(`pushSubscriptions/${uid}`).set({ fcmToken: token, platform: 'android', appBuild: opts.build ?? 24, appBuildToken: token });
  return { uid, token };
}

test('a rainy day is told once to those who want it, on builds that can switch it off', async () => {
  const wet = `9.${seq}_7.${seq}`; seq++;
  const dry = `8.${seq}_6.${seq}`; seq++;
  await area(wet, 'heavyrain');
  await area(dry, 'fair');
  const yes = await person(wet);
  const off = await person(wet, { off: true });
  const old = await person(wet, { build: 23 });
  const calm = await person(dry);
  const forgotten = await person(wet, { lookedDaysAgo: 40 });

  const sent: any[] = [];
  await runMorningWeather(MORNING, async (m) => { sent.push(m); });
  const to = sent.map((m) => m.token);
  assert.ok(to.includes(yes.token));
  assert.ok(!to.includes(off.token), 'switched off');
  assert.ok(!to.includes(old.token), 'a build without the switch');
  assert.ok(!to.includes(calm.token), 'nothing worth saying');
  assert.ok(!to.includes(forgotten.token));
  const mine = sent.find((m) => m.token === yes.token);
  assert.equal(mine.notification.title, 'Heavy rain expected today');
  assert.equal(mine.data.kind, 'weather');

  assert.equal((await db().doc(`weatherAreas/${off.uid}`).get()).exists, false, 'switched off: the area is forgotten');
  assert.equal((await db().doc(`weatherAreas/${forgotten.uid}`).get()).exists, false, 'not looked at for a month: forgotten');

  const again: any[] = [];
  await runMorningWeather(MORNING + 10 * 60 * 1000, async (m) => { again.push(m); });
  assert.ok(!again.some((m) => m.token === yes.token), 'never twice in a day');
});

test('two runs started at once still tell each person only once', async () => {
  const wet = `7.${seq}_5.${seq}`; seq++;
  await area(wet, 'heavyrain');
  const a = await person(wet);
  const b = await person(wet);

  const sent: any[] = [];
  const send = async (m: any) => { sent.push(m); };
  await Promise.all([runMorningWeather(MORNING, send), runMorningWeather(MORNING, send)]);
  assert.equal(sent.filter((m) => m.token === a.token).length, 1);
  assert.equal(sent.filter((m) => m.token === b.token).length, 1);
});

test('a dead link is noted, not tried again, and a new link starts sending again', async () => {
  const wet = `6.${seq}_4.${seq}`; seq++;
  await area(wet, 'heavyrain');
  const gone = await person(wet);

  const tried: string[] = [];
  const dead = Object.assign(new Error('Requested entity was not found.'), { code: 'messaging/registration-token-not-registered' });
  await runMorningWeather(MORNING, async (m: any) => { tried.push(m.token); throw dead; });
  assert.deepEqual(tried.filter((t) => t === gone.token), [gone.token]);
  const note = (await db().doc(`deadPushTokens/${gone.uid}`).get()).data();
  assert.equal(note?.token, gone.token);

  // Another morning (the day's mark cleared, so the kept forecast still
  // serves and nothing is asked of MET Norway): skipped without trying
  const anotherMorning = () => db().doc(`weatherAreas/${gone.uid}`).update({ lastSentDay: admin.firestore.FieldValue.delete() });
  await anotherMorning();
  const next: string[] = [];
  await runMorningWeather(MORNING + 10 * 60 * 1000, async (m: any) => { next.push(m.token); });
  assert.ok(!next.includes(gone.token));

  // The app saves a new link: it no longer matches the note
  const fresh = `token-new-${gone.uid}`;
  await db().doc(`pushSubscriptions/${gone.uid}`).update({ fcmToken: fresh, appBuildToken: fresh });
  await anotherMorning();
  const later: string[] = [];
  await runMorningWeather(MORNING + 20 * 60 * 1000, async (m: any) => { later.push(m.token); });
  assert.ok(later.includes(fresh));
});

test('a passing failure is not taken for a dead link', async () => {
  const wet = `5.${seq}_3.${seq}`; seq++;
  await area(wet, 'heavyrain');
  const flaky = await person(wet);
  const busy = Object.assign(new Error('Service unavailable'), { code: 'messaging/server-unavailable' });
  await runMorningWeather(MORNING, async (m: any) => { if (m.token === flaky.token) throw busy; });
  assert.equal((await db().doc(`deadPushTokens/${flaky.uid}`).get()).exists, false);
});

test('a look at the weather keeps only the rough area, and none once switched off', async () => {
  const uid = `mw_keep_${Date.now()}`;
  await db().doc(`users/${uid}`).set({});
  await keepArea(uid, roughArea(6.4567, 3.3912)!);
  const kept = (await db().doc(`weatherAreas/${uid}`).get()).data()!;
  assert.equal(kept.key, '6.5_3.4');
  assert.deepEqual([kept.lat, kept.lng], [6.5, 3.4], 'about 10 km, never the position itself');
  await db().doc(`users/${uid}`).update({ morningWeather: false });
  await keepArea(uid, roughArea(6.4567, 3.3912)!);
  assert.equal((await db().doc(`weatherAreas/${uid}`).get()).exists, false);
});
