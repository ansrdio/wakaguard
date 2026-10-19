/**
 * Termii SMS provider (https://developers.termii.com/messaging-api).
 *
 * Settings:
 * - TERMII_API_KEY    from the Termii dashboard
 * - TERMII_SENDER_ID  approved sender ID, 3 to 11 characters
 * - TERMII_BASE_URL   the base URL shown on your Termii dashboard
 * - TERMII_CHANNEL    'dnd' (default) or 'generic'. The dnd route is the
 *                     transactional one that reaches numbers with
 *                     Do-Not-Disturb enabled; it has to be activated on the
 *                     Termii account.
 */

import { getNumberSetting, getSetting } from './config';
import type { SmsProvider } from './sms';

const DEFAULT_BASE_URL = 'https://v3.api.termii.com';
const DEFAULT_TIMEOUT_MS = 15000;

function getConfig() {
  return {
    apiKey: getSetting('TERMII_API_KEY', 'termii.api_key'),
    senderId: getSetting('TERMII_SENDER_ID', 'termii.sender_id'),
    baseUrl: (getSetting('TERMII_BASE_URL', 'termii.base_url') || DEFAULT_BASE_URL).replace(/\/+$/, ''),
    channel: getSetting('TERMII_CHANNEL', 'termii.channel') || 'dnd',
    timeoutMs: getNumberSetting('TERMII_TIMEOUT_MS', DEFAULT_TIMEOUT_MS),
  };
}

export const termiiProvider: SmsProvider = {
  name: 'termii',

  configError() {
    const { apiKey, senderId } = getConfig();
    const missing = [
      !apiKey && 'TERMII_API_KEY',
      !senderId && 'TERMII_SENDER_ID',
    ].filter(Boolean);
    if (missing.length > 0) return `missing ${missing.join(', ')}`;
    if (senderId.length < 3 || senderId.length > 11) {
      return 'TERMII_SENDER_ID must be 3 to 11 characters';
    }
    return null;
  },

  async send(toE164, body) {
    const { apiKey, senderId, baseUrl, channel, timeoutMs } = getConfig();

    const response = await fetch(`${baseUrl}/api/sms/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        // Termii expects international format without the leading plus
        to: toE164.replace(/^\+/, ''),
        from: senderId,
        sms: body,
        type: 'plain',
        channel,
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });

    const raw = await response.text();
    let data: any = null;
    try {
      data = JSON.parse(raw);
    } catch {
      // Non-JSON error page; reported below
    }

    const messageId = data?.message_id_str || data?.message_id;
    const accepted = response.ok && messageId && (data?.code === undefined || data.code === 'ok');
    if (!accepted) {
      const reason = data?.message || raw.slice(0, 200) || 'empty response';
      throw new Error(`Termii ${response.status}: ${reason}`);
    }
    return String(messageId);
  },
};

/**
 * What is left in the Termii wallet, in naira, for the hourly text check
 * (serverWatch.ts). Null when it cannot be had; the key never leaves this call.
 */
export async function termiiBalance(): Promise<number | null> {
  const { apiKey, baseUrl, timeoutMs } = getConfig();
  if (!apiKey) return null;
  const response = await fetch(`${baseUrl}/api/get-balance?api_key=${encodeURIComponent(apiKey)}`, {
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) return null;
  const data = (await response.json().catch(() => null)) as { balance?: unknown } | null;
  const value = data?.balance;
  // A missing balance must not read as zero, which would sound the alarm
  const balance = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN;
  return Number.isFinite(balance) ? balance : null;
}
