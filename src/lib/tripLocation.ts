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
 * URL of the tripLocation HTTPS function. Used by the native app, where
 * requests from the WebView are throttled once the app is in the background.
 */
export function tripLocationEndpoint(): string | null {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) return null;
  const region = process.env.NEXT_PUBLIC_FUNCTIONS_REGION || 'us-central1';
  return `https://${region}-${projectId}.cloudfunctions.net/tripLocation`;
}
