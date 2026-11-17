/**
 * @fileoverview Remembering that an account is signed in on this phone
 *
 * Each time the app opens, Firebase checks the saved sign-in with Google
 * before it says who is signed in. On slow mobile data that takes seconds,
 * and an app that stops waiting too soon opens as if nobody were signed in
 * (testers, 16 November 2026: "it logs me out"). This note lets the app know
 * there is an account worth waiting for.
 *
 * The note only decides how long to wait. Firebase alone decides who is
 * signed in: the note is set when it reports an account and cleared when it
 * reports none.
 *
 * @module signedInHint
 */

const STORAGE_KEY = 'wakaguard_signed_in';

/** How long to wait for Firebase when nobody was signed in on this phone (a new install, or signed out) */
export const SIGNED_OUT_WAIT_MS = 5_000;

/**
 * How long to wait when someone was. Firebase allows each request 30 seconds,
 * and a start-up check can need two (a fresh token, then the account).
 */
export const SIGNED_IN_WAIT_MS = 60_000;

/** When the "Signing you in" screen adds that this takes longer on a weak connection, with a way to call for help */
export const SLOW_SIGN_IN_MS = 8_000;

/** Note what Firebase has just reported: a signed-in account, or nobody (a guest counts as nobody). */
export function noteSignedIn(signedIn: boolean): void {
  try {
    if (signedIn) window.localStorage.setItem(STORAGE_KEY, '1');
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // No storage (private browsing, or not in a browser): the app waits the short time, as before
  }
}

/** Whether an account was signed in on this phone the last time Firebase said. */
export function wasSignedIn(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

/** How long to wait for Firebase's answer before opening the app as signed out. */
export function signInWaitMs(signedInBefore: boolean): number {
  return signedInBefore ? SIGNED_IN_WAIT_MS : SIGNED_OUT_WAIT_MS;
}

/**
 * How much of that wait is left. It counts from when the page began waiting,
 * so a screen that starts listening later does not wait the whole time again.
 */
export function waitLeftMs(waitStartedAt: number, now: number, signedInBefore: boolean): number {
  return Math.max(0, waitStartedAt + signInWaitMs(signedInBefore) - now);
}
