/**
 * A confirmed account: an email address that was confirmed, a phone number,
 * or a sign-in through Google or Apple. Unconfirmed accounts cost nothing to
 * make by the hundred, so they may not send texts (safetyDelivery.ts) and do
 * not earn their inviter a reward (referrals.ts; security review, 4 November
 * 2026).
 */

export interface AccountFacts {
  emailVerified?: boolean;
  phoneNumber?: string | null;
  providerData?: Array<{ providerId: string }>;
}

export function isConfirmedAccount(user: AccountFacts): boolean {
  return user.emailVerified === true
    || !!user.phoneNumber
    || (user.providerData ?? []).some((p) => p.providerId !== 'password');
}
