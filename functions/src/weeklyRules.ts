// @ts-nocheck
/**
 * @fileoverview The rules of the weekly beta ranking, shared by the Sunday
 * script (scripts/weekly-numbers.mjs) and the "Your points this week" card
 * (myWeek.ts, build 27), so the two cannot count differently. Moved here from
 * the script unchanged on 5 November 2026; its tests are
 * functions/test/weeklyNumbers.test.ts. Plain JavaScript in a .ts file, as it
 * was in the script, so it is not type-checked.
 *
 * @module weeklyRules
 */

export const MINUTE = 60 * 1000;
export const DAY = 24 * 60 * MINUTE;
export const WEEK_MS = 7 * DAY;
// Nigeria keeps one time all year, an hour ahead of UTC
export const LAGOS_OFFSET_MS = 60 * MINUTE;
// A scoring week runs from Sunday 18:00 to the next Sunday 18:00, Nigeria time
export const WEEK_STARTS_HOUR = 18;
/** The start of week one. "Since the beta began" is counted from here. */
export const BETA_STARTED = '2026-10-11';

export const POINTS = { realTrip: 3, roadReport: 2, firstTestTrip: 2, problemReport: 5, everydayBonus: 5 };
export const DAILY_LIMIT = { realTrips: 2, roadReports: 3 };
export const MIN_TRIP_MS = 10 * MINUTE;
export const MIN_TRIP_METRES = 500;
/**
 * A trip that did not move is told apart by its positions (counted since 19
 * October 2026): a phone that kept reporting from one spot stayed put; one
 * silent for longer than this went quiet, and may have moved unseen. A still
 * iPhone can report rarely, so a quiet one is a question, not a verdict.
 */
export const QUIET_GAP_MS = 10 * MINUTE;
/**
 * From week three (the owner, 28 October 2026), a trip that did not move
 * counts when its phone went quiet: location stopping on its own is the
 * phone's or the app's doing, not the traveller's. One that kept reporting
 * from one spot still earns nothing.
 */
export const QUIET_TRIPS_COUNT_FROM_MS = Date.UTC(2026, 9, 25, 17, 0);
/**
 * From this moment (midnight starting Thursday 15 October 2026, Nigeria time,
 * after the testers were told), a trip that ran past the wait before contacts
 * are texted earns nothing. A third of beta trips did, which would have been a
 * false alarm to someone's family once texting is on.
 */
export const LATE_TRIP_RULE_FROM_MS = Date.UTC(2026, 9, 14, 23, 0);
/**
 * The everyday bonus (the owner, 25 October 2026): counted real trips on this
 * many different days of the week, Nigeria calendar days, earn it once. From
 * week three, which starts Sunday 25 October 2026 at 18:00 in Nigeria; earlier
 * weeks are scored as they were announced.
 */
export const EVERYDAY_DAYS = 5;
/**
 * Prizes (the owner, 28 October 2026), so the same people cannot win every
 * week: last week's winners sit out the prize places but stay on the list, and
 * everyone else with this many counted real trips goes into a draw. Last
 * week's winners are named by hand (--last-winners), as the repository is
 * public.
 */
export const PRIZE_PLACES = 3;
export const DRAW_MIN_TRIPS = 3;
export const EVERYDAY_BONUS_FROM_MS = Date.UTC(2026, 9, 25, 17, 0);

export const REASONS = {
  notEnded: 'not ended by the traveller',
  endedLater: 'ended after the week',
  tooShort: 'too short',
  noLocation: 'no location',
  didNotMove: 'did not move',
  overLimit: 'over the daily limit',
  wentOverdue: 'ended after contacts would have been texted',
  flagged: 'flagged',
  farAway: 'posted from far away',
  noUpvote: 'no upvote from another tester',
};

// ---------------------------------------------------------------- time

/** "2026-10-11" is 18:00 that day in Nigeria; "2026-10-11T09:30" is that time in Nigeria. */
export function parseLagosTime(text) {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?$/.exec(String(text).trim());
  if (!match) {
    throw new Error(`"${text}" is not a date. Use 2026-10-11 or 2026-10-11T18:00 (Nigeria time).`);
  }
  const [, year, month, day, hour = WEEK_STARTS_HOUR, minute = 0] = match;
  return Date.UTC(+year, +month - 1, +day, +hour, +minute) - LAGOS_OFFSET_MS;
}

/** The Sunday 18:00 (Nigeria time) that starts the scoring week holding this moment. */
export function weekStartBefore(nowMs) {
  const lagos = new Date(nowMs + LAGOS_OFFSET_MS);
  const sunday = lagos.getUTCDate() - lagos.getUTCDay();
  const start = Date.UTC(lagos.getUTCFullYear(), lagos.getUTCMonth(), sunday, WEEK_STARTS_HOUR) - LAGOS_OFFSET_MS;
  return start > nowMs ? start - WEEK_MS : start;
}

/** The calendar day in Nigeria, which the daily limits use. */
export function lagosDay(ms) {
  return new Date(ms + LAGOS_OFFSET_MS).toISOString().slice(0, 10);
}

// ---------------------------------------------------------------- rules

export const isPlace = (place) => !!place && Number.isFinite(place.lat) && Number.isFinite(place.lng);

/** Straight-line distance between two places, in metres. */
export function metresBetween(a, b) {
  const rad = (degrees) => (degrees * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
}

/**
 * Why a trip the traveller ended earns nothing, or null when it passes every
 * rule except the daily limit. Going overdue counts against a trip from
 * LATE_TRIP_RULE_FROM_MS (added time clears it, as it re-arms the alarm).
 */
export function tripProblem(trip) {
  if (trip.startMs == null || trip.endMs - trip.startMs < MIN_TRIP_MS) return REASONS.tooShort;
  if (trip.overdueMs != null && trip.startMs >= LATE_TRIP_RULE_FROM_MS) return REASONS.wentOverdue;
  if (!isPlace(trip.startLocation) || !isPlace(trip.endLocation)) return REASONS.noLocation;
  if (distanceOf(trip) < MIN_TRIP_METRES && !quietTripCounts(trip)) return REASONS.didNotMove;
  return null;
}

/** How far a trip went: a round trip ends where it began, so the farthest it got counts too (recorded since 14 October 2026) */
export const distanceOf = (trip) => Math.max(metresBetween(trip.startLocation, trip.endLocation), trip.farthestM ?? 0);

/**
 * The longest the phone sent no position during a trip: before the first,
 * between two, or after the last until the trip ended. Null for trips from
 * before positions were counted.
 */
export function longestSilenceMs(trip) {
  if (typeof trip.positions !== 'number') return null;
  const silences = [trip.longestGapMs ?? 0];
  if (trip.positions === 0) silences.push(trip.endMs - trip.startMs);
  if (trip.firstPositionMs != null) silences.push(trip.firstPositionMs - trip.startMs);
  if (trip.lastPositionMs != null) silences.push(trip.endMs - trip.lastPositionMs);
  return Math.max(...silences.filter(Number.isFinite));
}

/** A trip that did not move still counts from week three when its phone went quiet */
export const quietTripCounts = (trip) => trip.startMs >= QUIET_TRIPS_COUNT_FROM_MS && (longestSilenceMs(trip) ?? 0) > QUIET_GAP_MS;

/** What the positions say about a trip that did not move, in a few words */
export function stillnessOf(trip) {
  if (typeof trip.positions !== 'number') return 'positions not counted (before 19 October)';
  if (trip.positions === 0) return 'no positions after the start';
  const quietMs = longestSilenceMs(trip) ?? 0;
  const gapMin = Math.round(quietMs / MINUTE);
  if (quietMs > QUIET_GAP_MS) return `${trip.positions} positions; the phone went quiet for ${gapMin} min`;
  return `${trip.positions} positions, never more than ${Math.max(gapMin, 1)} min apart: stayed put`;
}

export const tally = () => {
  const counts = {};
  return { counts, add: (reason) => { counts[reason] = (counts[reason] || 0) + 1; } };
};

/**
 * One person's real (not test) trips for a period. A trip belongs to the
 * period it ended in; one that started in the period and did not end in it
 * is listed with the reason.
 */
export function judgeTrips(trips, fromMs, toMs) {
  const inPeriod = (ms) => ms != null && ms >= fromMs && ms < toMs;
  const rejected = tally();
  const perDay = {};
  const days = new Set();
  let inThePeriod = 0;
  let counted = 0;

  for (const trip of [...trips].sort((a, b) => (a.endMs ?? Infinity) - (b.endMs ?? Infinity))) {
    const ended = trip.status === 'completed' && trip.endMs != null;
    if (ended && inPeriod(trip.endMs)) {
      inThePeriod++;
      const problem = tripProblem(trip);
      if (problem) { rejected.add(problem); continue; }
      const day = lagosDay(trip.endMs);
      perDay[day] = (perDay[day] || 0) + 1;
      if (perDay[day] > DAILY_LIMIT.realTrips) { rejected.add(REASONS.overLimit); continue; }
      counted++;
      days.add(day);
    } else if (inPeriod(trip.startMs)) {
      inThePeriod++;
      rejected.add(ended && trip.endMs >= toMs ? REASONS.endedLater : REASONS.notEnded);
    }
  }
  return { inThePeriod, counted, days: days.size, rejected: rejected.counts };
}

/**
 * One person's road reports created in the week. `upvotersOf` gives, for a
 * report, the other people who voted it up.
 */
export function judgeReports(reports, upvotersOf) {
  const rejected = tally();
  const perDay = {};
  const confirmed = [];

  for (const report of [...reports].sort((a, b) => a.createdMs - b.createdMs)) {
    const upvoters = upvotersOf(report);
    if (Number(report.flagCount || 0) !== 0) { rejected.add(REASONS.flagged); continue; }
    // Not seen on the spot (src/lib/reportDistance.ts): it stays up, but earns nothing
    if (report.postedFarAway === true) { rejected.add(REASONS.farAway); continue; }
    if (upvoters.length === 0) { rejected.add(REASONS.noUpvote); continue; }
    const day = lagosDay(report.createdMs);
    perDay[day] = (perDay[day] || 0) + 1;
    if (perDay[day] > DAILY_LIMIT.roadReports) { rejected.add(REASONS.overLimit); continue; }
    confirmed.push({ id: report.id, upvoters });
  }
  return { created: reports.length, counted: confirmed.length, rejected: rejected.counts, confirmed };
}

// ---------------------------------------------------------------- one person's week

/** The everyday bonus, from week three: counted real trips on EVERYDAY_DAYS different days */
export function everydayBonusEarned(fromMs, days) {
  return fromMs >= EVERYDAY_BONUS_FROM_MS && days >= EVERYDAY_DAYS;
}

/** A person's points for the week, from what counted */
export function pointsFor({ realTrips, roadReports, firstTestTrip, problemReports, everydayBonus }) {
  return realTrips * POINTS.realTrip + roadReports * POINTS.roadReport
    + (firstTestTrip ? POINTS.firstTestTrip : 0) + problemReports * POINTS.problemReport
    + (everydayBonus ? POINTS.everydayBonus : 0);
}

/**
 * The latest real trip of the week that earned nothing, and why (the "Your
 * points this week" card, build 27). Null when every trip counted.
 */
export function lastMissedTrip(trips, fromMs, toMs) {
  const inPeriod = (ms) => ms != null && ms >= fromMs && ms < toMs;
  const perDay = {};
  let last = null;
  for (const trip of [...trips].sort((a, b) => (a.endMs ?? a.startMs ?? 0) - (b.endMs ?? b.startMs ?? 0))) {
    const ended = trip.status === 'completed' && trip.endMs != null;
    let reason = null;
    if (ended && inPeriod(trip.endMs)) {
      reason = tripProblem(trip);
      if (!reason) {
        const day = lagosDay(trip.endMs);
        perDay[day] = (perDay[day] || 0) + 1;
        if (perDay[day] > DAILY_LIMIT.realTrips) reason = REASONS.overLimit;
      }
    } else if (inPeriod(trip.startMs) && !(ended && trip.endMs >= toMs) && trip.status !== 'active' && trip.status !== 'emergency') {
      reason = REASONS.notEnded;
    }
    if (reason) last = { id: trip.id ?? null, atMs: trip.endMs ?? trip.startMs, reason };
  }
  return last;
}

// ---------------------------------------------------------------- records

/** The trip fields the rules read, for a select() */
export const TRIP_FIELDS = ['status', 'startTime', 'endTime', 'isTest', 'startLocation', 'endLocation', 'overdueAt',
  'farthestFromStartM', 'positionCount', 'longestPositionGapMs', 'firstPositionAtMs', 'lastPositionAtMs'];

const at = (value) => (typeof value?.toMillis === 'function' ? value.toMillis() : null);
const numberOrNull = (value) => (typeof value === 'number' ? value : null);

/** A trip document as the rules take it, times in milliseconds */
export function tripFromDoc(doc, uid) {
  return {
    uid,
    id: doc.id,
    status: doc.get('status'),
    startMs: at(doc.get('startTime')),
    endMs: at(doc.get('endTime')),
    isTest: doc.get('isTest') === true,
    startLocation: doc.get('startLocation') || null,
    endLocation: doc.get('endLocation') || null,
    overdueMs: at(doc.get('overdueAt')),
    farthestM: numberOrNull(doc.get('farthestFromStartM')),
    positions: numberOrNull(doc.get('positionCount')),
    longestGapMs: numberOrNull(doc.get('longestPositionGapMs')),
    firstPositionMs: numberOrNull(doc.get('firstPositionAtMs')),
    lastPositionMs: numberOrNull(doc.get('lastPositionAtMs')),
  };
}

export const REPORT_FIELDS = ['uid', 'createdAt', 'flagCount', 'photoUrls', 'postedFarAway'];

export function reportFromDoc(doc) {
  return {
    id: doc.id,
    uid: doc.get('uid'),
    createdMs: at(doc.get('createdAt')),
    flagCount: doc.get('flagCount') || 0,
    hasPhotos: (doc.get('photoUrls') || []).length > 0,
    postedFarAway: doc.get('postedFarAway') === true,
  };
}

