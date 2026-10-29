/**
 * @fileoverview The owner's Numbers page (wakaguard.com/admin/numbers)
 *
 * Counts of people, trips, texts, phones and database use, worked out each
 * time the page is opened. Only an account with the admin claim may ask, and
 * only counts come back: no names, numbers, emails, places or messages.
 *
 * People are counted from sign-in activity, as the app has no analytics.
 * NUMBERS_LEAVE_OUT (functions/.env, comma-separated) names the owner's own
 * usernames, which are left out of every count, as in the weekly ranking.
 *
 * @module adminNumbers
 */

import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import type { UserRecord } from 'firebase-admin/auth';
import { getSetting } from './config';
import {
  Account, countDays, countPeople, countPhones, countTexts, DatabaseDay, DAY_MS, DAYS_SHOWN,
  FREE_READS_PER_DAY, FREE_WRITES_PER_DAY, messageFromLog, Numbers, TEXT_DAYS, TripRow,
} from './adminNumbersPlan';

const millis = (value: unknown): number | null =>
  typeof (value as Timestamp | undefined)?.toMillis === 'function' ? (value as Timestamp).toMillis() : null;

async function allAccounts(): Promise<UserRecord[]> {
  const accounts: UserRecord[] = [];
  let pageToken: string | undefined;
  do {
    const page = await admin.auth().listUsers(1000, pageToken);
    accounts.push(...page.users);
    pageToken = page.pageToken;
  } while (pageToken);
  return accounts;
}

function toAccount(user: UserRecord): Account {
  const createdMs = Date.parse(user.metadata.creationTime);
  const seen = user.metadata.lastRefreshTime || user.metadata.lastSignInTime || user.metadata.creationTime;
  return {
    createdMs,
    lastSeenMs: Math.max(createdMs, Date.parse(seen)),
    methods: user.providerData.map((p) => p.providerId),
  };
}

/** Reads and writes per 24 hours over the last week, from Google Cloud Monitoring */
async function databaseActivity(nowMs: number): Promise<DatabaseDay[] | null> {
  // The emulators have no such figures
  if (process.env.FIRESTORE_EMULATOR_HOST) return null;
  try {
    const projectId = process.env.GCLOUD_PROJECT || admin.app().options.projectId;
    const { access_token: token } = await admin.credential.applicationDefault().getAccessToken();
    const perDay = async (metric: string): Promise<Map<number, number>> => {
      const query = new URLSearchParams({
        filter: `metric.type = "firestore.googleapis.com/document/${metric}"`,
        'interval.startTime': new Date(nowMs - 7 * DAY_MS).toISOString(),
        'interval.endTime': new Date(nowMs).toISOString(),
        'aggregation.alignmentPeriod': '86400s',
        'aggregation.perSeriesAligner': 'ALIGN_SUM',
        'aggregation.crossSeriesReducer': 'REDUCE_SUM',
      });
      const response = await fetch(`https://monitoring.googleapis.com/v3/projects/${projectId}/timeSeries?${query}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw new Error(`${metric}: ${response.status}`);
      const points: any[] = (await response.json()).timeSeries?.[0]?.points ?? [];
      return new Map(points.map((p) => [Date.parse(p.interval.endTime), Number(p.value.int64Value) || 0]));
    };
    const [reads, writes] = await Promise.all([perDay('read_count'), perDay('write_count')]);
    return [...new Set([...reads.keys(), ...writes.keys()])]
      .sort((a, b) => a - b)
      .map((endMs) => ({ endMs, reads: reads.get(endMs) ?? 0, writes: writes.get(endMs) ?? 0 }));
  } catch (err) {
    console.warn(`Numbers: database activity could not be read: ${String(err)}`);
    return null;
  }
}

export async function gatherNumbers(nowMs = Date.now()): Promise<Numbers> {
  const db = admin.firestore();
  const leaveOut = new Set(getSetting('NUMBERS_LEAVE_OUT').split(',').map((n) => n.trim().toLowerCase()).filter(Boolean));

  // Trips and SOS alerts are kept 90 days, so reading them all stays small
  const [profiles, accounts, trips, alerts, roadReports, logs, phones, database] = await Promise.all([
    db.collection('users').select('username').get(),
    allAccounts(),
    db.collectionGroup('trips').select('startTime', 'isTest', 'overdueAt').get(),
    db.collectionGroup('alerts').select('createdAt', 'type').get(),
    db.collection('reports').where('createdAt', '>=', Timestamp.fromMillis(nowMs - DAYS_SHOWN * DAY_MS)).select('uid', 'createdAt').get(),
    db.collection('safetyMessageLogs').where('createdAt', '>=', Timestamp.fromMillis(nowMs - TEXT_DAYS * DAY_MS))
      .select('uid', 'provider', 'providerResult', 'reports', 'resends', 'createdAt').get(),
    db.collection('pushSubscriptions').select('platform', 'appBuild').get(),
    databaseActivity(nowMs),
  ]);

  const leftOut = new Set(profiles.docs
    .filter((d) => leaveOut.has(String(d.get('username') || '').trim().toLowerCase()))
    .map((d) => d.id));
  const counted = (uid: unknown) => typeof uid === 'string' && !leftOut.has(uid);
  // Only documents inside users/{uid}; an older top-level "trips" collection is left from RoutePulse
  const ownerOf = (doc: FirebaseFirestore.QueryDocumentSnapshot) =>
    doc.ref.parent.parent?.parent.id === 'users' ? doc.ref.parent.parent.id : null;

  // Sign-ins with no email, Google or Apple are anonymous ones left from the
  // RoutePulse app (January 2026); WakaGuard never makes them
  const signedUp = accounts.filter((u) => u.providerData.length > 0);

  const tripRows: TripRow[] = trips.docs.flatMap((d) => {
    const uid = ownerOf(d);
    const startMs = millis(d.get('startTime'));
    return uid && counted(uid) && startMs !== null
      ? [{ uid, startMs, isTest: d.get('isTest') === true, wentOverdue: !!d.get('overdueAt') }]
      : [];
  });
  const messages = logs.docs
    .filter((d) => counted(d.get('uid')))
    .map((d) => messageFromLog(d.data(), millis(d.get('createdAt')) ?? nowMs));

  return {
    asOfMs: nowMs,
    leftOut: leftOut.size,
    oldAnonymous: accounts.length - signedUp.length,
    people: countPeople(signedUp.filter((u) => counted(u.uid)).map(toAccount), nowMs),
    days: countDays({
      trips: tripRows,
      // Only SOS: the same collection holds checkpoint stops and missed check-ins
      sosMs: alerts.docs.flatMap((d) => {
        const ms = millis(d.get('createdAt'));
        return d.get('type') === 'sos' && counted(ownerOf(d)) && ms !== null ? [ms] : [];
      }),
      roadReportMs: roadReports.docs.flatMap((d) => {
        const ms = millis(d.get('createdAt'));
        return counted(d.get('uid')) && ms !== null ? [ms] : [];
      }),
      texts: messages
        .filter((m) => !m.heldBack)
        .map((m) => ({ ms: m.createdMs, count: m.texts.filter((t) => t.sent).length })),
    }, nowMs),
    textDays: TEXT_DAYS,
    texts: countTexts(messages),
    phones: countPhones(phones.docs
      .filter((d) => counted(d.id))
      .map((d) => ({ platform: d.get('platform'), build: d.get('appBuild') }))),
    database: database && {
      days: database,
      freeReadsPerDay: FREE_READS_PER_DAY,
      freeWritesPerDay: FREE_WRITES_PER_DAY,
    },
  };
}

export const adminNumbers = functions
  .runWith({ enforceAppCheck: process.env.ENFORCE_APP_CHECK === 'true', timeoutSeconds: 60 })
  .https.onCall(async (_data, context) => {
    if (context.auth?.token?.admin !== true) {
      throw new functions.https.HttpsError('permission-denied', 'The numbers are for the owner only');
    }
    return gatherNumbers();
  });
