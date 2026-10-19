/**
 * How long the log of texts sent to a person's contacts is kept after they
 * delete their account. The server applies it (LOG_RETENTION_DAYS in
 * functions/src/accountDeletion.ts, which a test holds to this number); the
 * app and the public pages quote it.
 */
export const MESSAGE_LOG_DAYS_AFTER_DELETION = 90;

/**
 * How long other records are kept before the server's daily deletion removes
 * them (KEEP_DAYS in functions/src/retentionPlan.ts, which a test holds to
 * these numbers). Agreed with the owner on 18 October 2026.
 */
export const KEPT_DAYS = {
  /** A trip in the account, after its link stopped working */
  endedTrip: 90,
  /** The page contacts open, after its link stopped working */
  tripPage: 7,
  /** SOS alerts and checkpoint stops */
  sosAndCheckIns: 90,
  /** The log of texts sent to contacts */
  textLog: 90,
  /** An expired or resolved road report, with its photos, comments and votes, after it expired */
  oldReport: 90,
  /** A removed comment, after it was posted */
  removedComment: 30,
} as const;

/** How long each daily backup of the database is kept (ops/setup-safety.mjs BACKUP_KEEP_DAYS) */
export const BACKUP_DAYS = 7;
