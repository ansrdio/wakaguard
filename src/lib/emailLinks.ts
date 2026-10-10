import { Capacitor } from '@capacitor/core';
import type { ActionCodeSettings } from 'firebase/auth';
import { OPEN_APP_HREF, usedHereBefore } from './frontPage';

/**
 * Where the links in WakaGuard's own emails (verify your address, reset your
 * password) point, and where the page they open sends people afterwards.
 *
 * Left alone, Firebase puts the links on its own address
 * (<project>.firebaseapp.com), and the page they open ends with nowhere to
 * go. The settings here give that page a "Continue", which comes back to
 * this site.
 *
 * The page itself can be ours too: Firebase's console has a "Customize
 * action URL" setting for where the links lead. Pointed at EMAIL_LINK_PATH,
 * the address in the email is wakaguard.com and the page is EmailLinkPage,
 * which does what the link is for and then sends the person on as below.
 * Until that setting is changed, Firebase's own page does the same job.
 *
 * Someone who signed up on the website carries on in the app there. Someone
 * who signed up in the phone app is in a browser that has never run
 * WakaGuard: opening the website's copy of the app would look as if the app
 * had carried on in the browser, signed out. They go back to the phone app:
 *
 * - "Continue" in an email sent by the phone app leads to BACK_TO_APP_PATH,
 *   an address the phones are told belongs to the app (the two files in
 *   public/.well-known, the intent filter in AndroidManifest.xml and the
 *   associated domain in App.entitlements), so pressing it opens the app.
 * - Where a phone opens that address in the browser anyway, the page there
 *   has a button that opens the app (EmailDoneNotice, the app's own scheme).
 * - Emails from Android 1.2.0 build 18 lead to the website's copy of the app;
 *   the front page spots those arrivals and shows the same notice.
 *
 * The app notices by itself that the address is verified when it comes back
 * to the front (EmailVerification).
 *
 * The two files name the apps allowed to claim the address: assetlinks.json
 * by the fingerprints of Google Play's signing key and of our upload key
 * (Play Console, App signing), apple-app-site-association by Apple team and
 * bundle ID. If any of those change, the files must change with them.
 *
 * The link can only be moved to an address Firebase Hosting serves for this
 * project, which rules out Firebase's own addresses and a developer's
 * machine. For those, null: Firebase's defaults are used.
 */

/** What an email asked its reader to do. */
export type EmailTask = 'verify' | 'reset';

/** 'unknown': back from an email's page, which did not say what was done there. */
export type EmailTaskDone = EmailTask | 'unknown';

// Says which task, on the address "Continue" leads to
const TASK_PARAM = 'after';

/** The page on this site that a link in an email opens, once Firebase is told to use it. */
export const EMAIL_LINK_PATH = '/confirm';

/** The website address that opens the phone app. The apps claim this path and nothing else. */
export const BACK_TO_APP_PATH = '/open';

// The phone apps also answer to this, which works from a button where the address above did not
const APP_SCHEME = 'wakaguard';

const NOT_OURS = /(^|\.)(web\.app|firebaseapp\.com|localhost|test)$|^127\.0\.0\.1$|^\[::1\]$/;

export function emailLinkSettings(appUrl: string, task: EmailTask, fromPhoneApp: boolean): ActionCodeSettings | null {
  let host: string;
  try {
    const parsed = new URL(appUrl);
    if (parsed.protocol !== 'https:') return null;
    host = parsed.hostname;
  } catch {
    return null;
  }
  if (NOT_OURS.test(host)) return null;

  const back = fromPhoneApp ? `${BACK_TO_APP_PATH}?${TASK_PARAM}=${task}` : `${OPEN_APP_HREF}&${TASK_PARAM}=${task}`;
  return { url: `${appUrl.replace(/\/+$/, '')}${back}`, linkDomain: host };
}

/** What the address of the "back to the app" page says was done. */
export function emailTaskIn(search: string): EmailTaskDone {
  const task = new URLSearchParams(search).get(TASK_PARAM);
  return task === 'verify' || task === 'reset' ? task : 'unknown';
}

/** For a button on a web page: opens the phone app, if it is on this phone. */
export function openPhoneAppHref(task: EmailTaskDone): string {
  return `${APP_SCHEME}://open${task === 'unknown' ? '' : `?${TASK_PARAM}=${task}`}`;
}

/** A link from one of our emails, as the page it opens reads it. */
export type EmailLink =
  | { task: EmailTask; code: string; appOpens: boolean }
  // One of Firebase's other links (changing an email address, say), which its own page handles
  | { task: 'other' }
  // Not a whole link: something was lost on the way from the email
  | null;

/**
 * Reads the address Firebase builds for a link in an email:
 * ?mode=...&oobCode=...&continueUrl=...
 *
 * appOpens says whether "Open WakaGuard" will do anything. Only an app that
 * asked to come back to BACK_TO_APP_PATH answers to it; older builds and the
 * website asked for something else, or for nothing.
 */
export function emailLinkFrom(search: string, appUrl: string): EmailLink {
  const params = new URLSearchParams(search);
  const mode = params.get('mode');
  const code = params.get('oobCode');
  if (!mode || !code) return null;
  if (mode !== 'verifyEmail' && mode !== 'resetPassword') return { task: 'other' };

  let appOpens = false;
  try {
    const next = new URL(params.get('continueUrl') ?? '');
    appOpens = next.origin === new URL(appUrl).origin && next.pathname === BACK_TO_APP_PATH;
  } catch {
    // No address to continue to, or not one at all: an older build sent the email
  }
  return { task: mode === 'verifyEmail' ? 'verify' : 'reset', code, appOpens };
}

// The page an email link opens: Firebase's own address, or the same page served from ours
const EMAIL_PAGE_HOST = /(^|\.)(firebaseapp\.com|web\.app)$/;
const EMAIL_PAGE_PATH = '/__/auth/';

/**
 * What a visitor has just done on the page an email link opens, going by the
 * address they arrived at and the page they came from. null for everyone else.
 */
export function emailTaskFrom(search: string, cameFrom: string): EmailTaskDone | null {
  const params = new URLSearchParams(search);
  const task = params.get(TASK_PARAM);
  if (task === 'verify' || task === 'reset') return task;

  // Emails sent by an app built before the address said which task it was
  // (Android 1.2.0 build 18): all there is to go on is the page before this one
  if (!params.has('app')) return null;
  try {
    const from = new URL(cameFrom);
    return EMAIL_PAGE_HOST.test(from.hostname) || from.pathname.startsWith(EMAIL_PAGE_PATH) ? 'unknown' : null;
  } catch {
    return null;
  }
}

/**
 * The same, for this visitor, and only where WakaGuard has never been used in
 * this browser: that is someone whose account lives in the phone app.
 */
export function emailTaskJustDone(): EmailTaskDone | null {
  if (Capacitor.isNativePlatform() || usedHereBefore()) return null;
  return emailTaskFrom(window.location.search, document.referrer);
}
