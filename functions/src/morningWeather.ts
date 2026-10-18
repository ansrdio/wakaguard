/**
 * @fileoverview The morning weather notification
 *
 * At 6:30 am Nigeria time, everyone who has looked at the weather in the app
 * lately, and has not switched this off in Settings, is told about rain, a
 * storm, fog or great heat expected where they are today. Only on such days:
 * a daily message would get WakaGuard's notifications switched off, and on an
 * iPhone that one switch also silences the trip reminders. Tapping it opens
 * the start form (the owner, 14 October 2026).
 *
 * Where they are is the rough area (about 10 km) kept from their last weather
 * look-up (weather.ts, `weatherAreas`, read by the server only), dropped after
 * AREA_KEPT_DAYS without one, and deleted when the notification is switched off.
 *
 * @module morningWeather
 */

import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import type { TokenMessage } from 'firebase-admin/messaging';
import { DayOutlook, forecastFor, readDay, WEATHER_AREAS } from './weather';
import { believedBuild, PushSubscription, TravellerMessage } from './reminderPush';

/** The first build with the Settings switch: no one is sent what they cannot turn off */
export const WEATHER_FROM_BUILD = 24;
/** The app's Android channel for it (TripReminderMessagingService.java): quieter than the trip reminders */
export const WEATHER_CHANNEL_ID = 'weather';
/** An area not looked at for this long is forgotten */
export const AREA_KEPT_DAYS = 30;
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
/** Nigeria is an hour ahead of UTC all year */
const LAGOS_OFFSET_MS = HOUR_MS;
/** "Today" ends at 9 pm Nigeria time */
const DAY_ENDS_HOUR = 21;

/** The Nigerian date, as YYYY-MM-DD, so nobody is sent two in a day */
export function lagosDay(ms: number): string {
  return new Date(ms + LAGOS_OFFSET_MS).toISOString().slice(0, 10);
}

/** 9 pm Nigeria time on the Nigerian day of `ms` */
export function endOfLagosDay(ms: number): number {
  const lagosMidnight = Math.floor((ms + LAGOS_OFFSET_MS) / DAY_MS) * DAY_MS - LAGOS_OFFSET_MS;
  return lagosMidnight + DAY_ENDS_HOUR * HOUR_MS;
}

/** "3 pm", "11 am", in Nigeria time */
function lagosHour(ms: number): string {
  const hour = new Date(ms + LAGOS_OFFSET_MS).getUTCHours();
  return `${hour % 12 || 12} ${hour < 12 ? 'am' : 'pm'}`;
}

/** The notification for the day, or null when nothing is worth a word */
export function morningMessage(day: DayOutlook, nowMs: number): TravellerMessage | null {
  if (!day.kind) return null;
  const from = day.startsAtMs === null || day.startsAtMs < nowMs + HOUR_MS
    ? 'Starting soon where you are.'
    : `From about ${lagosHour(day.startsAtMs)} where you are.`;
  const data = { kind: 'weather', type: day.kind };
  switch (day.kind) {
    case 'storm':
      return { title: 'Thunderstorms expected today', body: `${from} If you can, travel before or after them.`, data };
    case 'heavy-rain':
      return { title: 'Heavy rain expected today', body: `${from} Allow extra time; low roads may flood.`, data };
    case 'rain':
      return { title: 'Rain expected today', body: `${from} Allow extra time on the road.`, data };
    case 'fog':
      return { title: 'Fog expected today', body: `${from} Slow down and keep your lights on.`, data };
    case 'heat':
      return {
        title: 'Very hot today',
        body: `Up to ${day.hottest ?? 38}°C where you are. Carry water when you travel.`,
        data,
      };
  }
}

export function buildWeatherPush(subscription: PushSubscription, message: TravellerMessage): TokenMessage {
  return {
    token: subscription.fcmToken,
    notification: { title: message.title, body: message.body },
    data: message.data,
    android: { notification: { channelId: WEATHER_CHANNEL_ID } },
    apns: { payload: { aps: { sound: 'default' } } },
  };
}

type Send = (message: TokenMessage) => Promise<unknown>;

/** One morning's run; `send` is replaced in tests. Returns how many were sent. */
export async function runMorningWeather(nowMs: number, send: Send = (m) => admin.messaging().send(m)): Promise<{ areas: number; sent: number }> {
  const db = admin.firestore();
  const today = lagosDay(nowMs);
  const untilMs = endOfLagosDay(nowMs);
  const oldest = admin.firestore.Timestamp.fromMillis(nowMs - AREA_KEPT_DAYS * DAY_MS);

  // Forget areas nobody has looked at for a month
  const stale = await db.collection(WEATHER_AREAS).where('at', '<', oldest).get();
  await Promise.all(stale.docs.map((d) => d.ref.delete()));

  const kept = await db.collection(WEATHER_AREAS).where('at', '>=', oldest).get();
  const byArea = new Map<string, FirebaseFirestore.QueryDocumentSnapshot[]>();
  for (const d of kept.docs) {
    const key = d.get('key');
    if (typeof key !== 'string') continue;
    byArea.set(key, [...(byArea.get(key) ?? []), d]);
  }

  let sent = 0;
  for (const [key, people] of byArea) {
    const first = people[0];
    let message: TravellerMessage | null = null;
    try {
      const forecast = await forecastFor({ key, lat: first.get('lat'), lng: first.get('lng') }, nowMs);
      message = morningMessage(readDay(forecast, nowMs, untilMs), nowMs);
    } catch (error) {
      functions.logger.warn('No forecast for the morning weather', { area: key, error: String(error) });
    }
    if (!message) continue;

    for (const person of people) {
      if (person.get('lastSentDay') === today) continue;
      const uid = person.id;
      if ((await db.doc(`users/${uid}`).get()).get('morningWeather') === false) {
        await person.ref.delete();
        continue;
      }
      const subscription = (await db.doc(`pushSubscriptions/${uid}`).get()).data() as PushSubscription | undefined;
      const build = subscription ? believedBuild(subscription) : null;
      if (!subscription?.fcmToken || build === null || build < WEATHER_FROM_BUILD) continue;
      try {
        await send(buildWeatherPush(subscription, message));
        await person.ref.update({ lastSentDay: today });
        sent += 1;
      } catch (error) {
        functions.logger.warn('Morning weather not delivered', { uid, error: String(error) });
      }
    }
  }
  functions.logger.info(`Morning weather: ${byArea.size} area(s), ${sent} sent`);
  return { areas: byArea.size, sent };
}

export const morningWeather = functions.pubsub
  .schedule('30 6 * * *')
  .timeZone('Africa/Lagos')
  .onRun(async () => {
    await runMorningWeather(Date.now());
    return null;
  });
