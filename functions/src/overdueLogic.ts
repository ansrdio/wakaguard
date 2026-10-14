/**
 * Pure decision logic for overdue trips and safety timers.
 * No Firebase imports so it can be unit tested directly.
 */

/**
 * Time after the deadline before trusted contacts are alerted. Fifteen minutes
 * since 14 October 2026 (it was five): of 41 real beta trips over four days,
 * 13 ran past this wait, and 5 of those ended 6 to 13 minutes late. Those
 * travellers were nearly there; texting their contacts helps no one.
 */
export const OVERDUE_GRACE_MS = 15 * 60 * 1000;

/** "Your contacts will be texted in 5 minutes" goes out this long before they are */
export const LAST_WARNING_BEFORE_MS = 5 * 60 * 1000;

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
  /** When "Your contacts will be texted in 5 minutes" was sent */
  lastWarnedAtMs?: number | null;
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

export type OverdueAction = 'none' | 'warn' | 'last_warning' | 'alert';

/**
 * Decide what the monitor should do for a still-active trip or timer.
 * - 'warn': deadline passed, nudge the traveller before contacts are alerted
 * - 'last_warning': contacts are texted in LAST_WARNING_BEFORE_MS; say so.
 *   Not on a test trip, whose whole wait is shorter than that
 * - 'alert': grace period passed, alert trusted contacts
 */
export function decideOverdueAction(subject: OverdueSubject, nowMs: number): OverdueAction {
  if (subject.shouldNotifyContacts === false) return 'none';
  if (!Number.isFinite(subject.deadlineMs)) return 'none';

  const overdueByMs = nowMs - subject.deadlineMs;
  if (overdueByMs < 0) return 'none';
  if (overdueByMs > OVERDUE_MAX_AGE_MS) return 'none';

  if (overdueByMs < graceMs(subject)) {
    if (!subject.overdueWarnedAtMs) return 'warn';
    const lastWarningDue = !subject.isTest && graceMs(subject) - overdueByMs <= LAST_WARNING_BEFORE_MS;
    return lastWarningDue && !subject.lastWarnedAtMs ? 'last_warning' : 'none';
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
  // These begin after the wait before contacts are texted, which has its own
  // warnings; the first used to go out in the same minute as the alert
  return nowMs >= subject.deadlineMs + OVERDUE_GRACE_MS + (count + 1) * STILL_OPEN_EVERY_MS ? 'still_open' : 'none';
}

// -----------------------------------------------------------------------------
// A phone that has stopped sending its position
// -----------------------------------------------------------------------------

/** A phone normally reports at least every two minutes. This much silence means it has stopped. */
export const QUIET_AFTER_MS = 10 * 60 * 1000;
/** While the silence lasts, the traveller is told again this often. */
export const QUIET_NUDGE_EVERY_MS = 20 * 60 * 1000;
/** And this many times at most, for one silence. */
export const MAX_QUIET_NUDGES = 3;

export interface QuietSubject {
  /** When the trip started, in epoch ms */
  startMs: number | null;
  /** When a position last arrived (the trip's lastUpdate) */
  lastHeardMs: number | null;
  /** The trip's endsAt */
  deadlineMs: number;
  isTest?: boolean;
  /** What has been sent about the present silence. `heardMs` is the position it was sent after. */
  sent?: { heardMs?: number | null; count?: number; lastAtMs?: number | null } | null;
}

/**
 * Decide whether to tell a traveller that their phone has stopped sharing.
 *
 * Some phones close the app when it is not on the screen (seen on an Infinix
 * on 13 October 2026). The traveller cannot know: the app only says so when
 * they open it again. The server can tell, because positions stop arriving,
 * and a notification reaches the phone even when the app has been closed.
 *
 * Nothing is sent close to the trip's time or after it: the "5 minutes left"
 * and "Is your trip finished?" reminders already bring the traveller back.
 */
export function decideQuietNudge(subject: QuietSubject, nowMs: number): boolean {
  if (subject.isTest) return false;
  const heardMs = subject.lastHeardMs ?? subject.startMs;
  if (heardMs == null || !Number.isFinite(subject.deadlineMs)) return false;
  if (subject.deadlineMs - nowMs <= HEADS_UP_BEFORE_MS) return false;
  if (nowMs - heardMs < QUIET_AFTER_MS) return false;

  // A position since the last nudge ends that silence; the next one starts afresh
  const sent = subject.sent && subject.sent.heardMs === heardMs ? subject.sent : null;
  const count = sent?.count ?? 0;
  if (count === 0) return true;
  if (count >= MAX_QUIET_NUDGES) return false;
  return nowMs - (sent?.lastAtMs ?? 0) >= QUIET_NUDGE_EVERY_MS;
}

function hasAttemptsLeft(subject: OverdueSubject): boolean {
  return (subject.overdueAlertAttempts ?? 0) < MAX_ALERT_ATTEMPTS;
}

/** True when contacts were (or may have been) told the person is overdue. */
export function wasAlertDelivered(state?: string | null): boolean {
  return state === 'sent' || state === 'partial' || state === 'sending';
}
