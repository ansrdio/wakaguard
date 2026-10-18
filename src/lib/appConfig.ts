/**
 * @fileoverview App-wide switches kept on the server, read by every phone
 *
 * One document, config/app, that only we can change (in the Firebase console
 * or with a tool): the oldest build that still works, the newest build, and a
 * notice for everyone ("Texts are delayed this morning"). It lets us reach
 * every tester and user without a new release.
 *
 * An out-of-date app is told so plainly but never locked: someone in the
 * middle of a trip must still be able to tap "I've arrived".
 *
 * No Firebase or DOM access (functions/test/appConfig.test.ts).
 *
 * @module appConfig
 */

export interface AppNotice {
  /** Changes when the notice changes, so a new one shows even after the last was dismissed */
  id: string;
  text: string;
  level: 'info' | 'warning';
}

export interface AppConfig {
  /** Builds older than this should be updated now */
  minBuild: number | null;
  /** The newest build out; older ones are told an update is ready */
  latestBuild: number | null;
  notice: AppNotice | null;
  updateUrlAndroid: string;
  updateUrlIos: string;
  /** Sign-in buttons, switched on once the Google and Apple consoles are set up (lib/socialSignIn.ts) */
  signInWith: { google: boolean; apple: boolean };
  /**
   * Turn-by-turn directions on a trip (build 25, Beta). Off unless set true,
   * so they can be hidden at once, without a new build, if they misbehave
   */
  directions: boolean;
}

export const DEFAULT_UPDATE_URL_ANDROID = 'https://play.google.com/store/apps/details?id=com.wakaguard.app';
export const DEFAULT_UPDATE_URL_IOS = 'https://testflight.apple.com/join/MXYmjkMu';
export const MAX_NOTICE_LENGTH = 280;

/** Update links may only lead to the stores or to our own site */
const UPDATE_HOSTS = ['play.google.com', 'apps.apple.com', 'testflight.apple.com', 'wakaguard.com'];

function safeUrl(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && UPDATE_HOSTS.includes(url.hostname) ? url.toString() : fallback;
  } catch {
    return fallback;
  }
}

function build(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : null;
}

/** The document's fields, checked; anything wrong is left out rather than shown */
export function readAppConfig(data: unknown): AppConfig {
  const d = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  const n = (d.notice && typeof d.notice === 'object' ? d.notice : null) as Record<string, unknown> | null;
  const text = typeof n?.text === 'string' ? n.text.trim() : '';
  const id = typeof n?.id === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(n.id) ? n.id : null;
  const notice = text && id && text.length <= MAX_NOTICE_LENGTH
    ? { id, text, level: n?.level === 'warning' ? ('warning' as const) : ('info' as const) }
    : null;
  return {
    minBuild: build(d.minBuild),
    latestBuild: build(d.latestBuild),
    notice,
    updateUrlAndroid: safeUrl(d.updateUrlAndroid, DEFAULT_UPDATE_URL_ANDROID),
    updateUrlIos: safeUrl(d.updateUrlIos, DEFAULT_UPDATE_URL_IOS),
    signInWith: {
      google: (d.signInWith as Record<string, unknown> | undefined)?.google === true,
      apple: (d.signInWith as Record<string, unknown> | undefined)?.apple === true,
    },
    directions: d.directions === true,
  };
}

export type UpdateNeed = 'required' | 'available' | 'none';

/** Whether this phone app should be updated. A website is always current. */
export function updateNeed(appBuild: number, config: AppConfig | null, isPhoneApp: boolean): UpdateNeed {
  if (!config || !isPhoneApp) return 'none';
  if (config.minBuild !== null && appBuild < config.minBuild) return 'required';
  if (config.latestBuild !== null && appBuild < config.latestBuild) return 'available';
  return 'none';
}

/** The notice to show, unless this one was already dismissed */
export function noticeToShow(config: AppConfig | null, dismissedId: string | null): AppNotice | null {
  const notice = config?.notice ?? null;
  return notice && notice.id !== dismissedId ? notice : null;
}
