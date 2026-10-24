/**
 * @fileoverview Android's "Allow WakaGuard to always run in the background?"
 *
 * Asked once, after the first trip starts, and from "Keep WakaGuard running"
 * at any time (android/app/src/main/java/com/wakaguard/app/KeepRunningPlugin.java).
 * An iPhone needs nothing here: the trip's location watcher already asks iOS
 * for "Always". Builds before 25 have no plugin, and everything here answers
 * null for them, on an iPhone and on the website.
 *
 * @module keepRunningPermission
 */

import { Capacitor, registerPlugin } from '@capacitor/core';

interface KeepRunningPlugin {
  status(): Promise<{ allowed: boolean }>;
  ask(): Promise<{ allowed: boolean }>;
}

const KeepRunning = registerPlugin<KeepRunningPlugin>('KeepRunning');

const ASKED_KEY = 'wakaguard_asked_keep_running';

/** True only in the Android app from build 25 */
export function canAskToKeepRunning(): boolean {
  return Capacitor.getPlatform() === 'android' && Capacitor.isPluginAvailable('KeepRunning');
}

/** Whether WakaGuard may run without battery limits; null where it cannot be asked */
export async function keepRunningAllowed(): Promise<boolean | null> {
  if (!canAskToKeepRunning()) return null;
  try {
    return (await KeepRunning.status()).allowed;
  } catch {
    return null;
  }
}

/** Shows Android's question; the answer, or null where it cannot be asked */
export async function askToKeepRunning(): Promise<boolean | null> {
  if (!canAskToKeepRunning()) return null;
  try {
    return (await KeepRunning.ask()).allowed;
  } catch {
    return null;
  }
}

/** True when the question should follow this trip: Android, not yet allowed, never asked */
export async function shouldAskAfterTrip(): Promise<boolean> {
  if (!canAskToKeepRunning() || askedBefore()) return false;
  return (await keepRunningAllowed()) === false;
}

function askedBefore(): boolean {
  try {
    return window.localStorage.getItem(ASKED_KEY) !== null;
  } catch {
    return false;
  }
}

/** Remembered, so the question after a trip comes only once */
export function rememberAsked(): void {
  try {
    window.localStorage.setItem(ASKED_KEY, new Date().toISOString());
  } catch {
    // Not remembered: it may be asked again after the next trip
  }
}
