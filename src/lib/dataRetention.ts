/**
 * How long the log of texts sent to a person's contacts is kept after they
 * delete their account. The server applies it (LOG_RETENTION_DAYS in
 * functions/src/accountDeletion.ts, which a test holds to this number); the
 * app and the public pages quote it.
 */
export const MESSAGE_LOG_DAYS_AFTER_DELETION = 90;
