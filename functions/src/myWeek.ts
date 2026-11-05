/**
 * @fileoverview "Your points this week" (build 27): the signed-in person's
 * own week in the beta ranking, scored by the same rules as the Sunday script
 * (weeklyRules.ts), and the last trip that did not count, with why.
 *
 * Asked for on 28 October 2026 by a regular tester ("if it's possible for us
 * to see our points"): one tester used the app on 8 days in week 2 and none of
 * their 6 real trips counted, without knowing why. Problem reports are judged
 * by hand from the sheet on Sunday, so they are not in this number.
 *
 * Reads only the caller's own records. Nothing is written.
 *
 * @module myWeek
 */

import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import {
  everydayBonusEarned, judgeReports, judgeTrips, lastMissedTrip, pointsFor, reportFromDoc, REPORT_FIELDS,
  tripFromDoc, TRIP_FIELDS, WEEK_MS, weekStartBefore,
} from './weeklyRules';

const DAY_MS = 24 * 60 * 60 * 1000;
/** A trip belongs to the week it ended in; the longest trip and its added time fit well inside this */
const TRIPS_LOOK_BACK_MS = 3 * DAY_MS;
const VOTES_PER_QUERY = 30;

export interface MyWeek {
  fromMs: number;
  toMs: number;
  points: number;
  realTrips: number;
  roadReports: number;
  firstTestTrip: boolean;
  everydayBonus: boolean;
  /** Days with a counted trip, towards the everyday bonus */
  days: number;
  /** The latest trip of the week that earned nothing, and why (weeklyRules REASONS) */
  missed: { atMs: number; reason: string } | null;
}

export async function weekOf(uid: string, nowMs: number): Promise<MyWeek> {
  const db = admin.firestore();
  const fromMs = weekStartBefore(nowMs);
  const toMs = fromMs + WEEK_MS;
  const tripsRef = db.collection(`users/${uid}/trips`);

  const [recent, tests, reports] = await Promise.all([
    tripsRef.where('startTime', '>=', Timestamp.fromMillis(fromMs - TRIPS_LOOK_BACK_MS)).select(...TRIP_FIELDS).get(),
    tripsRef.where('isTest', '==', true).select('startTime').get(),
    db.collection('reports').where('uid', '==', uid).select(...REPORT_FIELDS).get(),
  ]);

  const real = recent.docs.map((doc) => tripFromDoc(doc, uid)).filter((trip) => trip.isTest !== true);
  const week = judgeTrips(real, fromMs, toMs);

  const firstTestMs = Math.min(...tests.docs.map((doc) => doc.get('startTime')?.toMillis?.() ?? Infinity));
  const firstTestTrip = firstTestMs >= fromMs && firstTestMs < toMs;

  const mine = reports.docs.map(reportFromDoc).filter((r) => r.createdMs != null && r.createdMs >= fromMs && r.createdMs < toMs);
  const upvoters = new Map<string, Set<string>>();
  for (let i = 0; i < mine.length; i += VOTES_PER_QUERY) {
    const ids = mine.slice(i, i + VOTES_PER_QUERY).map((r) => r.id);
    const votes = await db.collection('votes').where('reportId', 'in', ids).select('uid', 'reportId', 'value').get();
    for (const vote of votes.docs) {
      if (vote.get('value') !== 1 || vote.get('uid') === uid) continue;
      const reportId = vote.get('reportId');
      if (!upvoters.has(reportId)) upvoters.set(reportId, new Set());
      upvoters.get(reportId)!.add(vote.get('uid'));
    }
  }
  const roadReports = judgeReports(mine, (report: { id: string }) => [...(upvoters.get(report.id) ?? [])]);

  const everydayBonus = everydayBonusEarned(fromMs, week.days);
  const missed = lastMissedTrip(real, fromMs, toMs);
  return {
    fromMs,
    toMs,
    points: pointsFor({ realTrips: week.counted, roadReports: roadReports.counted, firstTestTrip, problemReports: 0, everydayBonus }),
    realTrips: week.counted,
    roadReports: roadReports.counted,
    firstTestTrip,
    everydayBonus,
    days: week.days,
    missed: missed ? { atMs: missed.atMs, reason: missed.reason } : null,
  };
}

export const myWeek = functions.https.onCall(async (_data: unknown, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  if (context.auth.token.firebase?.sign_in_provider === 'anonymous') {
    throw new functions.https.HttpsError('permission-denied', 'Sign up to see your points');
  }
  return weekOf(context.auth.uid, Date.now());
});
