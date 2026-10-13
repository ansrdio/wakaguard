/**
 * Africa's Talking SMS provider
 * (https://developers.africastalking.com/docs/sms/sending/bulk).
 *
 * Settings:
 * - AFRICASTALKING_USERNAME   the application's username on Africa's Talking
 * - AFRICASTALKING_API_KEY    from the application's settings there
 * - AFRICASTALKING_SENDER_ID  the registered sender ID, 3 to 11 characters.
 *                             In Nigeria it reaches numbers with
 *                             Do-Not-Disturb on only once it is registered on
 *                             their transactional route.
 * - AFRICASTALKING_BASE_URL   only to point at a test server
 */

import { getNumberSetting, getSetting } from './config';
import type { SmsProvider } from './sms';

const DEFAULT_BASE_URL = 'https://api.africastalking.com';
const DEFAULT_TIMEOUT_MS = 15000;

/** Processed, sent or queued: the message has been taken on. Anything else is a refusal. */
const ACCEPTED_CODES = [100, 101, 102];

function getConfig() {
  return {
    username: getSetting('AFRICASTALKING_USERNAME', 'africastalking.username'),
    apiKey: getSetting('AFRICASTALKING_API_KEY', 'africastalking.api_key'),
    senderId: getSetting('AFRICASTALKING_SENDER_ID', 'africastalking.sender_id'),
    baseUrl: (getSetting('AFRICASTALKING_BASE_URL', 'africastalking.base_url') || DEFAULT_BASE_URL).replace(/\/+$/, ''),
    timeoutMs: getNumberSetting('AFRICASTALKING_TIMEOUT_MS', DEFAULT_TIMEOUT_MS),
  };
}

export const africasTalkingProvider: SmsProvider = {
  name: 'africastalking',

  configError() {
    const { username, apiKey, senderId } = getConfig();
    const missing = [
      !username && 'AFRICASTALKING_USERNAME',
      !apiKey && 'AFRICASTALKING_API_KEY',
      !senderId && 'AFRICASTALKING_SENDER_ID',
    ].filter(Boolean);
    if (missing.length > 0) return `missing ${missing.join(', ')}`;
    if (senderId.length < 3 || senderId.length > 11) {
      return 'AFRICASTALKING_SENDER_ID must be 3 to 11 characters';
    }
    return null;
  },

  async send(toE164, body) {
    const { username, apiKey, senderId, baseUrl, timeoutMs } = getConfig();

    const response = await fetch(`${baseUrl}/version1/messaging/bulk`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', apiKey },
      body: JSON.stringify({
        username,
        message: body,
        senderId,
        // Africa's Talking expects international format with the plus
        phoneNumbers: [toE164],
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

    // One recipient goes in, so one comes back. A reply of 200 can still carry
    // a refusal for that recipient (no credit, sender not registered, a line
    // with Do-Not-Disturb on), so it is the recipient's own code that counts.
    const recipient = data?.SMSMessageData?.Recipients?.[0];
    const accepted = response.ok && recipient?.messageId && ACCEPTED_CODES.includes(recipient.statusCode);
    if (!accepted) {
      const reason = recipient
        ? `${recipient.statusCode} ${recipient.status}`
        : data?.SMSMessageData?.Message || raw.slice(0, 200) || 'empty response';
      throw new Error(`Africa's Talking ${response.status}: ${reason}`);
    }
    return String(recipient.messageId);
  },
};
