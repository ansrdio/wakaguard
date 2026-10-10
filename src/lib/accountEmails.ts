import { Capacitor } from '@capacitor/core';
import { sendEmailVerification, sendPasswordResetEmail, type ActionCodeSettings, type User } from 'firebase/auth';
import { auth, usingEmulators } from './firebase';
import { APP_URL } from './appUrl';
import { emailLinkSettings, type EmailTask } from './emailLinks';

/**
 * The two emails WakaGuard asks Firebase to send: "verify your address" and
 * "reset your password". Both go out with our own link settings (see
 * emailLinks.ts).
 *
 * If Firebase refuses those settings, the email is sent again with its
 * defaults: a link on Firebase's address is better than no email, since
 * nobody can use WakaGuard without verifying.
 */

// What Firebase answers when it does not accept the link settings themselves
const SETTINGS_REFUSED = [
  'auth/invalid-continue-uri',
  'auth/unauthorized-continue-uri',
  'auth/missing-continue-uri',
  'auth/invalid-hosting-link-domain',
  'auth/invalid-dynamic-link-domain',
  'auth/argument-error',
];

async function withOurLinks(task: EmailTask, send: (settings?: ActionCodeSettings) => Promise<void>): Promise<void> {
  const settings = usingEmulators() ? null : emailLinkSettings(APP_URL, task, Capacitor.isNativePlatform());
  if (settings) {
    try {
      await send(settings);
      return;
    } catch (error) {
      const code = (error as { code?: string })?.code ?? '';
      if (!SETTINGS_REFUSED.includes(code)) throw error;
      console.error(`Firebase refused our email link settings (${code}); sending with its defaults`);
    }
  }
  await send();
}

export function sendVerificationEmail(user: User): Promise<void> {
  return withOurLinks('verify', (settings) => sendEmailVerification(user, settings));
}

export function sendPasswordReset(email: string): Promise<void> {
  return withOurLinks('reset', (settings) => sendPasswordResetEmail(auth, email, settings));
}
