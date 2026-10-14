/**
 * @fileoverview Why a phone is not giving WakaGuard a position, in plain words
 *
 * A trip with no position used to say only "No location sent yet". The phone
 * can say more: whether its own location switch is on, and whether WakaGuard
 * is allowed to use it. This turns that into what to tell the traveller and
 * what to offer them.
 *
 * @module locationCheck
 */

import { Capacitor, registerPlugin } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import type { BackgroundGeolocationPlugin } from '@capacitor-community/background-geolocation';
import type { LocationStatus } from './tripPlanning';

export type LocationPermission = 'granted' | 'approximate' | 'denied' | 'ask' | 'unknown';

/** What the phone itself reports. `switchedOn` is null when it cannot be told (a browser). */
export interface PhoneLocation {
  permission: LocationPermission;
  switchedOn: boolean | null;
}

export interface LocationAdvice {
  tone: 'fine' | 'problem';
  text: string;
  /** What to offer: the phone's settings, the permission question, or the check screen. */
  action: 'settings' | 'ask' | 'check' | null;
}

/**
 * What to say about a trip's location, given what the server last received
 * (`status`) and what the phone reports (`phone`, null before it has answered
 * or when another phone is the one sending).
 */
export function adviseOnLocation(
  status: LocationStatus,
  phone: PhoneLocation | null,
  inPhoneApp: boolean,
): LocationAdvice {
  const plain: LocationAdvice = { tone: status.state === 'fresh' ? 'fine' : 'problem', text: status.text, action: null };
  if (!phone) return plain;

  if (phone.switchedOn === false) {
    return {
      tone: 'problem',
      text: 'Location is switched off on this phone, so your contacts cannot see where you are. Turn it on in your phone\'s settings.',
      action: 'check',
    };
  }
  if (phone.permission === 'denied') {
    return {
      tone: 'problem',
      text: inPhoneApp
        ? 'WakaGuard is not allowed to use your location, so your contacts cannot see where you are. Allow it in settings.'
        : 'This browser is not allowed to share your location, so your contacts cannot see where you are. Allow it for wakaguard.com in the browser\'s settings.',
      action: inPhoneApp ? 'settings' : 'check',
    };
  }
  if (phone.permission === 'ask') {
    return {
      tone: 'problem',
      text: 'WakaGuard has not been allowed to use your location yet, so your contacts cannot see where you are.',
      action: 'ask',
    };
  }
  if (status.state === 'none') {
    return {
      tone: 'problem',
      text: 'Waiting for your phone to find where you are. It is quicker outdoors or near a window.',
      action: 'check',
    };
  }
  if (status.state === 'stale') return { ...plain, action: 'check' };
  if (phone.permission === 'approximate') {
    return {
      tone: 'problem',
      text: 'Sharing only roughly where you are. For your exact position, turn on precise location for WakaGuard in settings.',
      action: inPhoneApp ? 'settings' : null,
    };
  }
  return plain;
}

/** Asks the phone (or the browser) what it allows. Never throws. */
export async function readPhoneLocation(): Promise<PhoneLocation> {
  if (Capacitor.isNativePlatform()) {
    try {
      const status = await Geolocation.checkPermissions();
      const permission: LocationPermission =
        status.location === 'granted' ? 'granted'
          : status.coarseLocation === 'granted' ? 'approximate'
            : status.location === 'denied' ? 'denied'
              : 'ask';
      return { permission, switchedOn: true };
    } catch (error) {
      // The plugin refuses to answer while the phone's own location switch is off
      const off = /not enabled|disabled/i.test(String((error as { message?: string })?.message));
      return { permission: 'unknown', switchedOn: off ? false : null };
    }
  }
  try {
    const result = await navigator.permissions.query({ name: 'geolocation' });
    const permission: LocationPermission =
      result.state === 'granted' ? 'granted' : result.state === 'denied' ? 'denied' : 'ask';
    return { permission, switchedOn: null };
  } catch {
    return { permission: 'unknown', switchedOn: null };
  }
}

/** Shows the phone's own permission question (or the browser's). */
export async function askForLocation(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    await Geolocation.requestPermissions().catch(() => {});
    return;
  }
  await new Promise<void>((resolve) => {
    navigator.geolocation.getCurrentPosition(() => resolve(), () => resolve(), { timeout: 10000 });
  });
}

/** Opens WakaGuard's page in the phone's settings. Does nothing in a browser. */
export async function openPhoneSettings(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  await registerPlugin<BackgroundGeolocationPlugin>('BackgroundGeolocation').openSettings().catch(() => {});
}

export interface FixResult {
  found: boolean;
  seconds: number;
  /** How far out the position may be, in metres. */
  accuracy: number | null;
}

/** Tries once to find the phone, precisely or roughly, and reports how it went (never where). */
export function tryForPosition(precise: boolean, timeoutMs = 20000): Promise<FixResult> {
  const startedAt = Date.now();
  const seconds = () => Math.round((Date.now() - startedAt) / 1000);
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve({ found: false, seconds: 0, accuracy: null });
      return;
    }
    // Some phones never answer at all, so the wait has its own limit
    const giveUp = setTimeout(() => resolve({ found: false, seconds: seconds(), accuracy: null }), timeoutMs + 2000);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        clearTimeout(giveUp);
        resolve({ found: true, seconds: seconds(), accuracy: Math.round(position.coords.accuracy) });
      },
      () => {
        clearTimeout(giveUp);
        resolve({ found: false, seconds: seconds(), accuracy: null });
      },
      { enableHighAccuracy: precise, maximumAge: 0, timeout: timeoutMs },
    );
  });
}

export interface FoundPosition {
  lat: number;
  lng: number;
  /** How far out the position may be, in metres */
  accuracy: number;
  /** True when it places the phone in a neighbourhood, not at a spot on a road */
  rough: boolean;
}

/** Past this many metres a position is a neighbourhood, not a spot on a road */
export const ROUGH_FROM_METRES = 200;

const secondsWord = (seconds: number) => `${seconds} second${seconds === 1 ? '' : 's'}`;

/**
 * One try at a position, in words for the check screen. A position found but
 * rougher than ROUGH_FROM_METRES is not counted as good: a tester's phone
 * found itself only to within 2,900 m (13 October 2026), which is too far out
 * for a contact to find anyone, and the screen gave it a green tick.
 */
export function describeFix(result: FixResult | null): { text: string; good: boolean | null } {
  if (!result) return { text: 'Looking…', good: null };
  if (!result.found) return { text: result.seconds < 1 ? 'Not found' : `Not found after ${secondsWord(result.seconds)}`, good: false };
  if (result.accuracy == null) return { text: `Found in ${secondsWord(result.seconds)}`, good: true };
  const rough = result.accuracy > ROUGH_FROM_METRES;
  const within = `to within ${result.accuracy.toLocaleString('en-GB')} m`;
  return {
    text: `Found in ${secondsWord(result.seconds)}, ${rough ? `but only ${within}` : within}`,
    good: !rough,
  };
}

function positionOnce(precise: boolean, timeoutMs: number): Promise<GeolocationPosition | null> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve(null);
      return;
    }
    // Some phones never answer at all, so the wait has its own limit
    const giveUp = setTimeout(() => resolve(null), timeoutMs + 2000);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        clearTimeout(giveUp);
        resolve(position);
      },
      () => {
        clearTimeout(giveUp);
        resolve(null);
      },
      // A rough position a minute old is still the right neighbourhood
      { enableHighAccuracy: precise, maximumAge: precise ? 0 : 60000, timeout: timeoutMs },
    );
  });
}

/**
 * Where the phone is, for pinning something to the map. Tries for an exact
 * position and settles for a rough one, which a person can then correct by
 * hand; null when the phone gives neither.
 */
export async function findPosition(preciseMs = 12000, roughMs = 8000): Promise<FoundPosition | null> {
  const position = (await positionOnce(true, preciseMs)) ?? (await positionOnce(false, roughMs));
  if (!position) return null;
  const accuracy = Math.round(position.coords.accuracy);
  return {
    lat: position.coords.latitude,
    lng: position.coords.longitude,
    accuracy,
    rough: accuracy > ROUGH_FROM_METRES,
  };
}
