/**
 * @fileoverview What a new road report may say in the notification sent to
 * everyone nearby (onReportCreate in index.ts), and how often
 *
 * Until 4 November 2026 the notification carried the report's `state` as the
 * app wrote it, and the rules took any text there, so anyone with an account
 * could write straight to the database and have WakaGuard push their own words
 * ("Account suspended, verify at …") to everyone within 10 km, as often as
 * they liked: the 5-an-hour limit lived only in the app (security review).
 * Now only known words go into it, and the limit is held on the server.
 *
 * @module reportPush
 */

import { RateLimitConfig } from './rateLimit';

/** The 36 states and the FCT, as the app names them (src/lib/nigerianStates.ts; firestore.rules too) */
export const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno', 'Cross River', 'Delta',
  'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi',
  'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto',
  'Taraba', 'Yobe', 'Zamfara',
] as const;

/** The words for each kind of report and how serious it is, as the rules allow them */
const TYPE_WORDS: Record<string, string> = {
  pothole: 'pothole', traffic: 'heavy traffic', accident: 'accident', roadwork: 'construction',
  closure: 'roadblock', hazard: 'hazard', checkpoint: 'checkpoint', other: 'road problem',
};
/** Build 26 has two levels: serious (stored as high) or not (src/lib/reportWords.ts) */
const SERIOUS = new Set(['high', 'critical']);

/** The state as the app names it, or null for anything else */
export function knownState(state: unknown): string | null {
  return typeof state === 'string' && (NIGERIAN_STATES as readonly string[]).includes(state) ? state : null;
}

/**
 * The notification's title and body, from known words only: never text the
 * reporter typed. Null when the kind of report is not one the app has.
 */
export function reportPushText(type: unknown, severity: unknown, distanceKm: number | null, state: unknown): { title: string; body: string } | null {
  const what = typeof type === 'string' ? TYPE_WORDS[type] : undefined;
  if (!what) return null;
  const serious = typeof severity === 'string' && SERIOUS.has(severity);
  const where = knownState(state);
  const near = typeof distanceKm === 'number' && Number.isFinite(distanceKm) ? `${distanceKm.toFixed(1)} km away` : 'near you';
  const said = `${serious ? 'serious ' : ''}${what}`;
  return {
    title: `New ${what} report nearby`,
    body: `${said.charAt(0).toUpperCase()}${said.slice(1)} reported ${near}${where ? ` in ${where}` : ''}`,
  };
}

/** The app's own limits on reports (src/lib/actions.ts), held on the server for the notifications they set off */
export const REPORT_PUSH_LIMITS: RateLimitConfig = { maxPerHour: 5, maxPerTypePerHour: 5, maxPerDay: 20 };
