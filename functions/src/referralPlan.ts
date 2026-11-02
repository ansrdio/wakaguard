/**
 * The rules of "Invite friends" (build 27), apart from the database so they
 * can be tested. referrals.ts applies them.
 *
 * Agreed by the owner on 18 October and 2 November 2026: the person who
 * invited earns ₦500 when the friend makes 4 real trips on 4 different days
 * within 30 days of signing up and adds a contact. It can be taken 7 days
 * later, as airtime or cash, from ₦1,000. At most 10 paid friends a month per
 * person and ₦200,000 a month in all; past either, the friend still counts
 * and is paid the next month. Nothing is paid out before Tuesday 15 December.
 *
 * Trips are written by the phone, so a trip is judged by what the server saw
 * itself wherever it can: when the trip document was made and when it ended
 * (not the times the phone gave), and how many positions arrived and how far
 * from the start they went.
 */

import { distanceMeters } from './tripPath';

const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;
// Nigeria keeps one time all year, an hour ahead of UTC
const LAGOS_OFFSET_MS = 60 * MINUTE;

export const REWARD_NAIRA = 500;
export const TRIPS_NEEDED = 4;
export const WINDOW_DAYS = 30;
export const HOLD_DAYS = 7;
export const PER_PERSON_MONTHLY = 10;
export const MONTHLY_BUDGET_NAIRA = 200_000;
export const MONTHLY_REWARDS = MONTHLY_BUDGET_NAIRA / REWARD_NAIRA;
export const MIN_CASH_OUT_NAIRA = 1_000;

export const MIN_TRIP_MS = 15 * MINUTE;
export const MIN_TRIP_METRES = 1_000;
/** A 15-minute trip sends far more than this; fewer means the phone was not really following it */
export const MIN_POSITIONS = 3;

/** How long after signing up someone can still say who invited them */
export const JOIN_WINDOW_DAYS = 7;
/**
 * Only accounts made from here count as invited: midnight starting Wednesday
 * 11 November 2026 in Nigeria, the day build 27 is due. Testers who joined
 * earlier cannot name each other.
 */
export const ACCOUNTS_FROM_MS = Date.UTC(2026, 10, 10, 23, 0);
/** Cash out opens at midnight starting Tuesday 15 December 2026 in Nigeria */
export const CASH_OUT_OPENS_MS = Date.UTC(2026, 11, 14, 23, 0);

/** A friend is followed through these */
export type ReferralState = 'counting' | 'qualified' | 'expired' | 'refused';

/** Why a friend who did everything earns nothing */
export const REFUSALS = {
  samePhone: 'same_phone',
  phoneUsed: 'phone_used',
} as const;
export type Refusal = (typeof REFUSALS)[keyof typeof REFUSALS];

// ---------------------------------------------------------------- time

/** The calendar day in Nigeria, "2026-11-12" */
export function lagosDay(ms: number): string {
  return new Date(ms + LAGOS_OFFSET_MS).toISOString().slice(0, 10);
}

/** The month in Nigeria, "2026-11" */
export function lagosMonth(ms: number): string {
  return lagosDay(ms).slice(0, 7);
}

/** Midnight starting the month after this one, in Nigeria */
function nextMonthStart(month: string): number {
  const [year, mon] = month.split('-').map(Number);
  return Date.UTC(year, mon, 1) - LAGOS_OFFSET_MS;
}

/** Midnight starting this month, in Nigeria */
export function monthStart(month: string): number {
  const [year, mon] = month.split('-').map(Number);
  return Date.UTC(year, mon - 1, 1) - LAGOS_OFFSET_MS;
}

// ---------------------------------------------------------------- joining

export type JoinProblem =
  | 'too_early' // the account is from before the programme
  | 'too_late' // more than JOIN_WINDOW_DAYS since signing up
  | 'already' // they named someone already
  | 'not_found' // nobody has that username
  | 'self'; // their own username

/**
 * Whether someone can name who invited them now. `inviterUid` is the owner
 * of the username they typed, or null when nobody has it.
 */
export function joinProblem(input: {
  uid: string;
  accountCreatedMs: number;
  alreadyJoined: boolean;
  inviterUid: string | null;
  nowMs: number;
  /** ACCOUNTS_FROM_MS, unless the local emulators try it out earlier */
  accountsFromMs?: number;
}): JoinProblem | null {
  if (input.alreadyJoined) return 'already';
  if (input.accountCreatedMs < (input.accountsFromMs ?? ACCOUNTS_FROM_MS)) return 'too_early';
  if (input.nowMs - input.accountCreatedMs > JOIN_WINDOW_DAYS * DAY) return 'too_late';
  if (!input.inviterUid) return 'not_found';
  if (input.inviterUid === input.uid) return 'self';
  return null;
}

/** What a username typed into "Who invited you?" looks like, or null. Same pattern as the database rules */
export function readUsername(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const name = value.trim().replace(/^@/, '');
  return /^[a-zA-Z][a-zA-Z0-9_]{2,19}$/.test(name) ? name : null;
}

// ---------------------------------------------------------------- trips

interface Place { lat: number; lng: number }

const isPlace = (p: unknown): p is Place =>
  !!p && Number.isFinite((p as Place).lat) && Number.isFinite((p as Place).lng);

export interface TripFacts {
  status: unknown;
  isTest: unknown;
  /** When the phone says it started and ended */
  startMs: number | null;
  endMs: number | null;
  /** When the server saw the trip made, and saw it end */
  createdMs: number;
  endedSeenMs: number;
  startLocation: unknown;
  endLocation: unknown;
  /** Recorded by the server from the positions it received */
  farthestM: unknown;
  positions: unknown;
}

export type TripProblem = 'not_arrived' | 'test' | 'too_short' | 'too_few_positions' | 'did_not_move';

/**
 * Why a trip does not count towards a friend's 4, or null when it does. A
 * real trip is not a test, lasts 15 minutes or more, moves about 1 km and is
 * ended with "I've arrived".
 */
export function tripProblem(trip: TripFacts): TripProblem | null {
  if (trip.status !== 'completed') return 'not_arrived';
  if (trip.isTest === true) return 'test';
  // The phone cannot stretch a trip past what the server saw
  const start = Math.max(trip.startMs ?? trip.createdMs, trip.createdMs);
  const end = Math.min(trip.endMs ?? trip.endedSeenMs, trip.endedSeenMs);
  if (end - start < MIN_TRIP_MS) return 'too_short';
  if (typeof trip.positions !== 'number' || trip.positions < MIN_POSITIONS) return 'too_few_positions';
  const straight = isPlace(trip.startLocation) && isPlace(trip.endLocation)
    ? distanceMeters(trip.startLocation, trip.endLocation)
    : 0;
  const farthest = typeof trip.farthestM === 'number' ? trip.farthestM : 0;
  if (Math.max(straight, farthest) < MIN_TRIP_METRES) return 'did_not_move';
  return null;
}

export interface Progress {
  joinedMs: number;
  /** Days in Nigeria with a counted trip, at most TRIPS_NEEDED of them */
  days: string[];
  /** The phones the counted trips came from, at most 10 */
  devices: string[];
}

export const deadlineOf = (joinedMs: number) => joinedMs + WINDOW_DAYS * DAY;

/**
 * Adds a counted trip that ended at `endedMs`. Null when it changes nothing:
 * a second trip on a day already counted, one after the 30 days, or one when
 * the 4 days are already there.
 */
export function addTrip(progress: Progress, endedMs: number, deviceId: unknown): Progress | null {
  if (endedMs < progress.joinedMs || endedMs >= deadlineOf(progress.joinedMs)) return null;
  const day = lagosDay(endedMs);
  if (progress.days.includes(day) || progress.days.length >= TRIPS_NEEDED) return null;
  const device = typeof deviceId === 'string' && deviceId.length > 0 && deviceId.length <= 100 ? deviceId : null;
  const devices = device && !progress.devices.includes(device) && progress.devices.length < 10
    ? [...progress.devices, device]
    : progress.devices;
  return { ...progress, days: [...progress.days, day].sort(), devices };
}

/** Every trip done; the contact is checked separately */
export const tripsDone = (progress: Pick<Progress, 'days'>) => progress.days.length >= TRIPS_NEEDED;

/**
 * Why a friend who did everything is not paid, or null. The phones their
 * trips came from must not be the inviter's, and must not have earned anyone
 * a reward already ("one payout per phone").
 */
export function refusalFor(friendDevices: string[], inviterDevices: Set<string>, devicesAlreadyPaid: Set<string>): Refusal | null {
  if (friendDevices.some((device) => inviterDevices.has(device))) return REFUSALS.samePhone;
  if (friendDevices.some((device) => devicesAlreadyPaid.has(device))) return REFUSALS.phoneUsed;
  return null;
}

// ---------------------------------------------------------------- paying

/**
 * The month a reward is paid in and when it can be taken. It is the month
 * 7 days after qualifying, or a later one when the inviter already has 10
 * that month or the month's budget is spent.
 */
export function placeReward(
  qualifiedMs: number,
  inviterCount: (month: string) => number,
  monthCount: (month: string) => number,
): { month: string; availableMs: number } {
  const heldUntil = qualifiedMs + HOLD_DAYS * DAY;
  let month = lagosMonth(heldUntil);
  // Two years ahead is far past anything real; it only keeps the loop finite
  for (let i = 0; i < 24; i++) {
    if (inviterCount(month) < PER_PERSON_MONTHLY && monthCount(month) < MONTHLY_REWARDS) break;
    month = lagosMonth(nextMonthStart(month));
  }
  return { month, availableMs: Math.max(heldUntil, monthStart(month)) };
}

export interface Reward { amount: number; availableMs: number }
export interface CashOut { amount: number; state: 'requested' | 'paid' | 'refused' }

export interface Balance {
  /** Earned, but its 7 days or its month have not come */
  waiting: number;
  /** Can be cashed out (once cash out opens) */
  ready: number;
  /** Asked for and not yet paid */
  requested: number;
  paid: number;
  /** The soonest a waiting reward can be taken */
  nextReadyMs: number | null;
}

/** What someone has earned, from their friends' rewards and their cash outs */
export function balanceOf(rewards: Reward[], cashOuts: CashOut[], nowMs: number): Balance {
  const due = rewards.filter((reward) => reward.availableMs <= nowMs);
  const later = rewards.filter((reward) => reward.availableMs > nowMs);
  const sum = (items: { amount: number }[]) => items.reduce((total, item) => total + item.amount, 0);
  const requested = sum(cashOuts.filter((c) => c.state === 'requested'));
  const paid = sum(cashOuts.filter((c) => c.state === 'paid'));
  return {
    waiting: sum(later),
    ready: Math.max(0, sum(due) - requested - paid),
    requested,
    paid,
    nextReadyMs: later.length ? Math.min(...later.map((reward) => reward.availableMs)) : null,
  };
}

export type CashOutProblem = 'not_open' | 'too_little' | 'open_request';

export function cashOutProblem(balance: Balance, nowMs: number): CashOutProblem | null {
  if (nowMs < CASH_OUT_OPENS_MS) return 'not_open';
  if (balance.requested > 0) return 'open_request';
  if (balance.ready < MIN_CASH_OUT_NAIRA) return 'too_little';
  return null;
}

export type PayTo =
  | { method: 'airtime'; phone: string }
  | { method: 'bank'; bankName: string; accountNumber: string; accountName: string };

/** A Nigerian mobile number as +234 and 10 digits, or null */
export function nigerianMobile(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const digits = value.replace(/[\s\-().]/g, '').replace(/^\+/, '');
  const local = /^0\d{10}$/.test(digits) ? digits.slice(1)
    : /^234\d{10}$/.test(digits) ? digits.slice(3)
      : null;
  return local && /^[789]/.test(local) ? `+234${local}` : null;
}

const plainText = (value: unknown, min: number, max: number): string | null => {
  if (typeof value !== 'string') return null;
  const text = value.replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim();
  return text.length >= min && text.length <= max ? text : null;
};

/** Where to send a cash out, from the app's form, or null when something is missing */
export function readPayTo(body: Record<string, unknown>): PayTo | null {
  if (body.method === 'airtime') {
    const phone = nigerianMobile(body.phone);
    return phone ? { method: 'airtime', phone } : null;
  }
  if (body.method === 'bank') {
    const bankName = plainText(body.bankName, 2, 60);
    const accountName = plainText(body.accountName, 2, 80);
    // Nigerian bank account numbers (NUBAN) are 10 digits
    const accountNumber = typeof body.accountNumber === 'string' ? body.accountNumber.replace(/\s/g, '') : '';
    return bankName && accountName && /^\d{10}$/.test(accountNumber)
      ? { method: 'bank', bankName, accountNumber, accountName }
      : null;
  }
  return null;
}

/** What is kept of a cash out's details once it is paid: enough to answer "did you pay me?" */
export function paidDetails(payTo: PayTo): Record<string, string> {
  return payTo.method === 'airtime'
    ? { method: 'airtime', phoneEnding: payTo.phone.slice(-4) }
    : { method: 'bank', bankName: payTo.bankName, accountEnding: payTo.accountNumber.slice(-4) };
}
