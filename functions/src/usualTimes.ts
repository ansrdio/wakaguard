/**
 * @fileoverview A reminder at each person's usual travel times (build 27)
 *
 * "Most times I forget to use it while going out" (a regular tester, 28
 * October 2026); "I forgot to start a trip" was the top reason for using
 * WakaGuard less in the 17 October survey (4 of 9).
 *
 * Each night, planUsualTimes finds, for each person, the times of day they
 * started a real trip that ended with "I've arrived" on at least 3 of the
 * last 14 days (within 30 minutes of each other, Nigeria time), and files
 * them under the quarter hour a reminder is due, 10 to 25 minutes before.
 * Every quarter hour, usualTimeReminders sends "Heading out?" to the people
 * due then: at most once a day, only when no trip of theirs is running, only
 * to phones on build 27 or later (which have the switch to turn it off), and
 * never when it is switched off (users/{uid}.usualTimeReminder === false).
 *
 * @module usualTimes
 */

import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import type { TokenMessage } from 'firebase-admin/messaging';
import { believedBuild, PushSubscription } from './reminderPush';
import { isDeadToken, noteIfDead } from './pushTokens';
import { HeadsUp, headsUpMessage, REPORTS_SINCE_HOURS, RoadReport, reportsNearRoute, roundSpot, Spot } from './headsUp';
import { DayOutlook, forecastFor, inServiceArea, readDay, roughArea } from './weather';
import { endOfLagosDay } from './morningWeather';

export const USUAL_FROM_BUILD = 27;
export const LOOK_BACK_DAYS = 14;
export const MIN_DAYS = 3;
export const NEAR_MINUTES = 30;
export const NUDGE_BEFORE_MINUTES = 10;
export const SLOT_MINUTES = 15;
export const USUAL_TIME_SLOTS = 'usualTimeSlots';
export const USUAL_REMINDERS = 'usualReminders';

const MIN_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MIN_MS;
const LAGOS_OFFSET_MS = 60 * MIN_MS;
const MINUTES_A_DAY = 24 * 60;

export interface PastStart {
  atMs: number;
  destination?: string | null;
  minutes?: number | null;
  /** Where the trip started and the place set on the map, rounded to about a kilometre (headsUp.ts) */
  from?: Spot | null;
  to?: Spot | null;
}

export interface UsualTime {
  /** Minutes after midnight, Nigeria time */
  minute: number;
  days: number;
  destination: string | null;
  minutes: number | null;
  /** For the heads-up (build 29): the usual start and destination, rounded; null when unknown */
  from?: Spot | null;
  to?: Spot | null;
}

export const lagosMinute = (ms: number) => Math.floor(((ms + LAGOS_OFFSET_MS) % DAY_MS) / MIN_MS);
export const lagosDay = (ms: number) => new Date(ms + LAGOS_OFFSET_MS).toISOString().slice(0, 10);

function mostCommon<T>(values: T[]): T | null {
  const counts = new Map<T, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best: T | null = null;
  let bestCount = 0;
  for (const [v, n] of counts) if (n > bestCount) { best = v; bestCount = n; }
  return best;
}

/** The usual start times in these trips, earliest first */
export function usualTimes(starts: PastStart[], nowMs: number): UsualTime[] {
  let pool = starts
    .filter((s) => s.atMs <= nowMs && s.atMs >= nowMs - LOOK_BACK_DAYS * DAY_MS)
    .map((s) => ({ ...s, minute: lagosMinute(s.atMs), day: lagosDay(s.atMs) }));
  const found: UsualTime[] = [];
  for (;;) {
    let bestNear: typeof pool = [];
    let bestDays = 0;
    for (const candidate of [...pool].sort((a, b) => a.minute - b.minute)) {
      const near = pool.filter((o) => Math.abs(o.minute - candidate.minute) <= NEAR_MINUTES);
      const days = new Set(near.map((n) => n.day)).size;
      if (days > bestDays || (days === bestDays && near.length > bestNear.length)) { bestDays = days; bestNear = near; }
    }
    if (bestDays < MIN_DAYS) break;
    const sorted = bestNear.map((n) => n.minute).sort((a, b) => a - b);
    const destination = mostCommon(bestNear.map((n) => (n.destination ?? '').trim()).filter(Boolean));
    const minutes = mostCommon(bestNear.map((n) => n.minutes).filter((m): m is number => typeof m === 'number' && m > 0));
    // The latest trip to the usual destination that says where it started, for the heads-up
    const latest = [...bestNear]
      .filter((n) => n.from && (!destination || (n.destination ?? '').trim() === destination))
      .sort((a, b) => b.atMs - a.atMs)[0];
    found.push({
      minute: sorted[Math.floor((sorted.length - 1) / 2)],
      days: bestDays,
      destination,
      minutes,
      from: latest?.from ?? null,
      to: latest?.to ?? null,
    });
    pool = pool.filter((o) => !bestNear.includes(o));
  }
  return found.sort((a, b) => a.minute - b.minute);
}

const hhmm = (minute: number) => {
  const m = ((minute % MINUTES_A_DAY) + MINUTES_A_DAY) % MINUTES_A_DAY;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}${String(m % 60).padStart(2, '0')}`;
};

/** The quarter hour, Nigeria time, whose run sends the reminder for this usual time */
export const reminderSlot = (minute: number) =>
  hhmm(Math.floor((minute - NUDGE_BEFORE_MINUTES) / SLOT_MINUTES) * SLOT_MINUTES);

/** The quarter hour a run at this moment handles */
export const slotAt = (nowMs: number) => hhmm(Math.floor(lagosMinute(nowMs) / SLOT_MINUTES) * SLOT_MINUTES);

/** "7:30 am" */
export function clock(minute: number): string {
  const h = Math.floor(minute / 60);
  return `${h % 12 || 12}:${String(minute % 60).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
}

export function usualMessage(usual: UsualTime): { title: string; body: string; data: Record<string, string> } {
  const where = usual.destination ? usual.destination.slice(0, 40) : null;
  return {
    title: 'Heading out?',
    body: `You usually set off around ${clock(usual.minute)}${where ? ` for ${where}` : ''}. `
      + 'Start your trip so your people know you got there.',
    data: { kind: 'usual_trip', destination: where ?? '', minutes: usual.minutes ? String(usual.minutes) : '' },
  };
}

// ---------------------------------------------------------------- nightly plan

/** Rebuilds the slots from the last 14 days of trips; returns how many people have a usual time */
export async function planUsual(nowMs: number): Promise<number> {
  const db = admin.firestore();
  // The (status, expiresAt) index the retention job uses: a trip's link lasts
  // at least a day past its start, so this holds every trip started in the window
  const trips = await db.collectionGroup('trips')
    .where('status', '==', 'completed')
    .where('expiresAt', '>=', admin.firestore.Timestamp.fromMillis(nowMs - LOOK_BACK_DAYS * DAY_MS))
    .select('startTime', 'isTest', 'destination', 'expectedDurationMinutes', 'startLocation', 'destinationPoint')
    .get();

  const byPerson = new Map<string, PastStart[]>();
  for (const doc of trips.docs) {
    const owner = doc.ref.parent.parent;
    if (!owner || owner.parent.id !== 'users' || doc.get('isTest') === true) continue;
    const atMs = doc.get('startTime')?.toMillis?.();
    if (typeof atMs !== 'number') continue;
    const destination = doc.get('destination');
    const minutes = doc.get('expectedDurationMinutes');
    byPerson.set(owner.id, [...(byPerson.get(owner.id) ?? []), {
      atMs,
      destination: typeof destination === 'string' ? destination : null,
      minutes: typeof minutes === 'number' ? minutes : null,
      from: roundSpot(doc.get('startLocation')),
      to: roundSpot(doc.get('destinationPoint')),
    }]);
  }

  const slots = new Map<string, Record<string, UsualTime>>();
  let people = 0;
  for (const [uid, starts] of byPerson) {
    const usual = usualTimes(starts, nowMs);
    if (usual.length > 0) people += 1;
    for (const u of usual) {
      const slot = reminderSlot(u.minute);
      slots.set(slot, { ...(slots.get(slot) ?? {}), [uid]: u });
    }
  }

  const existing = await db.collection(USUAL_TIME_SLOTS).get();
  const batch = db.batch();
  for (const doc of existing.docs) if (!slots.has(doc.id)) batch.delete(doc.ref);
  for (const [slot, who] of slots) batch.set(db.doc(`${USUAL_TIME_SLOTS}/${slot}`), { people: who, plannedAt: admin.firestore.Timestamp.fromMillis(nowMs) });
  await batch.commit();
  return people;
}

// ---------------------------------------------------------------- quarter-hourly reminders

type Send = (message: TokenMessage) => Promise<unknown>;
/** The weather and road reports for one person's usual trip; replaced in tests */
export type LookUp = (usual: UsualTime) => Promise<HeadsUp>;

/** Road reports still up, created since REPORTS_SINCE_HOURS ago, not hidden and not posted from far away */
async function recentReports(nowMs: number): Promise<RoadReport[]> {
  const db = admin.firestore();
  const snap = await db.collection('reports')
    .where('createdAt', '>=', admin.firestore.Timestamp.fromMillis(nowMs - REPORTS_SINCE_HOURS * 60 * MIN_MS))
    .select('type', 'status', 'location', 'createdAt', 'expiresAt', 'postedFarAway', 'flagCount')
    .get();
  const reports: RoadReport[] = [];
  for (const doc of snap.docs) {
    if (doc.get('status') !== 'active' || doc.get('postedFarAway') === true || Number(doc.get('flagCount') || 0) > 0) continue;
    const expiresMs = doc.get('expiresAt')?.toMillis?.();
    if (typeof expiresMs === 'number' && expiresMs <= nowMs) continue;
    const location = doc.get('location');
    const createdMs = doc.get('createdAt')?.toMillis?.();
    if (typeof location?.lat !== 'number' || typeof location?.lng !== 'number' || typeof createdMs !== 'number') continue;
    reports.push({
      type: String(doc.get('type') || 'other'),
      lat: location.lat,
      lng: location.lng,
      address: typeof location.address === 'string' ? location.address : null,
      createdMs,
    });
  }
  return reports;
}

/**
 * Looks up the heads-up for each person in one run: the day's weather where
 * they usually set off (one forecast per rough area) and the road reports near
 * their usual route (one read of the recent reports for the whole run).
 */
export function headsUpLookUp(nowMs: number): LookUp {
  const outlooks = new Map<string, Promise<DayOutlook | null>>();
  let reports: Promise<RoadReport[]> | null = null;
  return async (usual) => {
    if (!usual.from) return { weather: null, reports: [] };
    const area = roughArea(usual.from.lat, usual.from.lng);
    let weather: DayOutlook | null = null;
    if (area && inServiceArea(area)) {
      if (!outlooks.has(area.key)) {
        outlooks.set(area.key, forecastFor(area, nowMs)
          .then((forecast) => readDay(forecast, nowMs, endOfLagosDay(nowMs)))
          .catch((error) => {
            functions.logger.warn('No forecast for the heads-up', { area: area.key, error: String(error) });
            return null;
          }));
      }
      weather = await outlooks.get(area.key)!;
    }
    reports ??= recentReports(nowMs).catch((error) => {
      functions.logger.warn('No road reports for the heads-up', { error: String(error) });
      return [];
    });
    return { weather, reports: reportsNearRoute(await reports, usual.from, usual.to ?? null) };
  };
}

export async function sendUsualReminders(
  nowMs: number,
  send: Send = (m) => admin.messaging().send(m),
  lookUp: LookUp = headsUpLookUp(nowMs),
): Promise<number> {
  const db = admin.firestore();
  const slot = (await db.doc(`${USUAL_TIME_SLOTS}/${slotAt(nowMs)}`).get()).get('people') as Record<string, UsualTime> | undefined;
  if (!slot) return 0;
  const today = lagosDay(nowMs);
  let sent = 0;

  for (const [uid, usual] of Object.entries(slot)) {
    if ((await db.doc(`users/${uid}`).get()).get('usualTimeReminder') === false) continue;
    const subscription = (await db.doc(`pushSubscriptions/${uid}`).get()).data() as PushSubscription | undefined;
    const build = subscription ? believedBuild(subscription) : null;
    if (!subscription?.fcmToken || build === null || build < USUAL_FROM_BUILD) continue;
    if (await isDeadToken(uid, subscription.fcmToken)) continue;
    const running = await db.collection(`users/${uid}/trips`).where('status', 'in', ['active', 'emergency']).limit(1).get();
    if (!running.empty) continue;

    const ref = db.doc(`${USUAL_REMINDERS}/${uid}`);
    const claimed = await db.runTransaction(async (tx) => {
      const fresh = await tx.get(ref);
      if (fresh.get('lastSentDay') === today) return false;
      tx.set(ref, { lastSentDay: today }, { merge: true });
      return true;
    });
    if (!claimed) continue;

    // With the weather and road reports when there is something to say (build 29); tapping it still opens this trip
    const plain = usualMessage(usual);
    let message = plain;
    try {
      const where = usual.destination ? usual.destination.slice(0, 40) : null;
      const headsUp = headsUpMessage(where, await lookUp(usual), nowMs);
      if (headsUp) message = { ...plain, ...headsUp };
    } catch (error) {
      functions.logger.warn('Heads-up left out of the usual time reminder', { uid, error: String(error) });
    }
    try {
      await send({
        token: subscription.fcmToken,
        notification: { title: message.title, body: message.body },
        data: message.data,
        apns: { payload: { aps: { sound: 'default' } } },
      });
      sent += 1;
    } catch (error) {
      const dead = await noteIfDead(uid, subscription.fcmToken, error);
      functions.logger.warn(dead ? 'Usual time reminder: link dead, not tried again' : 'Usual time reminder not delivered', { uid, error: String(error) });
    }
  }
  functions.logger.info(`Usual time reminders for ${slotAt(nowMs)}: ${sent} sent`);
  return sent;
}

export const planUsualTimes = functions.pubsub
  .schedule('30 2 * * *')
  .timeZone('Africa/Lagos')
  .onRun(async () => {
    const people = await planUsual(Date.now());
    functions.logger.info(`Usual times planned for ${people} people`);
    return null;
  });

export const usualTimeReminders = functions.pubsub
  .schedule('*/15 * * * *')
  .timeZone('Africa/Lagos')
  .onRun(async () => {
    await sendUsualReminders(Date.now());
    return null;
  });
