/**
 * Weekly numbers for the beta ranking: a points table by username for one
 * scoring week, a few health numbers for the owner and a cheating check.
 *
 *   node scripts/weekly-numbers.mjs --emulator
 *   node scripts/weekly-numbers.mjs --live --from 2026-10-11 \
 *     --exclude owner,reviewer --problems ada=2,tunde=1
 *
 * It only reads; nothing here writes to the database. Against the live
 * project it reads personal data, so run it there only when the owner has
 * asked for that run. It needs a Google sign-in on this computer first:
 *   gcloud auth application-default login
 * It prints usernames and counts, never places, emails or phone numbers.
 *
 * The old points system (pointHistory, user stats) has nothing to do with
 * this ranking and is not read.
 */

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const LIVE_PROJECT = 'routepulse-5701f';
const EMULATOR_PROJECT = 'demo-wakaguard';

const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;
export const WEEK_MS = 7 * DAY;
// Nigeria keeps one time all year, an hour ahead of UTC
const LAGOS_OFFSET_MS = 60 * MINUTE;
// A scoring week runs from Sunday 18:00 to the next Sunday 18:00, Nigeria time
const WEEK_STARTS_HOUR = 18;
/** The start of week one. "Since the beta began" is counted from here. */
export const BETA_STARTED = '2026-10-11';

export const POINTS = { realTrip: 3, roadReport: 2, firstTestTrip: 2, problemReport: 5 };
export const DAILY_LIMIT = { realTrips: 2, roadReports: 3 };
export const MIN_TRIP_MS = 10 * MINUTE;
export const MIN_TRIP_METRES = 500;
/**
 * From this moment (midnight starting Thursday 15 October 2026, Nigeria time,
 * after the testers were told), a trip that ran past the wait before contacts
 * are texted earns nothing. A third of beta trips did, which would have been a
 * false alarm to someone's family once texting is on.
 */
export const LATE_TRIP_RULE_FROM_MS = Date.UTC(2026, 9, 14, 23, 0);

export const REASONS = {
  notEnded: 'not ended by the traveller',
  endedLater: 'ended after the week',
  tooShort: 'too short',
  noLocation: 'no location',
  didNotMove: 'did not move',
  overLimit: 'over the daily limit',
  wentOverdue: 'ended after contacts would have been texted',
  flagged: 'flagged',
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

const isPlace = (place) => !!place && Number.isFinite(place.lat) && Number.isFinite(place.lng);

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
  // A round trip ends where it began, so the farthest it went counts too (recorded since 14 October 2026)
  const went = Math.max(metresBetween(trip.startLocation, trip.endLocation), trip.farthestM ?? 0);
  if (went < MIN_TRIP_METRES) return REASONS.didNotMove;
  return null;
}

const tally = () => {
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
    } else if (inPeriod(trip.startMs)) {
      inThePeriod++;
      rejected.add(ended && trip.endMs >= toMs ? REASONS.endedLater : REASONS.notEnded);
    }
  }
  return { inThePeriod, counted, rejected: rejected.counts };
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
    if (upvoters.length === 0) { rejected.add(REASONS.noUpvote); continue; }
    const day = lagosDay(report.createdMs);
    perDay[day] = (perDay[day] || 0) + 1;
    if (perDay[day] > DAILY_LIMIT.roadReports) { rejected.add(REASONS.overLimit); continue; }
    confirmed.push({ id: report.id, upvoters });
  }
  return { created: reports.length, counted: confirmed.length, rejected: rejected.counts, confirmed };
}

// ---------------------------------------------------------------- scoring

const groupBy = (items, keyOf) => {
  const groups = new Map();
  for (const item of items) {
    const key = keyOf(item);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  return groups;
};

/**
 * Works out the week from plain records (times in milliseconds).
 *
 * @param data users {uid, username}, trips {uid, id, status, startMs, endMs,
 *   isTest, startLocation, endLocation, overdueMs}, reports {id, uid,
 *   createdMs, flagCount, hasPhotos} created in the week, votes {uid,
 *   reportId, value} on those reports, alerts {uid, type, createdMs, tripId}
 * @param options fromMs, toMs, sinceMs (when the beta began), excluded
 *   (usernames or uids to leave out), problems ({username: count}, judged by a
 *   person from the problem-report sheet), top (how many to check for cheating)
 */
export function scoreWeek(data, options) {
  const { fromMs, toMs, sinceMs = fromMs, top = 10 } = options;
  const warnings = [];
  const inWeek = (ms) => ms != null && ms >= fromMs && ms < toMs;

  const usernames = new Map(data.users.map((user) => [user.uid, (user.username || '').trim()]));
  const nameOf = (uid) => usernames.get(uid) || uid.slice(0, 6);
  const uidByUsername = new Map(
    [...usernames].filter(([, name]) => name).map(([uid, name]) => [name.toLowerCase(), uid]),
  );

  // Leave out the owner's accounts, the test account and the store reviewers'
  const knownUids = new Set([...usernames.keys(), ...data.trips.map((trip) => trip.uid),
    ...data.reports.map((report) => report.uid)]);
  const leftOut = new Set();
  for (const entry of options.excluded || []) {
    const uid = uidByUsername.get(entry.toLowerCase()) || (knownUids.has(entry) ? entry : null);
    if (uid) leftOut.add(uid);
    else warnings.push(`"${entry}" was to be left out, but no account has that username. Check the spelling.`);
  }
  const included = (record) => !leftOut.has(record.uid);

  const trips = data.trips.filter(included);
  const realTrips = groupBy(trips.filter((trip) => trip.isTest !== true), (trip) => trip.uid);
  const testTrips = groupBy(trips.filter((trip) => trip.isTest === true), (trip) => trip.uid);
  const reports = data.reports.filter(included).filter((report) => inWeek(report.createdMs));
  const reportsBy = groupBy(reports, (report) => report.uid);
  const authorOf = new Map(reports.map((report) => [report.id, report.uid]));

  // Who voted each report up, not counting the author or anyone left out
  const upvoters = new Map();
  for (const vote of data.votes.filter(included)) {
    const author = authorOf.get(vote.reportId);
    if (vote.value !== 1 || !author || author === vote.uid) continue;
    if (!upvoters.has(vote.reportId)) upvoters.set(vote.reportId, new Set());
    upvoters.get(vote.reportId).add(vote.uid);
  }
  const upvotersOf = (report) => [...(upvoters.get(report.id) || [])];

  const problemCounts = new Map();
  for (const [username, count] of Object.entries(options.problems || {})) {
    const uid = uidByUsername.get(username.toLowerCase());
    if (!uid) warnings.push(`Problem reports for "${username}" were not added: no account has that username.`);
    else if (!leftOut.has(uid)) problemCounts.set(uid, (problemCounts.get(uid) || 0) + count);
  }

  const people = new Set([...usernames.keys(), ...realTrips.keys(), ...testTrips.keys(), ...reportsBy.keys()]);
  for (const uid of leftOut) people.delete(uid);

  const rows = [];
  for (const uid of people) {
    const mine = realTrips.get(uid) || [];
    const week = judgeTrips(mine, fromMs, toMs);
    const sinceBeta = judgeTrips(mine, sinceMs, toMs);
    const roadReports = judgeReports(reportsBy.get(uid) || [], upvotersOf);
    // Once per person ever, in the week of their earliest test trip
    const firstTest = Math.min(...(testTrips.get(uid) || []).map((trip) => trip.startMs ?? Infinity));
    const firstTestTrip = inWeek(firstTest);
    const problemReports = problemCounts.get(uid) || 0;
    rows.push({
      uid,
      name: nameOf(uid),
      realTrips: week.counted,
      roadReports: roadReports.counted,
      firstTestTrip,
      problemReports,
      total: week.counted * POINTS.realTrip + roadReports.counted * POINTS.roadReport
        + (firstTestTrip ? POINTS.firstTestTrip : 0) + problemReports * POINTS.problemReport,
      week,
      sinceBeta,
      reportCheck: roadReports,
    });
  }

  const ranking = rows
    .filter((row) => row.total > 0)
    .sort((a, b) => b.total - a.total || b.realTrips - a.realTrips || b.roadReports - a.roadReports
      || a.name.localeCompare(b.name));

  // A tie that decides a prize is the owner's to settle
  const ties = [];
  for (const total of new Set(ranking.slice(0, 3).map((row) => row.total))) {
    const tied = ranking.filter((row) => row.total === total);
    if (tied.length > 1) ties.push({ total, names: tied.map((row) => row.name) });
  }

  const real = [...realTrips.values()].flat();
  const tests = [...testTrips.values()].flat();
  const testTripIds = new Set(tests.map((trip) => trip.id));
  const sos = data.alerts.filter(included).filter((alert) => alert.type === 'sos' && inWeek(alert.createdMs));
  const withUsername = [...people].filter((uid) => usernames.get(uid));
  const ranked = new Set(ranking.map((row) => row.uid));
  const health = {
    accounts: people.size,
    accountsWithUsername: withUsername.length,
    // Records the old version left behind, or sign-ups that never chose a name
    accountsWithoutUsername: people.size - withUsername.length,
    namedWithoutPoints: withUsername.filter((uid) => !ranked.has(uid)).length,
    everTestTrip: testTrips.size,
    countedThisWeek: rows.filter((row) => row.week.counted >= 1).length,
    countedSinceBeta: rows.filter((row) => row.sinceBeta.counted >= 1).length,
    threeOrMoreSinceBeta: rows.filter((row) => row.sinceBeta.counted >= 3).length,
    realStarted: real.filter((trip) => inWeek(trip.startMs)).length,
    realEnded: real.filter((trip) => trip.status === 'completed' && inWeek(trip.endMs)).length,
    realOverdue: real.filter((trip) => inWeek(trip.overdueMs)).length,
    testStarted: tests.filter((trip) => inWeek(trip.startMs)).length,
    sos: sos.length,
    sosInTestTrip: sos.filter((alert) => testTripIds.has(alert.tripId)).length,
    reportsCreated: reports.length,
    reportsWithPhotos: reports.filter((report) => report.hasPhotos).length,
  };

  // Two people who voted up each other's reports this week
  const votedFor = new Set();
  for (const [reportId, voters] of upvoters) {
    for (const voter of voters) votedFor.add(`${voter}>${authorOf.get(reportId)}`);
  }
  const mutual = [];
  for (const pair of votedFor) {
    const [voter, author] = pair.split('>');
    if (voter < author && votedFor.has(`${author}>${voter}`)) mutual.push([nameOf(voter), nameOf(author)]);
  }

  const checks = ranking.slice(0, top).map((row) => ({
    name: row.name,
    trips: row.week,
    reports: {
      ...row.reportCheck,
      confirmed: row.reportCheck.confirmed.map((report) => ({
        id: report.id.slice(0, 6),
        upvoters: report.upvoters.map(nameOf),
      })),
    },
  }));

  return {
    ranking: ranking.map(({ name, realTrips: tripsCounted, roadReports, firstTestTrip, problemReports, total }) => (
      { name, realTrips: tripsCounted, roadReports, firstTestTrip, problemReports, total }
    )),
    ties,
    health,
    checks,
    mutual,
    leftOut: leftOut.size,
    warnings,
  };
}

// ---------------------------------------------------------------- printing

const lagosTime = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Africa/Lagos', weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  hour: '2-digit', minute: '2-digit', hour12: false,
});

function table(rows, headings) {
  const all = (headings ? [headings, ...rows] : rows).map((row) => row.map(String));
  const columns = all[0].map((_, column) => column);
  const widths = columns.map((column) => Math.max(...all.map((row) => row[column].length)));
  // Words to the left, numbers to the right
  const leftAligned = columns.map((column) => rows.some((row) => typeof row[column] === 'string'));
  return all
    .map((row) => row
      .map((cell, column) => (leftAligned[column] ? cell.padEnd(widths[column]) : cell.padStart(widths[column])))
      .join('  ')
      .trimEnd())
    .join('\n');
}

const listReasons = (rejected) => Object.entries(rejected).map(([reason, count]) => `${count} ${reason}`).join(', ');

/** The report as text. `source` says where the numbers came from. */
export function formatReport(result, { fromMs, toMs, nowMs, source }) {
  const lines = [];
  const say = (text = '') => lines.push(text);
  const { ranking, health, checks } = result;

  say('WakaGuard weekly numbers');
  say(`Week: ${lagosTime.format(fromMs)} to ${lagosTime.format(toMs)}, Nigeria time`);
  if (nowMs < toMs) say('This week is still running, so these are the numbers so far.');
  say(`Source: ${source}`);
  say(`Accounts left out: ${result.leftOut}`);
  for (const warning of result.warnings) say(`WARNING: ${warning}`);

  say();
  say('A. RANKING');
  if (ranking.length === 0) {
    say('Nobody has points for this week yet.');
  } else {
    say(table(
      ranking.map((row, index) => [
        index + 1, row.name, row.realTrips, row.roadReports, row.firstTestTrip ? 'yes' : 'no',
        row.problemReports, row.total,
      ]),
      ['#', 'Username', 'Real trips', 'Road reports', 'First test trip', 'Problem reports', 'Points'],
    ));
    say();
    say(`Points: real trip ${POINTS.realTrip} (at most ${DAILY_LIMIT.realTrips} a day), confirmed road report `
      + `${POINTS.roadReport} (at most ${DAILY_LIMIT.roadReports} a day), first test trip ${POINTS.firstTestTrip}, `
      + `problem report ${POINTS.problemReport}.`);
    for (const tie of result.ties) {
      say(`TIE on ${tie.total} points: ${tie.names.join(', ')}. The order above is by real trips, then road `
        + 'reports; a prize tie is yours to decide.');
    }
  }
  say(`Accounts with a username and no points this week: ${health.namedWithoutPoints}`);

  say();
  say('B. HEALTH');
  say(table([
    ['Accounts with a username', health.accountsWithUsername],
    ['Accounts without a username', health.accountsWithoutUsername],
    ['People with at least one test trip, ever', health.everTestTrip],
    ['People with a counted real trip this week', health.countedThisWeek],
    ['People with a counted real trip since the beta began', health.countedSinceBeta],
    ['People with three or more since the beta began', health.threeOrMoreSinceBeta],
    ['Real trips started this week', health.realStarted],
    ['Real trips ended by the traveller', health.realEnded],
    ['Real trips that went overdue', health.realOverdue],
    ['Test trips started this week', health.testStarted],
    ['SOS alerts', `${health.sos} (${health.sosInTestTrip} in a test trip)`],
    ['Road reports created', `${health.reportsCreated} (${health.reportsWithPhotos} with photos)`],
  ]));

  say();
  say(`C. CHEATING CHECK (top ${checks.length})`);
  for (const check of checks) {
    say(check.name);
    const tripsOut = listReasons(check.trips.rejected);
    say(`  Real trips: ${check.trips.inThePeriod} this week, ${check.trips.counted} counted.`
      + (tripsOut ? ` Not counted: ${tripsOut}.` : ''));
    const reportsOut = listReasons(check.reports.rejected);
    say(`  Road reports: ${check.reports.created} created, ${check.reports.counted} counted.`
      + (reportsOut ? ` Not counted: ${reportsOut}.` : ''));
    for (const report of check.reports.confirmed) {
      say(`    report ${report.id} voted up by ${report.upvoters.join(', ')}`);
    }
  }
  say(result.mutual.length === 0
    ? 'Nobody voted up each other\'s reports.'
    : `Voted up each other's reports: ${result.mutual.map((pair) => pair.join(' and ')).join('; ')}`);

  return lines.join('\n');
}

// ---------------------------------------------------------------- reading

const VOTES_PER_QUERY = 30;

/**
 * Reads what the week needs and nothing else. Trips are read for all time,
 * because the first test trip and "since the beta began" look further back.
 */
export async function collect(db, { fromMs, toMs }) {
  const at = (value) => (typeof value?.toMillis === 'function' ? value.toMillis() : null);
  // Only documents under users/{uid}, not same-named collections elsewhere
  const ownerOf = (doc) => {
    const owner = doc.ref.parent.parent;
    return owner && owner.parent.id === 'users' ? owner.id : null;
  };

  const [users, trips, alerts, reports] = await Promise.all([
    db.collection('users').select('username').get(),
    db.collectionGroup('trips')
      .select('status', 'startTime', 'endTime', 'isTest', 'startLocation', 'endLocation', 'overdueAt', 'farthestFromStartM')
      .get(),
    db.collectionGroup('alerts').select('type', 'createdAt', 'tripId').get(),
    db.collection('reports')
      .where('createdAt', '>=', new Date(fromMs))
      .where('createdAt', '<', new Date(toMs))
      .select('uid', 'createdAt', 'flagCount', 'photoUrls')
      .get(),
  ]);

  const reportIds = reports.docs.map((doc) => doc.id);
  const votes = [];
  for (let i = 0; i < reportIds.length; i += VOTES_PER_QUERY) {
    const found = await db.collection('votes')
      .where('reportId', 'in', reportIds.slice(i, i + VOTES_PER_QUERY))
      .select('uid', 'reportId', 'value')
      .get();
    votes.push(...found.docs.map((doc) => doc.data()));
  }

  return {
    users: users.docs.map((doc) => ({ uid: doc.id, username: doc.get('username') || '' })),
    trips: trips.docs.filter(ownerOf).map((doc) => ({
      uid: ownerOf(doc),
      id: doc.id,
      status: doc.get('status'),
      startMs: at(doc.get('startTime')),
      endMs: at(doc.get('endTime')),
      isTest: doc.get('isTest') === true,
      startLocation: doc.get('startLocation') || null,
      endLocation: doc.get('endLocation') || null,
      overdueMs: at(doc.get('overdueAt')),
      farthestM: typeof doc.get('farthestFromStartM') === 'number' ? doc.get('farthestFromStartM') : null,
    })),
    alerts: alerts.docs.filter(ownerOf).map((doc) => ({
      uid: ownerOf(doc),
      type: doc.get('type'),
      createdMs: at(doc.get('createdAt')),
      tripId: doc.get('tripId') || null,
    })),
    reports: reports.docs.map((doc) => ({
      id: doc.id,
      uid: doc.get('uid'),
      createdMs: at(doc.get('createdAt')),
      flagCount: doc.get('flagCount') || 0,
      hasPhotos: (doc.get('photoUrls') || []).length > 0,
    })),
    votes,
  };
}

// ---------------------------------------------------------------- command

const FLAGS = ['emulator', 'live', 'help'];
const VALUES = ['from', 'to', 'since', 'exclude', 'problems', 'problems-file', 'top', 'project'];

export function readArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const name = argv[i].replace(/^--/, '');
    if (argv[i].startsWith('--') && FLAGS.includes(name)) args[name] = true;
    else if (argv[i].startsWith('--') && VALUES.includes(name) && i + 1 < argv.length) args[name] = argv[++i];
    else throw new Error(`Did not understand "${argv[i]}". Run with --help for the options.`);
  }
  return args;
}

const splitList = (text) => (text || '').split(',').map((part) => part.trim()).filter(Boolean);

/** Entries like "ada=2" (or "ada,2" from a file) as {ada: 2}. */
export function readProblems(entries) {
  const problems = {};
  for (const entry of entries) {
    const match = /^(.+?)\s*[=,:\t]\s*(\d+)$/.exec(entry);
    if (!match) throw new Error(`"${entry}" is not a username and a count, like ada=2.`);
    problems[match[1]] = (problems[match[1]] || 0) + Number(match[2]);
  }
  return problems;
}

const HELP = `Weekly numbers for the WakaGuard beta ranking. Read-only.

  --emulator            read the local emulator (project ${EMULATOR_PROJECT})
  --live                read the live project (${LIVE_PROJECT}); only on the owner's word
  --from 2026-10-11     start of the week, 18:00 Nigeria time that day (default: the week we are in)
  --to 2026-10-18       end of the week (default: seven days after --from)
  --since ${BETA_STARTED}    when the beta began, for the "since the beta began" numbers
  --exclude a,b         usernames (or uids) to leave out: the owner, the test account, the reviewers
  --problems a=2,b=1    problem reports judged from the sheet, ${POINTS.problemReport} points each
  --problems-file path  the same, one "username,count" a line
  --top 10              how many of the ranking to check for cheating`;

async function main() {
  const args = readArgs(process.argv.slice(2));
  if (args.help) return console.log(HELP);
  if (!!args.emulator === !!args.live) throw new Error('Say where to read from: --emulator or --live.');

  const fromMs = args.from ? parseLagosTime(args.from) : weekStartBefore(Date.now());
  const toMs = args.to ? parseLagosTime(args.to) : fromMs + WEEK_MS;
  if (toMs <= fromMs) throw new Error('--to must be after --from.');
  const problems = readProblems([
    ...splitList(args.problems),
    ...(args['problems-file'] ? readFileSync(args['problems-file'], 'utf8').split('\n') : [])
      .map((line) => line.trim()).filter(Boolean),
  ]);

  let projectId = args.project || LIVE_PROJECT;
  if (args.emulator) {
    projectId = args.project || EMULATOR_PROJECT;
    process.env.FIRESTORE_EMULATOR_HOST ||= '127.0.0.1:8080';
    const host = process.env.FIRESTORE_EMULATOR_HOST.split(':')[0];
    if (!['127.0.0.1', 'localhost', '[::1]'].includes(host)) {
      throw new Error(`FIRESTORE_EMULATOR_HOST is ${process.env.FIRESTORE_EMULATOR_HOST}, which is not this computer.`);
    }
  } else if (process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error('FIRESTORE_EMULATOR_HOST is set, so --live would read the emulator. Unset it first.');
  }

  // firebase-admin is installed for the Cloud Functions, so load it from there
  const require = createRequire(new URL('../functions/package.json', import.meta.url));
  const admin = require('firebase-admin');
  admin.initializeApp({ projectId });

  const data = await collect(admin.firestore(), { fromMs, toMs });
  const result = scoreWeek(data, {
    fromMs,
    toMs,
    sinceMs: parseLagosTime(args.since || BETA_STARTED),
    excluded: splitList(args.exclude),
    problems,
    top: Number(args.top) || 10,
  });
  console.log(formatReport(result, {
    fromMs,
    toMs,
    nowMs: Date.now(),
    source: args.emulator ? `local emulator (${projectId})` : `live project ${projectId}, read-only`,
  }));
  await admin.app().delete();
}

// Run as a script
if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  main().catch((error) => {
    const message = error?.message || String(error);
    console.error(message);
    if (/default credentials|invalid_grant|reauth|UNAUTHENTICATED/i.test(message)) {
      console.error('\nSign in on this computer first: gcloud auth application-default login');
    }
    process.exit(1);
  });
}
