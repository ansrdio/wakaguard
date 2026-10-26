import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  parseLagosTime, weekStartBefore, lagosDay, metresBetween, scoreWeek, formatReport, readArgs, readProblems,
  WEEK_MS, stillnessOf,
  // @ts-expect-error plain JavaScript module, run by hand as a script
} from '../../scripts/weekly-numbers.mjs';

const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

// Week one: Sunday 11 October 18:00 to Sunday 18 October 18:00, Nigeria time
const FROM = Date.UTC(2026, 9, 11, 17);
const TO = FROM + WEEK_MS;
// Monday 12 October, 09:00 in Nigeria
const MONDAY = Date.UTC(2026, 9, 12, 8);

const IKEJA = { lat: 6.6018, lng: 3.3515 };
const YABA = { lat: 6.5095, lng: 3.3711 };
const NEAR_IKEJA = { lat: 6.6030, lng: 3.3520 };

let seq = 0;
const trip = (uid: string, startMs: number, over: Record<string, unknown> = {}) => ({
  uid,
  id: `trip${++seq}`,
  status: 'completed',
  startMs,
  endMs: startMs + 40 * MIN,
  isTest: false,
  startLocation: IKEJA,
  endLocation: YABA,
  overdueMs: null,
  ...over,
});
const report = (uid: string, createdMs: number, over: Record<string, unknown> = {}) => ({
  id: `report${++seq}`, uid, createdMs, flagCount: 0, hasPhotos: false, ...over,
});
const upvote = (uid: string, reportId: string) => ({ uid, reportId, value: 1 });
const users = (...names: string[]) => names.map((name) => ({ uid: `uid-${name}`, username: name }));

const score = (data: Record<string, unknown>, options: Record<string, unknown> = {}) => scoreWeek(
  { users: [], trips: [], reports: [], votes: [], alerts: [], ...data },
  { fromMs: FROM, toMs: TO, ...options },
);

interface Row { name: string; realTrips: number; roadReports: number; total: number }
interface Check {
  name: string;
  trips: { rejected: Record<string, number> };
  reports: { rejected: Record<string, number>; confirmed: { id: string; upvoters: string[] }[] };
}
const rowFor = (result: { ranking: Row[] }, name: string) => result.ranking.find((row) => row.name === name);
const checkFor = (result: { checks: Check[] }, name: string) => result.checks.find((check) => check.name === name);

test('a plain date means 18:00 that day in Nigeria', () => {
  assert.equal(parseLagosTime('2026-10-11'), FROM);
  assert.equal(parseLagosTime('2026-10-12T09:00'), MONDAY);
  assert.throws(() => parseLagosTime('next sunday'), /not a date/);
});

test('the scoring week starts on Sunday at 18:00 in Nigeria', () => {
  assert.equal(weekStartBefore(MONDAY), FROM);
  assert.equal(weekStartBefore(FROM), FROM);
  // Sunday afternoon, before 18:00, still belongs to the week that is ending
  assert.equal(weekStartBefore(TO - HOUR), FROM);
  assert.equal(weekStartBefore(TO), TO);
});

test('the daily limits use the calendar day in Nigeria', () => {
  assert.equal(lagosDay(Date.UTC(2026, 9, 12, 22, 59)), '2026-10-12');
  assert.equal(lagosDay(Date.UTC(2026, 9, 12, 23, 0)), '2026-10-13');
});

test('Ikeja to Yaba is about ten kilometres in a straight line', () => {
  const metres = metresBetween(IKEJA, YABA);
  assert.ok(metres > 10000 && metres < 11000, `${metres}`);
});

test('a real trip the traveller ended earns 3 points', () => {
  const result = score({ users: users('ada'), trips: [trip('uid-ada', MONDAY)] });
  assert.deepEqual(result.ranking, [
    { name: 'ada', realTrips: 1, roadReports: 0, firstTestTrip: false, problemReports: 0, everydayBonus: false, total: 3 },
  ]);
});

test('a trip that went overdue before the testers were told still counts', () => {
  const result = score({
    users: users('ada'),
    trips: [trip('uid-ada', MONDAY, { overdueMs: MONDAY + 30 * MIN, endMs: MONDAY + 50 * MIN })],
  });
  assert.equal(rowFor(result, 'ada')?.total, 3);
  assert.equal(result.health.realOverdue, 1);
});

test('from Thursday 15 October, a trip that ran past the wait before contacts are texted earns nothing', () => {
  // Thursday 15 October, 09:00 in Nigeria
  const thursday = Date.UTC(2026, 9, 15, 8);
  const result = score({
    users: users('ada'),
    trips: [
      trip('uid-ada', thursday, { overdueMs: thursday + 60 * MIN, endMs: thursday + 70 * MIN }),
      trip('uid-ada', thursday + 3 * HOUR),
    ],
  });
  assert.equal(rowFor(result, 'ada')?.total, 3, 'only the trip ended in time counts');
  assert.deepEqual(checkFor(result, 'ada')?.trips.rejected, { 'ended after contacts would have been texted': 1 });
});

test('a round trip counts by how far it went, not by where it ended', () => {
  const result = score({
    users: users('ada'),
    trips: [
      trip('uid-ada', MONDAY, { endLocation: NEAR_IKEJA, farthestM: 2400 }),
      trip('uid-ada', MONDAY + 3 * HOUR, { endLocation: NEAR_IKEJA, farthestM: 300 }),
      trip('uid-ada', MONDAY + 6 * HOUR, { endLocation: NEAR_IKEJA }),
    ],
  });
  assert.deepEqual(checkFor(result, 'ada')?.trips.rejected, { 'did not move': 2 });
  assert.equal(rowFor(result, 'ada')?.total, 3);
});

test('a trip that did not move says whether the phone stayed put or went quiet', () => {
  assert.equal(stillnessOf({ positions: 47, longestGapMs: 2 * MIN }), '47 positions, never more than 2 min apart: stayed put');
  assert.equal(stillnessOf({ positions: 3, longestGapMs: 40 * MIN }), '3 positions; the phone went quiet for 40 min');
  assert.equal(stillnessOf({ positions: 0, longestGapMs: 0 }), 'no positions after the start');
  assert.equal(stillnessOf({ positions: null, longestGapMs: null }), 'positions not counted (before 19 October)');

  const result = score({
    users: users('ada'),
    trips: [
      trip('uid-ada', MONDAY, { endLocation: NEAR_IKEJA, positions: 30, longestGapMs: 3 * MIN }),
      trip('uid-ada', MONDAY + 3 * HOUR, { endLocation: NEAR_IKEJA, positions: 2, longestGapMs: 35 * MIN }),
      trip('uid-ada', MONDAY + 6 * HOUR),
    ],
  });
  const check = checkFor(result, 'ada') as Check & { still: { minutes: number; stillness: string; quiet: boolean }[] };
  assert.deepEqual(check.still.map((t) => [t.minutes, t.quiet]), [[40, false], [40, true]]);
  assert.match(check.still[1].stillness, /went quiet for 35 min/);
  assert.equal(result.health.realStill, 2);
  assert.equal(result.health.realStillQuiet, 1);
  assert.match(formatReport(result, { fromMs: FROM, toMs: TO, nowMs: TO + DAY, source: 'test' }), /Did not move: .*stayed put/);
});

test('trips that break a rule earn nothing and say why', () => {
  const result = score({
    users: users('ada'),
    trips: [
      trip('uid-ada', MONDAY),
      trip('uid-ada', MONDAY + DAY, { endMs: MONDAY + DAY + 9 * MIN }),
      trip('uid-ada', MONDAY + 2 * DAY, { endLocation: NEAR_IKEJA }),
      trip('uid-ada', MONDAY + 3 * DAY, { endLocation: null }),
      trip('uid-ada', MONDAY + 4 * DAY, { startLocation: null }),
      trip('uid-ada', MONDAY + 5 * DAY, { status: 'cancelled' }),
      trip('uid-ada', MONDAY + 5 * DAY + HOUR, { status: 'active', endMs: null }),
      trip('uid-ada', MONDAY + 2 * HOUR, { isTest: true, startMs: FROM - DAY, endMs: FROM - DAY + 2 * MIN }),
    ],
  });
  assert.equal(rowFor(result, 'ada')?.realTrips, 1);
  assert.deepEqual(checkFor(result, 'ada')?.trips, {
    inThePeriod: 7,
    counted: 1,
    days: 1,
    rejected: {
      'too short': 1,
      'did not move': 1,
      'no location': 2,
      'not ended by the traveller': 2,
    },
  });
});

test('at most two real trips count on one day', () => {
  const result = score({
    users: users('ada'),
    trips: [
      trip('uid-ada', MONDAY),
      trip('uid-ada', MONDAY + 2 * HOUR),
      trip('uid-ada', MONDAY + 4 * HOUR),
      // Ends at 00:10 on Tuesday in Nigeria, so it belongs to Tuesday
      trip('uid-ada', Date.UTC(2026, 9, 12, 22, 30)),
    ],
  });
  assert.equal(rowFor(result, 'ada')?.realTrips, 3);
  assert.deepEqual(checkFor(result, 'ada')?.trips.rejected, { 'over the daily limit': 1 });
});

test('from week three, counted real trips on five different days earn the everyday bonus once', () => {
  // Week three: Sunday 25 October 18:00 to Sunday 1 November 18:00, Nigeria time
  const week3 = Date.UTC(2026, 9, 25, 17);
  const monday = week3 + 15 * HOUR;
  const days = (count: number, uid: string) => Array.from({ length: count }, (_, i) => trip(uid, monday + i * DAY));
  const result = score({
    users: users('ada', 'tunde', 'bisi'),
    trips: [
      ...days(5, 'uid-ada'),
      // Two on Monday still make one day, so four days in all
      ...days(4, 'uid-tunde'), trip('uid-tunde', monday + 2 * HOUR),
      // Five days, but one trip did not move, so four counted days
      ...days(4, 'uid-bisi'), trip('uid-bisi', monday + 4 * DAY, { endLocation: NEAR_IKEJA }),
    ],
  }, { fromMs: week3, toMs: week3 + WEEK_MS });
  assert.equal(rowFor(result, 'ada')?.total, 5 * 3 + 5);
  assert.equal(rowFor(result, 'tunde')?.total, 5 * 3);
  assert.equal(rowFor(result, 'bisi')?.total, 4 * 3);

  // Earlier weeks are scored as they were announced, without it
  const weekOne = score({ users: users('ada'), trips: days(5, 'uid-ada').map((t) => ({ ...t, startMs: t.startMs - 14 * DAY, endMs: t.endMs - 14 * DAY })) });
  assert.equal(rowFor(weekOne, 'ada')?.total, 5 * 3);
});

test('a trip belongs to the week it ended in', () => {
  const data = {
    users: users('ada'),
    trips: [
      trip('uid-ada', FROM - 20 * MIN),
      trip('uid-ada', TO - 20 * MIN),
    ],
  };
  const weekOne = score(data);
  assert.equal(rowFor(weekOne, 'ada')?.realTrips, 1);
  assert.deepEqual(checkFor(weekOne, 'ada')?.trips.rejected, { 'ended after the week': 1 });

  const weekTwo = score(data, { fromMs: TO, toMs: TO + WEEK_MS, sinceMs: FROM });
  assert.equal(rowFor(weekTwo, 'ada')?.realTrips, 1);
});

test('a road report counts once another tester votes it up', () => {
  const confirmed = report('uid-ada', MONDAY);
  const selfVoted = report('uid-ada', MONDAY + HOUR);
  const votedDown = report('uid-ada', MONDAY + 2 * HOUR);
  const flagged = report('uid-ada', MONDAY + 3 * HOUR, { flagCount: 1 });
  const result = score({
    users: users('ada', 'tunde', 'bisi'),
    reports: [confirmed, selfVoted, votedDown, flagged],
    votes: [
      upvote('uid-tunde', confirmed.id),
      upvote('uid-bisi', confirmed.id),
      upvote('uid-ada', selfVoted.id),
      { uid: 'uid-tunde', reportId: votedDown.id, value: -1 },
      upvote('uid-tunde', flagged.id),
    ],
  });
  assert.equal(rowFor(result, 'ada')?.roadReports, 1);
  assert.equal(rowFor(result, 'ada')?.total, 2);
  const check = checkFor(result, 'ada')?.reports;
  assert.deepEqual(check?.rejected, { 'no upvote from another tester': 2, flagged: 1 });
  assert.deepEqual(check?.confirmed, [{ id: confirmed.id.slice(0, 6), upvoters: ['tunde', 'bisi'] }]);
});

test('a road report posted from far away stays up but earns nothing, even voted up', () => {
  const far = report('uid-ada', MONDAY, { postedFarAway: true });
  const near = report('uid-ada', MONDAY + HOUR);
  const result = score({
    users: users('ada', 'tunde'),
    reports: [far, near],
    votes: [upvote('uid-tunde', far.id), upvote('uid-tunde', near.id)],
  });
  assert.equal(rowFor(result, 'ada')?.roadReports, 1);
  assert.deepEqual(checkFor(result, 'ada')?.reports.rejected, { 'posted from far away': 1 });
});

test('at most three road reports count on one day', () => {
  const reports = [0, 1, 2, 3].map((hour) => report('uid-ada', MONDAY + hour * HOUR));
  const result = score({
    users: users('ada', 'tunde'),
    reports,
    votes: reports.map((item) => upvote('uid-tunde', item.id)),
  });
  assert.equal(rowFor(result, 'ada')?.roadReports, 3);
});

test('reports from outside the week are ignored', () => {
  const old = report('uid-ada', FROM - HOUR);
  const result = score({ users: users('ada', 'tunde'), reports: [old], votes: [upvote('uid-tunde', old.id)] });
  assert.equal(result.ranking.length, 0);
  assert.equal(result.health.reportsCreated, 0);
});

test('the first test trip earns 2 points once, in the week it happened', () => {
  const data = {
    users: users('ada', 'tunde'),
    trips: [
      trip('uid-ada', MONDAY, { isTest: true, endMs: MONDAY + 2 * MIN }),
      trip('uid-ada', MONDAY + DAY, { isTest: true, endMs: MONDAY + DAY + 2 * MIN }),
      // Tunde tried a test trip before the beta week began
      trip('uid-tunde', FROM - DAY, { isTest: true }),
      trip('uid-tunde', MONDAY, { isTest: true }),
    ],
  };
  const result = score(data);
  assert.deepEqual(rowFor(result, 'ada'), {
    name: 'ada', realTrips: 0, roadReports: 0, firstTestTrip: true, problemReports: 0, everydayBonus: false, total: 2,
  });
  assert.equal(rowFor(result, 'tunde'), undefined);
  assert.equal(result.health.everTestTrip, 2);

  const nextWeek = score(data, { fromMs: TO, toMs: TO + WEEK_MS });
  assert.equal(nextWeek.ranking.length, 0);
});

test('problem reports judged by hand add 5 points each', () => {
  const result = score(
    { users: users('ada', 'tunde') },
    { problems: { Ada: 2, nobody: 1 } },
  );
  assert.equal(rowFor(result, 'ada')?.total, 10);
  assert.match(result.warnings.join('\n'), /"nobody" were not added/);
});

test('accounts left out do not rank, vote or count in the health numbers', () => {
  const adas = report('uid-ada', MONDAY);
  const result = score({
    users: users('ada', 'owner', 'reviewer'),
    trips: [trip('uid-owner', MONDAY), trip('uid-reviewer', MONDAY, { isTest: true })],
    reports: [adas, report('uid-owner', MONDAY)],
    votes: [upvote('uid-owner', adas.id)],
    alerts: [{ uid: 'uid-owner', type: 'sos', createdMs: MONDAY, tripId: null }],
  }, { excluded: ['Owner', 'uid-reviewer', 'someone-else'] });

  assert.equal(result.ranking.length, 0);
  assert.equal(result.leftOut, 2);
  assert.match(result.warnings.join('\n'), /"someone-else" was to be left out/);
  assert.deepEqual(
    [result.health.accountsWithUsername, result.health.realStarted, result.health.everTestTrip,
      result.health.sos, result.health.reportsCreated],
    [1, 0, 0, 0, 1],
  );
});

test('the health numbers follow people since the beta began', () => {
  const result = score({
    users: users('ada', 'tunde', 'bisi'),
    trips: [
      // Ada: two counted last week, one this week
      trip('uid-ada', FROM + DAY),
      trip('uid-ada', FROM + 2 * DAY),
      trip('uid-ada', TO + DAY),
      // Tunde: one this week, one cancelled
      trip('uid-tunde', TO + DAY),
      trip('uid-tunde', TO + 2 * DAY, { status: 'cancelled' }),
      trip('uid-bisi', TO + DAY, { isTest: true }),
    ],
    alerts: [
      { uid: 'uid-bisi', type: 'sos', createdMs: TO + DAY, tripId: `trip${seq}` },
      { uid: 'uid-ada', type: 'sos', createdMs: TO + DAY, tripId: null },
      { uid: 'uid-ada', type: 'timer_expired', createdMs: TO + DAY, tripId: null },
    ],
  }, { fromMs: TO, toMs: TO + WEEK_MS, sinceMs: FROM });

  assert.deepEqual(result.health, {
    accounts: 3,
    accountsWithUsername: 3,
    accountsWithoutUsername: 0,
    namedWithoutPoints: 0,
    everTestTrip: 1,
    countedThisWeek: 2,
    countedSinceBeta: 2,
    threeOrMoreSinceBeta: 1,
    realStarted: 3,
    realEnded: 2,
    realOverdue: 0,
    realStill: 0,
    realStillQuiet: 0,
    testStarted: 1,
    sos: 2,
    sosInTestTrip: 1,
    reportsCreated: 0,
    reportsWithPhotos: 0,
  });
});

test('two people who voted up each other are named, and prize ties are pointed out', () => {
  const adas = report('uid-ada', MONDAY);
  const tundes = report('uid-tunde', MONDAY);
  const result = score({
    users: users('ada', 'tunde', 'bisi'),
    reports: [adas, tundes],
    votes: [upvote('uid-tunde', adas.id), upvote('uid-ada', tundes.id), upvote('uid-bisi', adas.id)],
  });
  assert.deepEqual(result.mutual, [['ada', 'tunde']]);
  assert.deepEqual(result.ties, [{ total: 2, names: ['ada', 'tunde'] }]);
});

test('someone with no username is shown by the start of their id', () => {
  const result = score({ trips: [trip('AbCdEfGhIjKlMnOp', MONDAY)] });
  assert.equal(result.ranking[0].name, 'AbCdEf');
});

test('records with no username are counted apart from testers with no points', () => {
  const result = score({
    users: [...users('ada', 'tunde'), { uid: 'old-1', username: '' }, { uid: 'old-2', username: '' }],
    trips: [trip('uid-ada', MONDAY)],
  });
  assert.equal(result.health.accountsWithUsername, 2);
  assert.equal(result.health.accountsWithoutUsername, 2);
  assert.equal(result.health.namedWithoutPoints, 1);
  const text = formatReport(result, { fromMs: FROM, toMs: TO, nowMs: TO, source: 'a test' });
  assert.match(text, /Accounts with a username and no points this week: 1/);
  assert.match(text, /Accounts without a username\s+2/);
});

test('the printed report has usernames and counts, and nothing private', () => {
  const adas = report('uid-ada', MONDAY, { hasPhotos: true });
  const result = score({
    users: users('ada', 'tunde'),
    trips: [trip('uid-ada', MONDAY), trip('uid-ada', MONDAY + DAY, { endLocation: NEAR_IKEJA })],
    reports: [adas],
    votes: [upvote('uid-tunde', adas.id)],
  });
  const text = formatReport(result, { fromMs: FROM, toMs: TO, nowMs: MONDAY, source: 'a test' });

  assert.match(text, /Week: Sun,? 11 Oct 2026,? 18:00 to Sun,? 18 Oct 2026,? 18:00, Nigeria time/);
  assert.match(text, /still running/);
  assert.match(text, /1\s+ada\s+1\s+1\s+no\s+0\s+no\s+5/);
  assert.match(text, /Real trips: 2 this week, 1 counted\. Not counted: 1 did not move\./);
  assert.match(text, /report \w{6} voted up by tunde/);
  assert.match(text, /Road reports created\s+1 \(1 with photos\)/);
  for (const secret of ['6.60', '6.50', '3.35', '3.37', 'uid-ada', 'uid-tunde']) {
    assert.ok(!text.includes(secret), `the report shows "${secret}"`);
  }
});

test('the command line is read strictly', () => {
  assert.deepEqual(
    readArgs(['--live', '--from', '2026-10-11', '--exclude', 'a,b']),
    { live: true, from: '2026-10-11', exclude: 'a,b' },
  );
  assert.throws(() => readArgs(['--frm', '2026-10-11']), /Did not understand/);
  assert.deepEqual(readProblems(['ada=2', 'tunde,1', 'ada: 1']), { ada: 3, tunde: 1 });
  assert.throws(() => readProblems(['ada']), /not a username and a count/);
});

test('the script has no way to write to the database', () => {
  const source = readFileSync(new URL('../../scripts/weekly-numbers.mjs', import.meta.url), 'utf8');
  const code = source.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
  for (const write of ['.update(', '.create(', '.batch(', 'runTransaction', 'bulkWriter', '.doc(']) {
    assert.ok(!code.includes(write), `found "${write}" in the script`);
  }
  // set, add and delete are fine on a Map or a Set, but not where Firestore is read
  const reading = code.slice(code.indexOf('export async function collect'), code.indexOf('const FLAGS'));
  assert.ok(reading.includes('.get()'));
  assert.ok(!/\.(set|add|delete)\(/.test(reading), 'the reading code calls something that writes');
});
