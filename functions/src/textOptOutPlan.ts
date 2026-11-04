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

/** A text as safetyDelivery.ts logs it (safetyMessageLogs) */
export interface LoggedText {
  messageBody?: unknown;
  providerResult?: unknown;
}

/**
 * Whether one of these texts carried this link to this number and the
 * provider took it. Holding a link is not proof on its own: anyone can make a
 * link of their own and save any number as their contact, then stop, or
 * start again, texts to someone else's phone (security review, 4 November
 * 2026). Only someone WakaGuard really texted that link to may use it.
 */
export function linkWasTextedTo(texts: LoggedText[], token: string, phoneE164: string): boolean {
  const forms = [token, encodeURIComponent(token)];
  return texts.some((text) =>
    typeof text.messageBody === 'string'
    && forms.some((form) => (text.messageBody as string).includes(form))
    && Array.isArray(text.providerResult)
    && text.providerResult.some((r) =>
      r !== null && typeof r === 'object'
      && (r as { phoneE164?: unknown }).phoneE164 === phoneE164
      && !(r as { error?: unknown }).error
      && typeof (r as { sid?: unknown }).sid === 'string'
      && ((r as { sid: string }).sid).length > 0));
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
