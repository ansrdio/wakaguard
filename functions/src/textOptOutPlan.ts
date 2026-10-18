/**
 * The checks behind "Stop WakaGuard texts to my number" (textOptOut.ts),
 * kept apart from Firestore so they can be tested on their own.
 */

import { isValidE164 } from './safetyDelivery';
import { ID_PATTERN } from './tripLocation';

export type OptOutAction = 'stop' | 'resume';

export interface OptOutRequest {
  /** The trip link's code, which is the trip's id */
  token: string;
  /** The number the contact typed, already in full international form */
  phoneE164: string;
  action: OptOutAction;
}

/** Tries allowed from one trip link in an hour, right or wrong */
export const MAX_TRIES_PER_HOUR = 10;
const HOUR_MS = 60 * 60 * 1000;

export function readOptOutRequest(body: unknown): OptOutRequest | null {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  const { token, phoneE164 } = b;
  const action = b.action === undefined ? 'stop' : b.action;
  if (typeof token !== 'string' || !ID_PATTERN.test(token)) return null;
  if (typeof phoneE164 !== 'string' || !isValidE164(phoneE164)) return null;
  if (action !== 'stop' && action !== 'resume') return null;
  return { token, phoneE164, action };
}

/**
 * Whether this number is one of the contacts the trip's texts went to.
 * A trip that lists no contacts went to all of them (as getTrustedContacts).
 */
export function numberOnTrip(
  phoneE164: string,
  contacts: Array<{ id: string; phoneE164?: unknown }>,
  tripContactIds: unknown
): boolean {
  const ids = Array.isArray(tripContactIds) && tripContactIds.length > 0 ? new Set(tripContactIds) : null;
  return contacts.some((c) => c.phoneE164 === phoneE164 && (!ids || ids.has(c.id)));
}

/** The count of tries from one link after this one, and whether this one may go ahead */
export function nextTry(
  previous: { startMs: number; count: number } | null,
  nowMs: number
): { startMs: number; count: number; allowed: boolean } {
  const fresh = !previous || nowMs >= previous.startMs + HOUR_MS || nowMs < previous.startMs;
  const startMs = fresh ? nowMs : previous!.startMs;
  const count = (fresh ? 0 : previous!.count) + 1;
  return { startMs, count, allowed: count <= MAX_TRIES_PER_HOUR };
}
