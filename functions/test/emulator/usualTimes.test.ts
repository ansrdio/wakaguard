/**
 * The usual-time reminder (build 27), against the Firestore emulator.
 * Run with: npm run test:monitor
 */
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import * as admin from 'firebase-admin';
import '../../src/index';
import { planUsual, reminderSlot, sendUsualReminders, USUAL_TIME_SLOTS } from '../../src/usualTimes';

const MIN = 60 * 1000;
const DAY = 24 * 60 * MIN;
const db = () => admin.firestore();
const ts = (ms: number) => admin.firestore.Timestamp.fromMillis(ms);

before(() => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'Firestore emulator must be running');
});

test('usual times are planned each night and a reminder goes once a day, only when no trip runs', async () => {
  const uid = `usual_${Date.now()}`;
  // 7:30 in Nigeria on the last three days
  const lagosMidnight = (ms: number) => Math.floor((ms + 60 * MIN) / DAY) * DAY - 60 * MIN;
  const today = lagosMidnight(Date.now());
  for (const d of [1, 2, 3]) {
    const startMs = today - d * DAY + (7 * 60 + 30) * MIN;
    await db().doc(`users/${uid}/trips/t${d}`).set({
      status: 'completed', startTime: ts(startMs), expiresAt: ts(startMs + DAY), destination: 'Work', expectedDurationMinutes: 40,
    });
  }
  await db().doc(`users/${uid}/trips/test`).set({ status: 'completed', isTest: true, startTime: ts(today - DAY), expiresAt: ts(today + DAY) });
  await db().doc(`pushSubscriptions/${uid}`).set({ fcmToken: 'token-usual', appBuild: 27, appBuildToken: 'token-usual' });

  await planUsual(Date.now());
  const slot = reminderSlot(7 * 60 + 30);
  assert.equal(slot, '0715');
  const planned = (await db().doc(`${USUAL_TIME_SLOTS}/${slot}`).get()).get('people')?.[uid];
  assert.equal(planned?.destination, 'Work');

  const sent: any[] = [];
  const send = async (m: any) => { sent.push(m); };
  const runAt = today + (7 * 60 + 17) * MIN;
  await sendUsualReminders(runAt, send);
  const mine = () => sent.filter((m) => m.token === 'token-usual');
  assert.equal(mine().length, 1);
  assert.equal(mine()[0].data.kind, 'usual_trip');
  await sendUsualReminders(runAt + MIN, send);
  assert.equal(mine().length, 1, 'once a day');

  // Tomorrow, with a trip running: none
  await db().doc(`users/${uid}/trips/now`).set({ status: 'active', startTime: ts(Date.now()) });
  await sendUsualReminders(runAt + DAY, send);
  assert.equal(mine().length, 1);
  await db().doc(`users/${uid}/trips/now`).delete();

  // Switched off, or an older build: none
  await db().doc(`users/${uid}`).set({ usualTimeReminder: false }, { merge: true });
  await sendUsualReminders(runAt + 2 * DAY, send);
  assert.equal(mine().length, 1);
  await db().doc(`users/${uid}`).set({ usualTimeReminder: true }, { merge: true });
  await db().doc(`pushSubscriptions/${uid}`).set({ fcmToken: 'token-usual', appBuild: 26, appBuildToken: 'token-usual' });
  await sendUsualReminders(runAt + 3 * DAY, send);
  assert.equal(mine().length, 1);
});
