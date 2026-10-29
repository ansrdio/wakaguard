/**
 * The sums behind the owner's Numbers page (adminNumbers.ts), kept apart from
 * Firebase so they can be tested on their own. Counts only: nothing here
 * carries a name, number, email, place or message.
 */

export const DAY_MS = 24 * 60 * 60 * 1000;
/** Days shown one by one */
export const DAYS_SHOWN = 14;
/** Weeks of new accounts shown */
export const WEEKS_SHOWN = 8;
/** Texts are added up over this many days */
export const TEXT_DAYS = 30;
/** What Google lets go free each day (Firestore's free quota) */
export const FREE_READS_PER_DAY = 50_000;
export const FREE_WRITES_PER_DAY = 20_000;

/** Africa's Talking's final reports that a text did not reach the phone (smsReportPlan.ts) */
const NOT_DELIVERED = ['Rejected', 'Failed', 'Expired', 'AbsentSubscriber'];

/** The date in Nigeria (UTC+1 all year) as YYYY-MM-DD */
export function lagosDate(ms: number): string {
  return new Date(ms + 60 * 60 * 1000).toISOString().slice(0, 10);
}

export interface Account {
  createdMs: number;
  /** When the app last renewed the sign-in, which it does about hourly while open */
  lastSeenMs: number;
  /** How the account signs in: password, google.com, apple.com */
  methods: string[];
}

export interface PeopleNumbers {
  accounts: number;
  last24h: number;
  last7d: number;
  last30d: number;
  /** Of the accounts made more than a day ago, how many used the app again a day or more later */
  cameBack: number;
  couldComeBack: number;
  methods: Record<string, number>;
  /** Oldest week first; each week ends on the date given */
  joinedByWeek: Array<{ weekEnding: string; count: number }>;
}

export function countPeople(accounts: Account[], nowMs: number): PeopleNumbers {
  const seenWithin = (days: number) => accounts.filter((a) => a.lastSeenMs >= nowMs - days * DAY_MS).length;
  const old = accounts.filter((a) => a.createdMs <= nowMs - DAY_MS);
  const methods: Record<string, number> = {};
  for (const a of accounts) {
    const key = a.methods.length > 0 ? [...a.methods].sort().join(' + ') : 'none';
    methods[key] = (methods[key] || 0) + 1;
  }
  const joinedByWeek: PeopleNumbers['joinedByWeek'] = [];
  for (let w = WEEKS_SHOWN - 1; w >= 0; w--) {
    const end = nowMs - w * 7 * DAY_MS;
    joinedByWeek.push({
      weekEnding: lagosDate(end),
      count: accounts.filter((a) => a.createdMs > end - 7 * DAY_MS && a.createdMs <= end).length,
    });
  }
  return {
    accounts: accounts.length,
    last24h: seenWithin(1),
    last7d: seenWithin(7),
    last30d: seenWithin(30),
    cameBack: old.filter((a) => a.lastSeenMs - a.createdMs >= DAY_MS).length,
    couldComeBack: old.length,
    methods,
    joinedByWeek,
  };
}

export interface TripRow {
  uid: string;
  startMs: number;
  isTest: boolean;
  wentOverdue: boolean;
}

export interface DayNumbers {
  /** YYYY-MM-DD in Nigeria */
  date: string;
  /** People who started any trip that day, test or real */
  people: number;
  realTrips: number;
  testTrips: number;
  /** Real trips that went past their time */
  overdue: number;
  sos: number;
  roadReports: number;
  /** Texts that went out, one per contact */
  texts: number;
}

/** The last DAYS_SHOWN days in Nigeria, oldest first, today last */
export function countDays(
  input: { trips: TripRow[]; sosMs: number[]; roadReportMs: number[]; texts: Array<{ ms: number; count: number }> },
  nowMs: number
): DayNumbers[] {
  const days = new Map<string, DayNumbers & { uids: Set<string> }>();
  for (let i = DAYS_SHOWN - 1; i >= 0; i--) {
    const date = lagosDate(nowMs - i * DAY_MS);
    days.set(date, { date, people: 0, realTrips: 0, testTrips: 0, overdue: 0, sos: 0, roadReports: 0, texts: 0, uids: new Set() });
  }
  const on = (ms: number) => days.get(lagosDate(ms));
  for (const trip of input.trips) {
    const day = on(trip.startMs);
    if (!day) continue;
    day.uids.add(trip.uid);
    if (trip.isTest) {
      day.testTrips += 1;
    } else {
      day.realTrips += 1;
      if (trip.wentOverdue) day.overdue += 1;
    }
  }
  for (const ms of input.sosMs) { const day = on(ms); if (day) day.sos += 1; }
  for (const ms of input.roadReportMs) { const day = on(ms); if (day) day.roadReports += 1; }
  for (const t of input.texts) { const day = on(t.ms); if (day) day.texts += t.count; }
  return [...days.values()].map(({ uids, ...day }) => ({ ...day, people: uids.size }));
}

/** One safetyMessageLogs entry, cut down to what the page counts */
export interface LoggedMessage {
  createdMs: number;
  /** Held back because texting was switched off */
  heldBack: boolean;
  texts: Array<{ sent: boolean; provider: string | null; report: string | null; resent: boolean }>;
}

export function messageFromLog(log: Record<string, any>, createdMs: number): LoggedMessage {
  const results: any[] = Array.isArray(log.providerResult) ? log.providerResult : [];
  const reports = log.reports && typeof log.reports === 'object' ? log.reports : {};
  const resends = log.resends && typeof log.resends === 'object' ? log.resends : {};
  return {
    createdMs,
    heldBack: log.provider === 'blocked',
    texts: results.map((r) => ({
      sent: !!r?.sid && !r?.error,
      provider: typeof r?.provider === 'string' ? r.provider : null,
      report: r?.sid && typeof reports[r.sid]?.status === 'string' ? reports[r.sid].status : null,
      resent: !!r?.sid && resends[r.sid]?.state === 'sent',
    })),
  };
}

export interface TextNumbers {
  /** Messages (one per alert, trip link and so on), each to one or more contacts */
  messages: number;
  /** Texts that went out, one per contact */
  sent: number;
  /** Texts no provider would take */
  notSent: number;
  heldBack: number;
  viaAfricasTalking: number;
  viaTermii: number;
  /** Africa's Talking's later word on its texts */
  delivered: number;
  notDelivered: number;
  noReportYet: number;
  /** Sent again through the backup after Africa's Talking reported them undelivered */
  resent: number;
}

export function countTexts(messages: LoggedMessage[]): TextNumbers {
  const n: TextNumbers = {
    messages: messages.length, sent: 0, notSent: 0, heldBack: 0, viaAfricasTalking: 0, viaTermii: 0,
    delivered: 0, notDelivered: 0, noReportYet: 0, resent: 0,
  };
  for (const message of messages) {
    for (const text of message.texts) {
      if (message.heldBack) { n.heldBack += 1; continue; }
      if (!text.sent) { n.notSent += 1; continue; }
      n.sent += 1;
      if (text.provider === 'termii') n.viaTermii += 1;
      if (text.provider !== 'africastalking') continue;
      n.viaAfricasTalking += 1;
      if (text.report === 'Success') n.delivered += 1;
      else if (text.report && NOT_DELIVERED.includes(text.report)) n.notDelivered += 1;
      else n.noReportYet += 1;
      if (text.resent) n.resent += 1;
    }
  }
  return n;
}

export interface PhoneNumbers {
  platform: string;
  /** The app build that last registered; null for builds before 23, which did not say */
  build: number | null;
  count: number;
}

/** Phones registered for notifications, by platform and app build, newest build first */
export function countPhones(rows: Array<{ platform: unknown; build: unknown }>): PhoneNumbers[] {
  const counts = new Map<string, PhoneNumbers>();
  for (const row of rows) {
    const platform = typeof row.platform === 'string' && row.platform ? row.platform : 'unknown';
    const build = typeof row.build === 'number' && Number.isFinite(row.build) ? row.build : null;
    const key = `${platform}/${build}`;
    const entry = counts.get(key) ?? { platform, build, count: 0 };
    entry.count += 1;
    counts.set(key, entry);
  }
  return [...counts.values()].sort((a, b) =>
    a.platform.localeCompare(b.platform) || (b.build ?? -1) - (a.build ?? -1));
}

export interface DatabaseDay {
  /** The end of the 24 hours counted */
  endMs: number;
  reads: number;
  writes: number;
}

export interface Numbers {
  asOfMs: number;
  /** The owner's own accounts, left out of every count */
  leftOut: number;
  /** Anonymous sign-ins left from the RoutePulse app, not counted as people */
  oldAnonymous: number;
  people: PeopleNumbers;
  days: DayNumbers[];
  textDays: number;
  texts: TextNumbers;
  phones: PhoneNumbers[];
  /** Null when Google Cloud's figures could not be read */
  database: { days: DatabaseDay[]; freeReadsPerDay: number; freeWritesPerDay: number } | null;
}
