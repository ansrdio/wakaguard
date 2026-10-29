/**
 * @fileoverview A one-off heat-season notice, Monday 2 November 2026, 9 am
 *
 * The owner asked on 28 October 2026 for a notification about the heat
 * season (NiMet confirmed a strong El Niño; NEMA advised on 26 October
 * against long trips between 11 am and 4 pm). It goes once, only to people
 * who get the morning weather (morningWeather.ts: Morning weather on in
 * Settings, an area looked at in the last 30 days, build 24 or later), as a
 * weather notification, which opens the start form when tapped. Anyone sent a
 * weather notification that morning is left out, so nobody gets two.
 *
 * It runs only on NOTICE_DAY; delete the function after that day.
 *
 * @module heatSeasonNotice
 */

import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import type { TokenMessage } from 'firebase-admin/messaging';
import { AREA_KEPT_DAYS, buildWeatherPush, lagosDay, WEATHER_FROM_BUILD } from './morningWeather';
import { believedBuild, PushSubscription, TravellerMessage } from './reminderPush';
import { WEATHER_AREAS } from './weather';

/** The Nigerian date it goes out on */
export const NOTICE_DAY = '2026-11-02';
const DAY_MS = 24 * 60 * 60 * 1000;

export const HEAT_SEASON_MESSAGE: TravellerMessage = {
  title: 'Heat season is here',
  body: 'NEMA advises avoiding long trips between 11 am and 4 pm. WakaGuard will warn you at 6:30 am on days that will feel dangerously hot where you are.',
  data: { kind: 'weather', type: 'heat-season' },
};

type Send = (message: TokenMessage) => Promise<unknown>;

/**
 * Send the notice to everyone who should get it, once each. With `dryRun`
 * nothing is sent or marked: it only counts who would get it.
 */
export async function runHeatSeasonNotice(
  nowMs: number,
  send: Send = (m) => admin.messaging().send(m),
  { dryRun = false } = {}
): Promise<{ eligible: number; sent: number; skipped: Record<string, number> }> {
  const db = admin.firestore();
  const today = lagosDay(nowMs);
  const areas = await db.collection(WEATHER_AREAS)
    .where('at', '>=', admin.firestore.Timestamp.fromMillis(nowMs - AREA_KEPT_DAYS * DAY_MS))
    .get();

  const skipped: Record<string, number> = {};
  const skip = (why: string) => { skipped[why] = (skipped[why] || 0) + 1; };
  let eligible = 0;
  let sent = 0;
  for (const area of areas.docs) {
    const uid = area.id;
    if (area.get('heatSeasonSent') === true) { skip('already sent'); continue; }
    if (area.get('lastSentDay') === today) { skip('had a weather notification this morning'); continue; }
    if ((await db.doc(`users/${uid}`).get()).get('morningWeather') === false) { skip('morning weather off'); continue; }
    const subscription = (await db.doc(`pushSubscriptions/${uid}`).get()).data() as PushSubscription | undefined;
    const build = subscription ? believedBuild(subscription) : null;
    if (!subscription?.fcmToken || build === null || build < WEATHER_FROM_BUILD) { skip('no phone on build 24 or later'); continue; }
    eligible += 1;
    if (dryRun) continue;
    try {
      await send(buildWeatherPush(subscription, HEAT_SEASON_MESSAGE));
      await area.ref.update({ heatSeasonSent: true });
      sent += 1;
    } catch (error) {
      skip('not delivered');
      functions.logger.warn('Heat-season notice not delivered', { uid, error: String(error) });
    }
  }
  functions.logger.info(`Heat-season notice: ${eligible} eligible, ${sent} sent${dryRun ? ' (dry run)' : ''}`, { skipped });
  return { eligible, sent, skipped };
}

export const heatSeasonNotice = functions.pubsub
  .schedule('0 9 2 11 *')
  .timeZone('Africa/Lagos')
  .onRun(async () => {
    // The schedule would come round again next year; it is only for this one day
    if (lagosDay(Date.now()) !== NOTICE_DAY) {
      functions.logger.info('Heat-season notice: not its day, nothing sent');
      return null;
    }
    await runHeatSeasonNotice(Date.now());
    return null;
  });
