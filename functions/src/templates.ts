/**
 * SMS message bodies.
 *
 * Every message names the traveller, because contacts receive it from a
 * shared sender ID and cannot otherwise tell who it is about. userName must
 * come from getSenderProfile(), which makes it safe to embed. Other
 * user-typed text is cleaned here.
 */

import { getSetting } from './config';
import { countSmsSegments, sanitizeForSms, sanitizeName, sanitizePlace } from './smsText';

function baseUrl(): string {
  return (getSetting('APP_BASE_URL') || 'https://wakaguard.com').replace(/\/+$/, '');
}

/** ~1 metre precision; more digits only make the message longer. */
function coord(value: number): string {
  return String(Number(value.toFixed(5)));
}

export function buildMapsLink(lat: number, lng: number): string {
  return `https://maps.google.com/?q=${coord(lat)},${coord(lng)}`;
}

// "t", not "token": on 18 October 2026 a test text sent with "s?token=..."
// arrived as "s?code=...", rewritten on the way (the word looks like a bank's
// one-time code). The contacts' page reads t, token and code.
export function buildShareLink(token: string): string {
  return `${baseUrl()}/s?t=${encodeURIComponent(token)}`;
}

/** Format a time for contacts in Nigeria, e.g. "Tue 4:30 pm". */
export function formatLagosTime(ms: number): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Lagos',
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(ms)).replace(',', '');
}

function hasLocation(p: { lat?: number | null; lng?: number | null }): p is { lat: number; lng: number } {
  return typeof p.lat === 'number' && typeof p.lng === 'number';
}

// -------------------------------------------------------------------------
// Test trips
// -------------------------------------------------------------------------

/** Put on every text sent for a test trip, right after the greeting, so nobody takes it for a real alert */
export const TEST_PREFIX = 'WAKAGUARD TEST ALERT. NOT A REAL EMERGENCY. ';

/** Label a message as a test when it belongs to a test trip */
export function markAsTest(body: string, isTest: boolean | null | undefined): string {
  return isTest ? TEST_PREFIX + body : body;
}

// -------------------------------------------------------------------------
// Who the text is to, and who it is from
// -------------------------------------------------------------------------

/**
 * The business named at the end of every text, as in the sample Termii approved
 * with the sender ID "OE Alert" on 15 October 2026. Termii requires every text
 * on that sender ID to end this way. No full stop after it.
 */
export const SIGN_OFF = 'Powered by WakaGuard';

/** The contact's name is the traveller's own label for them; keep the greeting short */
const GREETING_NAME_LENGTH = 20;

/**
 * Address a message to the person receiving it and sign it with the company's
 * name: "Hi Tobi, WakaGuard: ... Powered by WakaGuard"
 *
 * This is the format Termii requires ("Hi(name), ... Powered by(Company's
 * name)"). They rejected a sample that opened "Dear" on 12 October 2026 and
 * confirmed this one in writing; the sender ID is registered against it, and
 * the same wording is in the letters sent to the four networks. A text in any
 * other shape may not be carried.
 *
 * So every text opens the same way, whoever it is to and whatever it is
 * about: a test label comes straight after the greeting, not before it, and a
 * contact with no usable name is greeted with a plain "Hi,".
 */
export function addressTo(recipientName: unknown, body: string): string {
  const label = body.startsWith(TEST_PREFIX) ? TEST_PREFIX : '';
  const rest = body.slice(label.length);
  const name = sanitizeName(recipientName).slice(0, GREETING_NAME_LENGTH).trim();
  // A text laid out in parts keeps the sign-off on a line of its own
  const beforeSignOff = rest.includes('\n') ? '\n\n' : ' ';
  return `${name ? `Hi ${name}, ` : 'Hi, '}${label}${rest}${beforeSignOff}${SIGN_OFF}`;
}

/**
 * A text in parts: the message first, then each link under its own label,
 * separated by blank lines. Testers on 18 October 2026 found a link run into
 * the sentence around it hard to pick out, so each one stands alone.
 */
/** " Vehicle plate: KJA 12 AB." when the traveller gave one. Only the plate: the rest is on their page */
function platePart(plate: string | null | undefined): string {
  const clean = typeof plate === 'string' ? plate.toUpperCase().replace(/[^A-Z0-9 -]/g, '').trim().slice(0, 12).trim() : '';
  return clean ? ` Vehicle plate: ${clean}.` : '';
}

function inParts(message: string, links: Array<[label: string, url: string] | null>): string {
  return [message, ...links.filter((l): l is [string, string] => !!l).map(([label, url]) => `${label}:\n${url}`)].join('\n\n');
}

// -------------------------------------------------------------------------
// SOS
// -------------------------------------------------------------------------

export interface SosPayload {
  userName: string;
  lat?: number | null;
  lng?: number | null;
  /** When the location was received, if it is not from the moment of the SOS */
  locationAtMs?: number | null;
  token?: string | null;
  /** The vehicle's plate, if the traveller gave one (functions/src/vehicle.ts) */
  plate?: string | null;
}

export function buildSosMessage(p: SosPayload): string {
  const where = hasLocation(p)
    ? [p.locationAtMs ? `Last seen ${formatLagosTime(p.locationAtMs)}` : 'Location', buildMapsLink(p.lat, p.lng)] as [string, string]
    : null;
  return inParts(`WakaGuard SOS: ${p.userName} needs help.${platePart(p.plate)} Call them or 112.`, [
    where,
    p.token ? ['Follow their trip', buildShareLink(p.token)] : null,
  ]);
}

// -------------------------------------------------------------------------
// Messages the traveller chooses to send
// -------------------------------------------------------------------------

export function buildCheckinMessage(p: {
  userName: string;
  message?: string | null;
  lat?: number | null;
  lng?: number | null;
}): string {
  const note = sanitizeForSms(p.message, { maxLength: 100 });
  const message = `WakaGuard: ${p.userName} checked in and is OK.${note ? ` "${note}"` : ''}`;
  return inParts(message, [hasLocation(p) ? ['Location', buildMapsLink(p.lat, p.lng)] : null]);
}

export function buildTripShareMessage(p: {
  userName: string;
  token: string;
  destination?: string | null;
  endsAtMs?: number | null;
}): string {
  const destination = sanitizePlace(p.destination);
  const where = destination ? ` to ${destination}` : '';
  const arrival = p.endsAtMs ? ` Expected arrival ${formatLagosTime(p.endsAtMs)}.` : '';
  return inParts(`WakaGuard: ${p.userName} is sharing a trip${where} with you.${arrival}`, [
    ['Follow their trip', buildShareLink(p.token)],
  ]);
}

// -------------------------------------------------------------------------
// Server-initiated messages (overdue monitor)
// -------------------------------------------------------------------------

export interface OverduePayload {
  userName: string;
  kind: 'trip' | 'timer';
  deadlineMs: number;
  destination?: string | null;
  lat?: number | null;
  lng?: number | null;
  lastUpdateMs?: number | null;
  token?: string | null;
  /** The vehicle's plate, if the traveller gave one (functions/src/vehicle.ts) */
  plate?: string | null;
}

/** Pages an alert may take. The plate is left out of a text it would push past this; it is on the page anyway */
const MAX_ALERT_SEGMENTS = 2;

export function buildOverdueMessage(p: OverduePayload): string {
  const withPlate = overdueText(p);
  return p.plate && countSmsSegments(withPlate) > MAX_ALERT_SEGMENTS ? overdueText({ ...p, plate: null }) : withPlate;
}

function overdueText(p: OverduePayload): string {
  const due = formatLagosTime(p.deadlineMs);
  let message: string;
  if (p.kind === 'trip') {
    const destination = sanitizePlace(p.destination);
    const where = destination ? ` to ${destination}` : '';
    message = `WakaGuard: ${p.userName} has not checked in from a trip${where}, due ${due}.`;
  } else {
    message = `WakaGuard: ${p.userName} set a safety timer and has not checked in, due ${due}.`;
  }
  if (!hasLocation(p) && p.kind === 'trip') message += ' No location was received.';
  message += platePart(p.plate);
  message += ' Please call them.';

  const where = hasLocation(p)
    ? [p.lastUpdateMs ? `Last seen ${formatLagosTime(p.lastUpdateMs)}` : 'Last location', buildMapsLink(p.lat, p.lng)] as [string, string]
    : null;
  return inParts(message, [where, p.token ? ['Follow their trip', buildShareLink(p.token)] : null]);
}

/**
 * 'arrived' is the text the traveller asked for when starting the trip
 * ("Text them when I arrive"); the others follow an alert.
 */
export type AllClearReason = 'ended' | 'extended' | 'checked_in' | 'sos_ended' | 'arrived';

export function buildAllClearMessage(p: {
  userName: string;
  reason: AllClearReason;
  newDeadlineMs?: number | null;
  destination?: string | null;
}): string {
  if (p.reason === 'arrived') {
    const destination = sanitizePlace(p.destination);
    return `WakaGuard: ${p.userName} has arrived safely and ended their trip${destination ? ` to ${destination}` : ''}.`;
  }
  if (p.reason === 'extended' && p.newDeadlineMs) {
    return `WakaGuard: ${p.userName} has checked in and extended the trip. New expected arrival ${formatLagosTime(p.newDeadlineMs)}.`;
  }
  if (p.reason === 'ended') {
    return `WakaGuard: ${p.userName} has checked in and ended the trip safely.`;
  }
  if (p.reason === 'sos_ended') {
    // Ending a trip after an SOS could be done under pressure, so do not
    // tell contacts everything is fine
    return `WakaGuard: ${p.userName} ended the SOS alert in the app. Please call them to confirm they are safe.`;
  }
  return `WakaGuard: ${p.userName} has checked in safely.`;
}
