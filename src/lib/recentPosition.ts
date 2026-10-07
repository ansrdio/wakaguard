/**
 * @fileoverview Deciding whether a position the app already holds can be sent as "where I am now"
 *
 * An SOS must not wait for GPS: the dialer takes over the screen within a
 * second, and the app may be paused before a new fix arrives. So the app keeps
 * the last position it was given and sends that with the alert, as long as it
 * is recent enough to be honest.
 *
 * No Firebase or DOM access, so this can be unit tested directly
 * (functions/test/recentPosition.test.ts).
 *
 * @module recentPosition
 */

export interface PositionFix {
  lat: number;
  lng: number;
  /** When the phone took the fix */
  atMs: number;
}

/**
 * A fix this recent is sent as the person's current location.
 * Matches LIVE_LOCATION_MS in functions/src/tripMonitor.ts, which applies the
 * same limit to a trip's last position.
 */
export const CURRENT_POSITION_MAX_AGE_MS = 5 * 60 * 1000;

/** The fix as a current location, or null if there is none or it is too old to pass off as current. */
export function currentPosition(fix: PositionFix | null, nowMs: number): { lat: number; lng: number } | null {
  if (!fix) return null;
  if (!Number.isFinite(fix.lat) || !Number.isFinite(fix.lng)) return null;
  const ageMs = nowMs - fix.atMs;
  // A clock change can make a fix look as if it is from the future; treat it as just taken
  if (ageMs > CURRENT_POSITION_MAX_AGE_MS) return null;
  return { lat: fix.lat, lng: fix.lng };
}
