/**
 * @fileoverview The words and shapes of Invite friends (build 27), apart from
 * the server calls in referrals.ts so they can be tested on their own.
 *
 * @module referralWords
 */

import { APP_URL } from './appUrl';

export type FriendState = 'counting' | 'needs_contact' | 'qualified' | 'expired' | 'refused';

export interface FriendProgress {
  /** Their username; null once they deleted their account */
  name: string | null;
  trips: number;
  state: FriendState;
  deadlineMs: number | null;
  availableMs: number | null;
  refusal: string | null;
}

export interface ReferralBalance {
  waiting: number;
  ready: number;
  requested: number;
  paid: number;
  nextReadyMs: number | null;
}

export type CashOutProblem = 'not_open' | 'too_little' | 'open_request' | 'details';

export interface ReferralSummary {
  username: string | null;
  friends: FriendProgress[];
  balance: ReferralBalance;
  cashOut: {
    opensMs: number;
    minimum: number;
    problem: CashOutProblem | null;
    request: { amount: number; method: 'airtime' | 'bank' | null; requestedMs: number | null } | null;
  };
  invitedBy: { name: string | null } | null;
  canJoin: boolean;
  rules: {
    reward: number;
    tripsNeeded: number;
    windowDays: number;
    holdDays: number;
    perPersonMonthly: number;
  };
}

export type JoinProblem = 'too_early' | 'too_late' | 'already' | 'not_found' | 'self';
export type InviteVia = 'typed' | 'link' | 'trip';

/** Same pattern as a username (UsernameSetup, the database rules) */
export function readInviteName(value: string | null | undefined): string | null {
  const name = (value ?? '').trim().replace(/^@/, '');
  return /^[a-zA-Z][a-zA-Z0-9_]{2,19}$/.test(name) ? name : null;
}

export const inviteLink = (username: string) => `${APP_URL}/join?u=${encodeURIComponent(username)}`;

export function inviteMessage(username: string): string {
  return 'I use WakaGuard so my people know I got there safe. It\'s free. '
    + `Get it from my link, or type ${username} under "Who invited you?" when you sign up: ${inviteLink(username)}`;
}

export const naira = (amount: number) => `₦${amount.toLocaleString('en-NG')}`;

const DAY_FORMAT = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Africa/Lagos' });
/** "Tue 15 Dec", in Nigeria */
export const shortDay = (ms: number) => DAY_FORMAT.format(ms);

/** One line under a friend's name on the inviter's screen */
export function friendLine(friend: FriendProgress, rules: ReferralSummary['rules'], nowMs: number): string {
  switch (friend.state) {
    case 'counting': {
      const left = friend.deadlineMs ? Math.max(0, Math.ceil((friend.deadlineMs - nowMs) / 86_400_000)) : null;
      return `${friend.trips} of ${rules.tripsNeeded} trips`
        + (left !== null ? ` · ${left} day${left === 1 ? '' : 's'} left` : '');
    }
    case 'needs_contact':
      return `${rules.tripsNeeded} trips done. Waiting for them to add a contact`;
    case 'qualified':
      return friend.availableMs && friend.availableMs > nowMs
        ? `You earned ${naira(rules.reward)}. Ready on ${shortDay(friend.availableMs)}`
        : `You earned ${naira(rules.reward)}`;
    case 'expired':
      return `Ended: ${rules.windowDays} days passed with ${friend.trips} of ${rules.tripsNeeded} trips`;
    case 'refused':
      return friend.refusal === 'same_phone'
        ? 'Not paid: their trips came from your phone'
        : 'Not paid: their phone already earned someone a reward';
    default:
      return '';
  }
}

export function joinProblemText(problem: JoinProblem, name: string): string {
  switch (problem) {
    case 'not_found': return `No one has the username ${name}. Check the spelling.`;
    case 'self': return 'That is your own username.';
    case 'already': return 'You already said who invited you.';
    case 'too_late': return 'Who invited you can only be added in your first 7 days.';
    case 'too_early': return 'Only accounts made from 11 November 2026 can be invited.';
    default: return 'That did not work. Try again.';
  }
}

