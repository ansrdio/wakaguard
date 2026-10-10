import { Capacitor } from '@capacitor/core';
import { sendEmailVerification, sendPasswordResetEmail, type ActionCodeSettings, type User } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { auth, usingEmulators } from './firebase';
import { APP_URL } from './appUrl';
import { emailLinkSettings, type EmailTask } from './emailLinks';

/**
 * The two emails an account needs: "confirm your email" and "reset your
 * password".
 *
 * WakaGuard's own server sends them when it can (functions/src/accountEmails.ts):
 * the email is ours and so is the address of the link in it. When it cannot,
 * because no mail provider is set up, the function is not there, or it does
 * not answer, Firebase is asked to send its built-in version instead. A link
 * on Firebase's address is better than no email, since nobody can use
 * WakaGuard without verifying.
 *
 * Firebase's version goes out with our link settings (see emailLinks.ts). If
 * Firebase refuses those, it is sent again with its defaults.
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

// Long enough for a cold start, short enough that the person is not left waiting if nothing answers
const OUR_SERVER_WAIT_MS = 15000;

/** Asks our own server to send the email. False means "ask Firebase instead". */
async function sentByOurServer(name: 'sendVerificationEmail' | 'sendPasswordResetEmail', email?: string): Promise<boolean> {
  try {
    // Loaded here, not at the top: it cannot be set up while the site is built
    const { functions } = await import('./firebaseFunctions');
    const from = Capacitor.isNativePlatform() ? 'app' : 'web';
    await httpsCallable(functions, name, { timeout: OUR_SERVER_WAIT_MS })({ from, ...(email ? { email } : {}) });
    return true;
  } catch (error) {
    const code = (error as { code?: string })?.code ?? '';
    // Said on purpose, and Firebase's email on top would only add to the pile.
    // The screens already know this code and what to say for it.
    if (code === 'functions/resource-exhausted') {
      throw Object.assign(new Error('Too many emails'), { code: 'auth/too-many-requests' });
    }
    if (code === 'functions/invalid-argument') {
      throw Object.assign(new Error('Invalid email address'), { code: 'auth/invalid-email' });
    }
    console.warn(`Our own email was not sent (${code || 'no answer'}); asking Firebase for its version`);
    return false;
  }
}

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

export async function sendVerificationEmail(user: User): Promise<void> {
  if (await sentByOurServer('sendVerificationEmail')) return;
  await withOurLinks('verify', (settings) => sendEmailVerification(user, settings));
}

export async function sendPasswordReset(email: string): Promise<void> {
  if (await sentByOurServer('sendPasswordResetEmail', email)) return;
  await withOurLinks('reset', (settings) => sendPasswordResetEmail(auth, email, settings));
}
