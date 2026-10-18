/**
 * @fileoverview Throttling and delivery of Safe Trip location updates
 *
 * Shared by the foreground (browser) and background (native) location sources.
 */

/** Never send more often than this */
export const MIN_INTERVAL_MS = 30 * 1000;
/** Always send at least this often, even when not moving */
export const HEARTBEAT_MS = 2 * 60 * 1000;
/** Movement that justifies a send before the heartbeat */
export const MIN_MOVE_METERS = 50;

/** With no position for this long, a rough one from the network is asked for */
export const ROUGH_AFTER_MS = 40 * 1000;
/** How often to see whether a rough position is needed */
export const ROUGH_CHECK_MS = 20 * 1000;

export interface LocationFix {
  lat: number;
  lng: number;
  accuracy?: number | null;
}

export interface SentFix extends LocationFix {
  at: number;
}

/**
 * Decide whether a new fix is worth sending.
 * The heartbeat lets contacts tell a stationary traveller from a silent phone.
 */
export function shouldSendFix(
  prev: SentFix | null,
  next: LocationFix,
  nowMs: number,
  distanceMeters: (a: LocationFix, b: LocationFix) => number
): boolean {
  if (!Number.isFinite(next.lat) || !Number.isFinite(next.lng)) return false;
  if (!prev) return true;

  const elapsed = nowMs - prev.at;
  if (elapsed < MIN_INTERVAL_MS) return false;
  if (elapsed >= HEARTBEAT_MS) return true;
  return distanceMeters(prev, next) >= MIN_MOVE_METERS;
}

/**
 * Whether to ask the phone for a rough position. Precise positions can stop
 * coming, or never start, indoors or on a phone with weak GPS; a contact is
 * better off seeing roughly where the traveller is than nothing.
 */
export function wantsRoughFix(lastFixAtMs: number | null, nowMs: number): boolean {
  return lastFixAtMs == null || nowMs - lastFixAtMs >= ROUGH_AFTER_MS;
}

/**
 * URL of the tripLocation HTTPS function. Used by the native app, where
 * requests from the WebView are throttled once the app is in the background.
 */
export function tripLocationEndpoint(): string | null {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) return null;
  const region = process.env.NEXT_PUBLIC_FUNCTIONS_REGION || 'us-central1';
  return `https://${region}-${projectId}.cloudfunctions.net/tripLocation`;
}

/** URL of the tripAction HTTPS function: the backup route for "I've arrived" and extra time */
export function tripActionEndpoint(): string | null {
  return tripLocationEndpoint()?.replace(/\/tripLocation$/, '/tripAction') ?? null;
}

/** URL of the stopTexts HTTPS function: a contact asking for no more texts, from the trip page */
export function stopTextsEndpoint(): string | null {
  return tripLocationEndpoint()?.replace(/\/tripLocation$/, '/stopTexts') ?? null;
}
