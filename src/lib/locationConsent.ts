/**
 * @fileoverview Whether this phone has been told how a trip uses its location
 *
 * Google Play asks for this to be said in the app itself, before the phone's
 * own permission question, and agreed to. It is shown once, before the first
 * trip started on this phone.
 *
 * @module locationConsent
 */

const KEY = 'wakaguard_location_explained';

export function hasSeenLocationExplanation(): boolean {
  try {
    return window.localStorage.getItem(KEY) === '1';
  } catch {
    // No storage to remember it in: do not ask before every single trip
    return true;
  }
}

export function rememberLocationExplanation(): void {
  try {
    window.localStorage.setItem(KEY, '1');
  } catch {
    // Nothing to do; it will be shown again
  }
}
