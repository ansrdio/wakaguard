/**
 * How long records are kept before the daily deletion removes them
 * (recordRetention.ts), and the alarm limits for texting (serverWatch.ts),
 * kept apart from Firestore so they can be tested on their own.
 *
 * Agreed with the owner on 18 October 2026. The Privacy page quotes the same
 * numbers from src/lib/dataRetention.ts; a test holds the two equal.
 */

export const DAY_MS = 24 * 60 * 60 * 1000;

export const KEEP_DAYS = {
  /** A trip in someone's account, after its link expired (it ended, or ran out) */
  endedTrip: 90,
  /** The page contacts open, after its link expired */
  tripPage: 7,
  /** SOS alerts, checkpoint stops and the old safety timers in someone's account */
  sosAndCheckIns: 90,
  /** The log of texts sent, with the contacts' names and numbers */
  textLog: 90,
  /** A road report that expired or was resolved, after it expired; its photos, comments and votes go with it */
  oldReport: 90,
  /** A comment removed by its author or by moderation, after it was posted */
  removedComment: 30,
  /** Counters and caches: tries per trip link, place-name look-ups, weather forecasts */
  workingRecord: 2,
} as const;

/** Records deleted at once, and the most one run deletes of each kind */
export const DELETE_BATCH = 300;
export const MAX_DELETED_PER_KIND = 3000;

/** The moment before which a record kept `days` days is due */
export function cutoffMs(nowMs: number, days: number): number {
  return nowMs - days * DAY_MS;
}

/**
 * Only records inside someone's account are deleted by the account rules:
 * users/{uid}/trips/{id}, never the old top-level copies made before the
 * January data was moved into accounts.
 */
export function isInAccount(path: string, kind: 'trips' | 'alerts' | 'checkIns' | 'safetyTimers'): boolean {
  return new RegExp(`^users/[^/]+/${kind}/[^/]+$`).test(path);
}

/**
 * Nothing is deleted unless a backup this recent exists (ops/setup-safety.mjs
 * makes one a day), so anything deleted by mistake can still be brought back
 */
export const BACKUP_MAX_AGE_DAYS = 3;

export function backupIsRecent(newestBackupMs: number | null, nowMs: number): boolean {
  return newestBackupMs !== null && newestBackupMs <= nowMs && nowMs - newestBackupMs <= BACKUP_MAX_AGE_DAYS * DAY_MS;
}

/** Below this the Termii wallet is low (about 200 texts of two pages) */
export const WALLET_LOW_NGN = 3000;

/** More texts than this in an hour is a jump: a normal day has a handful */
export const MAX_TEXTS_PER_HOUR = 40;

/** What the hourly text check should warn about, if anything */
export function textAlarms(balanceNgn: number | null, textsLastHour: number): string[] {
  const alarms: string[] = [];
  if (balanceNgn !== null && balanceNgn < WALLET_LOW_NGN) {
    alarms.push(`text wallet low: NGN ${balanceNgn.toFixed(2)} left (alarm under NGN ${WALLET_LOW_NGN})`);
  }
  if (textsLastHour > MAX_TEXTS_PER_HOUR) {
    alarms.push(`texts jumped: ${textsLastHour} sent in the last hour (alarm over ${MAX_TEXTS_PER_HOUR})`);
  }
  return alarms;
}
