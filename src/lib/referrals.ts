/**
 * @fileoverview Invite friends (build 27), the app's side
 *
 * Everything is counted on the server (functions/src/referrals.ts): the app
 * asks the `referrals` function and shows what it answers, rules included,
 * so the screen and the count cannot disagree. A person's invite name is
 * their username.
 *
 * Someone who opens an invite link on the website, or types a name before
 * their account is ready, has it kept on this phone until the server has it
 * (usePendingInvite).
 *
 * @module referrals
 */

import { httpsCallable } from 'firebase/functions';
import { functions } from './firebaseFunctions';
import type { CashOutProblem, InviteVia, JoinProblem, ReferralSummary } from './referralWords';
import { readInviteName } from './referralWords';

export * from './referralWords';

export type PayTo =
  | { method: 'airtime'; phone: string }
  | { method: 'bank'; bankName: string; accountNumber: string; accountName: string };

const callReferrals = (data: Record<string, unknown>) =>
  httpsCallable<Record<string, unknown>, Record<string, unknown>>(functions, 'referrals')(data).then((r) => r.data);

export async function loadReferralSummary(): Promise<ReferralSummary> {
  return (await callReferrals({ action: 'summary' })) as unknown as ReferralSummary;
}

/** "Who invited you?" */
export async function nameInviter(inviter: string, via: InviteVia): Promise<{ ok: true } | { ok: false; problem: JoinProblem }> {
  return (await callReferrals({ action: 'join', inviter, via })) as { ok: true } | { ok: false; problem: JoinProblem };
}

export async function requestCashOut(payTo: PayTo): Promise<{ ok: true; amount: number } | { ok: false; problem: CashOutProblem }> {
  return (await callReferrals({ action: 'cashOut', ...payTo })) as { ok: true; amount: number } | { ok: false; problem: CashOutProblem };
}

/** The username of the person whose trip a contact followed, for "Get WakaGuard" on the trip page */
export async function inviterFromTrip(token: string): Promise<string | null> {
  const answer = await callReferrals({ action: 'fromTrip', trip: token });
  return answer.ok === true && typeof answer.name === 'string' ? answer.name : null;
}

// ---------------------------------------------------------------- kept on this phone until sent

const PENDING_KEY = 'wakaguard_invited_by';

export function rememberInviter(name: string, via: InviteVia): void {
  try {
    window.localStorage.setItem(PENDING_KEY, JSON.stringify({ name, via }));
  } catch {
    // No storage: the friend can still type it in Invite friends
  }
}

export function pendingInviter(): { name: string; via: InviteVia } | null {
  try {
    const saved = JSON.parse(window.localStorage.getItem(PENDING_KEY) || 'null');
    const name = readInviteName(saved?.name);
    const via: InviteVia = saved?.via === 'link' || saved?.via === 'trip' ? saved.via : 'typed';
    return name ? { name, via } : null;
  } catch {
    return null;
  }
}

export function forgetInviter(): void {
  try {
    window.localStorage.removeItem(PENDING_KEY);
  } catch {
    // Nothing kept
  }
}
