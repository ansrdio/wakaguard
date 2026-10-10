/**
 * WakaGuard's own "confirm your email" and "reset your password" emails.
 *
 * Firebase can send these itself, but its link is on its own address
 * (<project>.firebaseapp.com) and on this project Google refuses to let that
 * be changed (EMAIL_TEMPLATE_UPDATE_NOT_ALLOWED). So Firebase is asked only
 * for the one-time code; the email, and the link in it, are ours.
 *
 * Until a mail provider is set up (MAIL_PROVIDER, see mail.ts) both functions
 * refuse with the reason 'mail-not-set-up', and the app falls back to
 * Firebase's own email.
 *
 * Nothing here logs an email address or a link: the link is as good as the
 * password until it is used.
 */

import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { buildAccountEmail, continueUrl, ourEmailLink, siteUrl, type EmailTask, type SentFrom } from './emailText';
import { getMailProvider, getMailSender, type MailProvider } from './mail';
import { checkAndIncrementRateLimit, getEmailLimitConfig } from './rateLimit';

/** The provider, or the refusal the app understands as "send Firebase's email instead". */
function mailProviderOrRefuse(): MailProvider {
  const found = getMailProvider();
  if ('provider' in found) return found.provider;
  throw new functions.https.HttpsError('failed-precondition', 'WakaGuard is not sending its own emails', {
    reason: 'mail-not-set-up',
  });
}

const sentFrom = (data: unknown): SentFrom => ((data as { from?: unknown } | null)?.from === 'app' ? 'app' : 'web');

/** True when another email may go to this account now. A failed check lets it through: no email is worse. */
async function underLimit(uid: string, task: EmailTask): Promise<boolean> {
  const limit = await checkAndIncrementRateLimit(uid, task, 1, getEmailLimitConfig(), 'email');
  return limit.allowed || limit.reason === 'error';
}

async function sendAccountEmail(provider: MailProvider, task: EmailTask, to: string, from: SentFrom): Promise<void> {
  const site = siteUrl();
  const settings = { url: continueUrl(site, task, from) };
  const firebaseLink =
    task === 'verify'
      ? await admin.auth().generateEmailVerificationLink(to, settings)
      : await admin.auth().generatePasswordResetLink(to, settings);

  const email = buildAccountEmail(task, ourEmailLink(firebaseLink, site, task, from));
  const id = await provider.send({ to, ...email }, getMailSender());
  console.log(`Account email (${task}) accepted by ${provider.name}, id: ${id}`);
}

export const sendVerificationEmail = functions
  // Switch on once App Check is registered for the app (see docs/SAFETY-ALERTS-SETUP.md)
  .runWith({ enforceAppCheck: process.env.ENFORCE_APP_CHECK === 'true' })
  .https.onCall(async (data: unknown, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
    }
    if (context.auth.token.firebase?.sign_in_provider === 'anonymous') {
      throw new functions.https.HttpsError('permission-denied', 'There is no email address to confirm');
    }
    const provider = mailProviderOrRefuse();

    const user = await admin.auth().getUser(context.auth.uid);
    if (!user.email) {
      throw new functions.https.HttpsError('failed-precondition', 'This account has no email address');
    }
    if (user.emailVerified) return { sent: false, alreadyVerified: true };

    if (!(await underLimit(user.uid, 'verify'))) {
      throw new functions.https.HttpsError('resource-exhausted', 'Too many emails. Try again later.');
    }

    try {
      await sendAccountEmail(provider, 'verify', user.email, sentFrom(data));
    } catch (error: any) {
      console.error(`Could not send the verification email: ${error?.message || error}`);
      throw new functions.https.HttpsError('unavailable', 'Could not send the email. Try again.');
    }
    return { sent: true };
  });

export const sendPasswordResetEmail = functions
  .runWith({ enforceAppCheck: process.env.ENFORCE_APP_CHECK === 'true' })
  .https.onCall(async (data: unknown) => {
    const address = (data as { email?: unknown } | null)?.email;
    if (typeof address !== 'string' || address.length > 254 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(address.trim())) {
      throw new functions.https.HttpsError('invalid-argument', 'Enter a valid email address');
    }
    const provider = mailProviderOrRefuse();

    // Whoever is asking is told the same thing whether or not the address has
    // an account, has had too many emails, or is switched off: otherwise this
    // would tell a stranger who uses WakaGuard
    const said = { sent: true };

    let user: admin.auth.UserRecord;
    try {
      user = await admin.auth().getUserByEmail(address.trim());
    } catch (error: any) {
      if (error?.code === 'auth/user-not-found') return said;
      console.error(`Could not look up the account for a password reset: ${error?.message || error}`);
      throw new functions.https.HttpsError('unavailable', 'Could not send the email. Try again.');
    }
    if (user.disabled || !user.email) return said;

    if (!(await underLimit(user.uid, 'reset'))) {
      console.warn('Password reset email not sent: this account has had too many');
      return said;
    }

    try {
      await sendAccountEmail(provider, 'reset', user.email, sentFrom(data));
    } catch (error: any) {
      console.error(`Could not send the password reset email: ${error?.message || error}`);
      throw new functions.https.HttpsError('unavailable', 'Could not send the email. Try again.');
    }
    return said;
  });
