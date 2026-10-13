/**
 * Pure decision logic for overdue trips and safety timers.
 * No Firebase imports so it can be unit tested directly.
 */

/** Time after the deadline before trusted contacts are alerted. */
export const OVERDUE_GRACE_MS = 5 * 60 * 1000;

/**
 * The same wait for a test trip. A test goes through exactly the same steps
 * as a real trip; only the waiting is shorter, so it can be tried in minutes.
 */
export const TEST_OVERDUE_GRACE_MS = 60 * 1000;

/** Deadlines older than this are treated as stale and never alerted. */
export const OVERDUE_MAX_AGE_MS = 12 * 60 * 60 * 1000;

/** How many times a failed alert is retried. */
export const MAX_ALERT_ATTEMPTS = 3;

/** A 'sending' claim older than this is assumed to have crashed. */
export const STALE_CLAIM_MS = 5 * 60 * 1000;

export type OverdueAlertState =
  | 'sending'
  | 'sent'
  | 'partial'
  | 'failed'
  | 'blocked'
  | 'no_contacts';

export interface OverdueSubject {
  /** Deadline in epoch ms (trip endsAt or timer expiresAt) */
  deadlineMs: number;
  shouldNotifyContacts?: boolean;
  overdueWarnedAtMs?: number | null;
  overdueAlertState?: OverdueAlertState | null;
  overdueAlertAttempts?: number | null;
  overdueAlertClaimedAtMs?: number | null;
  /** A test trip: same steps, shorter wait, and its texts say it is a test */
  isTest?: boolean;
}

/** How long after the deadline contacts are alerted */
export function graceMs(subject: { isTest?: boolean }): number {
  return subject.isTest ? TEST_OVERDUE_GRACE_MS : OVERDUE_GRACE_MS;
}

export type OverdueAction = 'none' | 'warn' | 'alert';

/**
 * Decide what the monitor should do for a still-active trip or timer.
 * - 'warn': deadline passed, nudge the traveller before contacts are alerted
 * - 'alert': grace period passed, alert trusted contacts
 */
export function decideOverdueAction(subject: OverdueSubject, nowMs: number): OverdueAction {
  if (subject.shouldNotifyContacts === false) return 'none';
  if (!Number.isFinite(subject.deadlineMs)) return 'none';

  const overdueByMs = nowMs - subject.deadlineMs;
  if (overdueByMs < 0) return 'none';
  if (overdueByMs > OVERDUE_MAX_AGE_MS) return 'none';

  if (overdueByMs < graceMs(subject)) {
    return subject.overdueWarnedAtMs ? 'none' : 'warn';
  }

  const state = subject.overdueAlertState;
  if (!state) return 'alert';

  if (state === 'sending') {
    const claimedAt = subject.overdueAlertClaimedAtMs ?? 0;
    const claimIsStale = nowMs - claimedAt > STALE_CLAIM_MS;
    return claimIsStale && hasAttemptsLeft(subject) ? 'alert' : 'none';
  }

  if (state === 'failed') {
    return hasAttemptsLeft(subject) ? 'alert' : 'none';
  }

  // sent, partial, blocked, no_contacts are final
  return 'none';
}

// -----------------------------------------------------------------------------
// Reminders to the traveller
// -----------------------------------------------------------------------------

/** "5 minutes left" goes out this long before a trip's time runs out. */
export const HEADS_UP_BEFORE_MS = 5 * 60 * 1000;
/** A trip shorter than this, or given this little extra time, gets no heads-up. */
export const HEADS_UP_MIN_RUN_MS = 10 * 60 * 1000;
/** A trip left open after its time is asked about this often. */
export const STILL_OPEN_EVERY_MS = 15 * 60 * 1000;
/** And this many times at most, for one deadline. */
export const MAX_STILL_OPEN_REMINDERS = 4;

export interface ReminderSubject {
  /** The trip's endsAt, in epoch ms */
  deadlineMs: number;
  /** When the deadline was set: the trip's start, or the last time it was extended. Null if unknown. */
  deadlineSetAtMs: number | null;
  isTest?: boolean;
  /** What has already been sent, and for which deadline. A new deadline starts afresh. */
  sent?: { deadlineMs?: number | null; headsUp?: boolean; stillOpenCount?: number } | null;
}

export type ReminderAction = 'none' | 'heads_up' | 'still_open';

/**
 * Decide whether a still-active trip's traveller should be nudged.
 * - 'heads_up': the time is nearly up; arrive or add time
 * - 'still_open': the time is long past and the trip was never ended
 * These are separate from the "Are you okay?" warning at the deadline itself,
 * and never touch what contacts are told.
 */
export function decideReminder(subject: ReminderSubject, nowMs: number): ReminderAction {
  // A test trip is over in minutes and has its own warning
  if (subject.isTest) return 'none';
  if (!Number.isFinite(subject.deadlineMs)) return 'none';

  const sent = subject.sent && subject.sent.deadlineMs === subject.deadlineMs ? subject.sent : null;
  const leftMs = subject.deadlineMs - nowMs;

  if (leftMs > 0) {
    if (leftMs > HEADS_UP_BEFORE_MS || sent?.headsUp) return 'none';
    // Someone who has just set, or added, a few minutes knows how long is left
    if (subject.deadlineSetAtMs == null) return 'none';
    return subject.deadlineMs - subject.deadlineSetAtMs >= HEADS_UP_MIN_RUN_MS ? 'heads_up' : 'none';
  }

  if (-leftMs > OVERDUE_MAX_AGE_MS) return 'none';
  const count = sent?.stillOpenCount ?? 0;
  if (count >= MAX_STILL_OPEN_REMINDERS) return 'none';
  return nowMs >= subject.deadlineMs + (count + 1) * STILL_OPEN_EVERY_MS ? 'still_open' : 'none';
}

function hasAttemptsLeft(subject: OverdueSubject): boolean {
  return (subject.overdueAlertAttempts ?? 0) < MAX_ALERT_ATTEMPTS;
}

/** True when contacts were (or may have been) told the person is overdue. */
export function wasAlertDelivered(state?: string | null): boolean {
  return state === 'sent' || state === 'partial' || state === 'sending';
}
