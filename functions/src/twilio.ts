import * as functions from 'firebase-functions';

export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  fromNumber: string;
  mockMode: boolean;
}

export interface SendSmsResult {
  phoneE164: string;
  sid?: string;
  error?: string;
}

function getConfig(): TwilioConfig {
  const config = functions.config();
  return {
    accountSid: config.twilio?.account_sid || process.env.TWILIO_ACCOUNT_SID || '',
    authToken: config.twilio?.auth_token || process.env.TWILIO_AUTH_TOKEN || '',
    fromNumber: config.twilio?.from_number || process.env.TWILIO_FROM_NUMBER || '',
    mockMode: (config.twilio?.mock_mode === 'true') || (process.env.TWILIO_MOCK === 'true'),
  };
}

export async function sendSms(to: string, body: string): Promise<SendSmsResult> {
  const config = getConfig();

  if (!config.accountSid || !config.authToken || !config.fromNumber) {
    console.error('Twilio config missing');
    return { phoneE164: to, error: 'Twilio not configured' };
  }

  if (config.mockMode) {
    console.log(`[TWILIO MOCK] To: ${to}, Body: ${body}`);
    return { phoneE164: to, sid: `MOCK_${Date.now()}` };
  }

  try {
    const twilio = await import('twilio');
    const client = twilio.default(config.accountSid, config.authToken);

    const message = await client.messages.create({
      to,
      from: config.fromNumber,
      body,
    });

    console.log(`SMS sent to ${to}, SID: ${message.sid}`);
    return { phoneE164: to, sid: message.sid };
  } catch (err: any) {
    console.error(`SMS failed to ${to}:`, err.message);
    return { phoneE164: to, error: err.message || 'Unknown error' };
  }
}

export async function sendSmsBatch(
  recipients: Array<{ phoneE164: string; body: string }>
): Promise<SendSmsResult[]> {
  const results: SendSmsResult[] = [];

  for (const r of recipients) {
    const result = await sendSms(r.phoneE164, r.body);
    results.push(result);
  }

  return results;
}
