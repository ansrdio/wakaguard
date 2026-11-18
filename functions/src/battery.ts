/**
 * @fileoverview The phone's battery during a trip (build 29)
 *
 * Phone apps from build 29 send the battery level (0 to 100) and whether it is
 * charging with each position. It is kept on the trip and its page as
 * `battery: { level, charging, atMs }`, shown to contacts on the page and put
 * in the alert texts, since a dead battery is the commonest reason a phone
 * goes quiet. Older apps send none, and nothing is shown then.
 *
 * @module battery
 */

export interface Battery {
  level: number;
  charging: boolean;
  atMs: number;
}

/** What the phone sent, checked, or null when it sent none or nonsense */
export function batteryFromPhone(level: unknown, charging: unknown, nowMs: number): Battery | null {
  if (typeof level !== 'number' || !Number.isInteger(level) || level < 0 || level > 100) return null;
  return { level, charging: charging === true, atMs: nowMs };
}

/** A reading older than this is left out of a text: it says too little about the phone now */
export const TEXT_BATTERY_MAX_AGE_MS = 60 * 60 * 1000;

/** The level for an alert text, or null when there is none or it is too old */
export function batteryForText(kept: unknown, nowMs: number): number | null {
  if (!kept || typeof kept !== 'object') return null;
  const { level, atMs } = kept as { level?: unknown; atMs?: unknown };
  if (typeof level !== 'number' || !Number.isFinite(level) || level < 0 || level > 100) return null;
  if (typeof atMs !== 'number' || nowMs - atMs > TEXT_BATTERY_MAX_AGE_MS) return null;
  return Math.round(level);
}
