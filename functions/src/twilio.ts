import { getSetting } from './config';
import type { SmsProvider } from './sms';

function getConfig() {
  return {
    accountSid: getSetting('TWILIO_ACCOUNT_SID', 'twilio.account_sid'),
    authToken: getSetting('TWILIO_AUTH_TOKEN', 'twilio.auth_token'),
    fromNumber: getSetting('TWILIO_FROM_NUMBER', 'twilio.from_number'),
  };
}

export const twilioProvider: SmsProvider = {
  name: 'twilio',

  configError() {
    const { accountSid, authToken, fromNumber } = getConfig();
    const missing = [
      !accountSid && 'TWILIO_ACCOUNT_SID',
      !authToken && 'TWILIO_AUTH_TOKEN',
      !fromNumber && 'TWILIO_FROM_NUMBER',
    ].filter(Boolean);
    return missing.length > 0 ? `missing ${missing.join(', ')}` : null;
  },

  async send(toE164, body) {
    const { accountSid, authToken, fromNumber } = getConfig();
    const twilio = await import('twilio');
    const client = twilio.default(accountSid, authToken);
    const message = await client.messages.create({ to: toE164, from: fromNumber, body });
    return message.sid;
  },
};
