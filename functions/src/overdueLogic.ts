/**
 * Pure decision logic for overdue trips and safety timers.
 * No Firebase imports so it can be unit tested directly.
 */

/** Time after the deadline before trusted contacts are alerted. */
export const OVERDUE_GRACE_MS = 5 * 60 * 1000;

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

  if (overdueByMs < OVERDUE_GRACE_MS) {
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

function hasAttemptsLeft(subject: OverdueSubject): boolean {
  return (subject.overdueAlertAttempts ?? 0) < MAX_ALERT_ATTEMPTS;
}

/** True when contacts were (or may have been) told the person is overdue. */
export function wasAlertDelivered(state?: string | null): boolean {
  return state === 'sent' || state === 'partial' || state === 'sending';
}
