import { connectFunctionsEmulator, getFunctions, httpsCallable } from 'firebase/functions';
import { app, EMULATOR_HOST, usingEmulators } from './firebase';

const functions = getFunctions(app);
if (usingEmulators()) {
  connectFunctionsEmulator(functions, EMULATOR_HOST, 5001);
}

// -------------------------------------------------------------------------
// Types
// -------------------------------------------------------------------------

export type SafetySmsType = 'checkin' | 'trip_share';

export interface SendCheckinRequest {
  type: 'checkin';
  message?: string;
  lat?: number;
  lng?: number;
}

export interface SendTripShareRequest {
  type: 'trip_share';
  /** The trip id, which is also its share token */
  token: string;
}

export type SendSafetySmsRequest = SendCheckinRequest | SendTripShareRequest;

export interface SendSafetySmsResponse {
  success: boolean;
  status: 'sent' | 'partial' | 'failed' | 'blocked';
  sent: number;
  failed: number;
  logId: string;
  message?: string;
}

// -------------------------------------------------------------------------
// Callable wrapper
//
// SOS and overdue alerts are not sent from here: the server sends them when
// an SOS alert is created or a trip passes its expected arrival time.
// -------------------------------------------------------------------------

const sendSafetySmsCallable = httpsCallable<SendSafetySmsRequest, SendSafetySmsResponse>(
  functions,
  'sendSafetySms'
);

export async function sendSafetySms(request: SendSafetySmsRequest): Promise<SendSafetySmsResponse> {
  const result = await sendSafetySmsCallable(request);
  return result.data;
}

export async function sendCheckinSms(
  message?: string,
  lat?: number,
  lng?: number
): Promise<SendSafetySmsResponse> {
  return sendSafetySms({ type: 'checkin', message, lat, lng });
}

export async function sendTripShareSms(token: string): Promise<SendSafetySmsResponse> {
  return sendSafetySms({ type: 'trip_share', token });
}

// -------------------------------------------------------------------------
// WhatsApp URL builders (deep links, no API)
// -------------------------------------------------------------------------

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://wakaguard.com';

function buildMapsLink(lat: number, lng: number): string {
  return `https://maps.google.com/?q=${lat},${lng}`;
}

/** Public page where contacts follow a trip. The trip id is the token. */
export function buildShareLink(token: string): string {
  return `${BASE_URL}/s?token=${encodeURIComponent(token)}`;
}

export function buildSosShareText(lat: number, lng: number, address?: string, token?: string): string {
  const parts: string[] = ['🆘 SOS: I need help!'];

  parts.push(`📍 Location: ${lat.toFixed(6)},${lng.toFixed(6)}`);
  parts.push(`🗺️ Map: ${buildMapsLink(lat, lng)}`);

  if (address) {
    parts.push(`📫 Address: ${address}`);
  }

  if (token) {
    parts.push(`🔗 Track me: ${buildShareLink(token)}`);
  }

  return parts.join('\n');
}

export function buildCheckinShareText(message?: string, lat?: number, lng?: number): string {
  const parts: string[] = ["✅ Check-in: I'm OK!"];

  if (message) {
    parts.push(message);
  }

  if (lat != null && lng != null) {
    parts.push(`🗺️ Map: ${buildMapsLink(lat, lng)}`);
  }

  return parts.join('\n');
}

export function buildTripShareText(token: string): string {
  return `🚗 Track my trip: ${buildShareLink(token)}\n(Link expires soon)`;
}

export function buildCustomShareText(message: string): string {
  return `WakaGuard: ${message}`;
}

/**
 * Open WhatsApp composer with pre-filled text (no specific recipient)
 */
export function openWhatsAppShare(text: string): void {
  const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank');
}

/**
 * Open WhatsApp chat with specific phone number and pre-filled text
 * @param phoneE164 Phone number in E.164 format (e.g., +2348012345678)
 * @param text Message text
 */
export function openWhatsAppChat(phoneE164: string, text: string): void {
  // Remove the + prefix for wa.me URL
  const digits = phoneE164.replace(/^\+/, '');
  const url = `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank');
}

// -------------------------------------------------------------------------
// E.164 validation
// -------------------------------------------------------------------------

export function isValidE164(phone: string): boolean {
  return /^\+[1-9]\d{6,14}$/.test(phone);
}

export function formatToE164(phone: string, defaultCountryCode: string = '+234'): string {
  // Remove all non-digit characters except leading +
  let cleaned = phone.replace(/[^\d+]/g, '');

  // If starts with +, assume it's already E.164
  if (cleaned.startsWith('+')) {
    return cleaned;
  }

  // If starts with 0, replace with country code
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.slice(1);
  }

  return defaultCountryCode + cleaned;
}

// -------------------------------------------------------------------------
// Share via native share API (fallback)
// -------------------------------------------------------------------------

export async function shareViaNative(title: string, text: string, url?: string): Promise<boolean> {
  if (!navigator.share) {
    return false;
  }

  try {
    await navigator.share({ title, text, url });
    return true;
  } catch (err) {
    // User cancelled or share failed
    return false;
  }
}
