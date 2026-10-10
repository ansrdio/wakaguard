import { Capacitor } from '@capacitor/core';
import type { ActionCodeSettings } from 'firebase/auth';
import { OPEN_APP_HREF, usedHereBefore } from './frontPage';

/**
 * Where the links in WakaGuard's own emails (verify your address, reset your
 * password) point, and where the page they open sends people afterwards.
 *
 * Left alone, Firebase puts the links on its own address
 * (<project>.firebaseapp.com), and the page they open ends with nowhere to
 * go. With these settings the link is on our address, and the page offers
 * "Continue", which comes back to this site.
 *
 * Someone who signed up on the website carries on in the app there. Someone
 * who signed up in the phone app is in a browser that has never run
 * WakaGuard: opening the website's copy of the app would look as if the app
 * had carried on in the browser, signed out. They are told to go back to the
 * phone app instead (EmailDoneNotice).
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

const NOT_OURS = /(^|\.)(web\.app|firebaseapp\.com|localhost|test)$|^127\.0\.0\.1$|^\[::1\]$/;

export function emailLinkSettings(appUrl: string, task: EmailTask): ActionCodeSettings | null {
  let host: string;
  try {
    const parsed = new URL(appUrl);
    if (parsed.protocol !== 'https:') return null;
    host = parsed.hostname;
  } catch {
    return null;
  }
  if (NOT_OURS.test(host)) return null;

  return { url: `${appUrl.replace(/\/+$/, '')}${OPEN_APP_HREF}&${TASK_PARAM}=${task}`, linkDomain: host };
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
