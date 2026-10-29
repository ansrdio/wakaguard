/**
 * What the owner's Numbers page shows (src/app/admin/numbers), as the
 * adminNumbers server function returns it (functions/src/adminNumbersPlan.ts).
 * Counts only.
 */

export interface DayNumbers {
  /** YYYY-MM-DD in Nigeria */
  date: string;
  people: number;
  realTrips: number;
  testTrips: number;
  overdue: number;
  km: number;
  sos: number;
  checkpointStops: number;
  roadReports: number;
  texts: number;
}

export interface Numbers {
  asOfMs: number;
  leftOut: number;
  oldAnonymous: number;
  people: {
    accounts: number;
    last24h: number;
    last7d: number;
    last30d: number;
    cameBack: number;
    couldComeBack: number;
    methods: Record<string, number>;
    joinedByWeek: Array<{ weekEnding: string; count: number }>;
  };
  days: DayNumbers[];
  travel: {
    trips: number;
    km: number;
    hours: number;
    recentTrips: number;
    recentKm: number;
    recentHours: number;
    recentTravellers: number;
    hoursPerTravellerWeekly: number;
    medianMinutes: number | null;
    endedOnTime: number;
    measured: number;
  };
  reports: {
    roadReports: number;
    recentRoadReports: number;
    withPhotos: number;
    votedUp: number;
    checkpointStops: number;
    recentCheckpointStops: number;
    withContacts: number;
  };
  textDays: number;
  texts: {
    messages: number;
    sent: number;
    notSent: number;
    heldBack: number;
    viaAfricasTalking: number;
    viaTermii: number;
    delivered: number;
    notDelivered: number;
    noReportYet: number;
    resent: number;
  };
  phones: Array<{ platform: string; build: number | null; count: number }>;
  database: {
    days: Array<{ endMs: number; reads: number; writes: number }>;
    freeReadsPerDay: number;
    freeWritesPerDay: number;
  } | null;
}

const NIGERIA = 'Africa/Lagos';

/** "2026-10-28" as "Wed 28 Oct" */
export function dayLabel(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' })
    .format(Date.UTC(y, m - 1, d));
}

/** A moment as Nigerian time, "Wed 28 Oct, 22:30" */
export function momentLabel(ms: number): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: NIGERIA, weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(ms);
}

export function count(n: number): string {
  return n.toLocaleString('en-GB');
}

/** Kilometres or hours to one decimal place under 100, whole above: "7.4", "1,240" */
export function amount(n: number): string {
  return n.toLocaleString('en-GB', { maximumFractionDigits: n < 100 ? 1 : 0 });
}

/** Minutes as "25 min" or "1 h 10 min" */
export function minutesLabel(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h === 0 ? `${m} min` : m === 0 ? `${h} h` : `${h} h ${m} min`;
}

/** Whole per cent of a part, or a dash when there is nothing to divide by */
export function percent(part: number, whole: number): string {
  return whole > 0 ? `${Math.round((part / whole) * 100)}%` : '–';
}

const METHOD_NAMES: Record<string, string> = { password: 'email', 'google.com': 'Google', 'apple.com': 'Apple' };

/** "password + google.com" as "email + Google" */
export function methodLabel(key: string): string {
  return key.split(' + ').map((m) => METHOD_NAMES[m] ?? m).join(' + ');
}

export function platformLabel(platform: string): string {
  return platform === 'ios' ? 'iPhone' : platform === 'android' ? 'Android' : platform === 'web' ? 'Website' : 'Unknown';
}
