/**
 * SMS message bodies.
 *
 * Every message names the traveller, because contacts receive it from a
 * shared sender ID and cannot otherwise tell who it is about. userName must
 * come from getSenderProfile(), which makes it safe to embed. Other
 * user-typed text is cleaned here.
 */

import { getSetting } from './config';
import { sanitizeForSms, sanitizePlace } from './smsText';

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

export function buildShareLink(token: string): string {
  return `${baseUrl()}/s?token=${encodeURIComponent(token)}`;
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

/** Starts every text sent for a test trip, so nobody takes it for a real alert */
export const TEST_PREFIX = 'WAKAGUARD TEST ALERT. NOT A REAL EMERGENCY. ';

/** Label a message as a test when it belongs to a test trip */
export function markAsTest(body: string, isTest: boolean | null | undefined): string {
  return isTest ? TEST_PREFIX + body : body;
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
}

export function buildSosMessage(p: SosPayload): string {
  const parts: string[] = [`WakaGuard SOS: ${p.userName} needs help.`];

  if (hasLocation(p)) {
    const label = p.locationAtMs
      ? `Last known location (${formatLagosTime(p.locationAtMs)})`
      : 'Location';
    parts.push(`${label}: ${buildMapsLink(p.lat, p.lng)}`);
  }

  if (p.token) {
    parts.push(`Track: ${buildShareLink(p.token)}`);
  }

  parts.push('Call them or 112.');
  return parts.join(' ');
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
  const parts: string[] = [`WakaGuard: ${p.userName} checked in and is OK.`];

  const note = sanitizeForSms(p.message, { maxLength: 100 });
  if (note) parts.push(`"${note}"`);

  if (hasLocation(p)) {
    parts.push(`Location: ${buildMapsLink(p.lat, p.lng)}`);
  }

  return parts.join(' ');
}

export function buildTripShareMessage(p: {
  userName: string;
  token: string;
  destination?: string | null;
  endsAtMs?: number | null;
}): string {
  const destination = sanitizePlace(p.destination);
  const where = destination ? ` to ${destination}` : '';
  const parts: string[] = [`WakaGuard: ${p.userName} is sharing a trip${where} with you.`];

  if (p.endsAtMs) {
    parts.push(`Expected arrival ${formatLagosTime(p.endsAtMs)}.`);
  }

  parts.push(`Follow it: ${buildShareLink(p.token)}`);
  return parts.join(' ');
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
}

export function buildOverdueMessage(p: OverduePayload): string {
  const due = formatLagosTime(p.deadlineMs);
  const parts: string[] = [];

  if (p.kind === 'trip') {
    const destination = sanitizePlace(p.destination);
    const where = destination ? ` to ${destination}` : '';
    parts.push(`WakaGuard: ${p.userName} has not checked in from a trip${where}, due ${due}.`);
  } else {
    parts.push(`WakaGuard: ${p.userName} set a safety timer and has not checked in, due ${due}.`);
  }

  if (hasLocation(p)) {
    const seen = p.lastUpdateMs ? ` received ${formatLagosTime(p.lastUpdateMs)}` : '';
    parts.push(`Last location${seen}: ${buildMapsLink(p.lat, p.lng)}`);
  } else if (p.kind === 'trip') {
    parts.push('No location was received.');
  }

  if (p.token) {
    parts.push(`Track: ${buildShareLink(p.token)}`);
  }

  parts.push('Please call them.');
  return parts.join(' ');
}

export type AllClearReason = 'ended' | 'extended' | 'checked_in' | 'sos_ended';

export function buildAllClearMessage(p: {
  userName: string;
  reason: AllClearReason;
  newDeadlineMs?: number | null;
}): string {
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
