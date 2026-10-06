/**
 * SMS sending with a swappable provider.
 *
 * SMS_PROVIDER selects the provider: 'termii', 'twilio' or 'mock'.
 * SMS_FALLBACK_PROVIDER is tried per recipient when the first one fails.
 *
 * A result with an id means the provider accepted the message. It does not
 * mean the message reached the handset.
 */

import { getSetting } from './config';
import { termiiProvider } from './termii';
import { twilioProvider } from './twilio';

export interface SmsProvider {
  name: string;
  /** Null when ready to send, otherwise a description of what is missing. */
  configError(): string | null;
  /** Resolves with the provider's message id, or throws. */
  send(toE164: string, body: string): Promise<string>;
}

export interface SendSmsResult {
  phoneE164: string;
  sid?: string;
  error?: string;
  provider?: string;
}

const mockProvider: SmsProvider = {
  name: 'mock',
  configError: () => null,
  async send(toE164, body) {
    console.log(`[SMS MOCK] To: ${toE164}, Body: ${body}`);
    return `MOCK_${Date.now()}`;
  },
};

const PROVIDERS: Record<string, SmsProvider> = {
  termii: termiiProvider,
  twilio: twilioProvider,
  mock: mockProvider,
};

function resolveProvider(name: string): SmsProvider | null {
  return PROVIDERS[name.trim().toLowerCase()] ?? null;
}

/** Providers to try, in order. */
export function getProviders(): SmsProvider[] {
  // TWILIO_MOCK predates SMS_PROVIDER and is still honoured
  const legacyMock = getSetting('TWILIO_MOCK', 'twilio.mock_mode') === 'true';
  if (legacyMock) return [mockProvider];

  const primaryName = getSetting('SMS_PROVIDER', 'sms.provider') || 'twilio';
  const fallbackName = getSetting('SMS_FALLBACK_PROVIDER', 'sms.fallback_provider');

  const providers: SmsProvider[] = [];
  const primary = resolveProvider(primaryName);
  if (primary) {
    providers.push(primary);
  } else {
    console.error(`Unknown SMS_PROVIDER "${primaryName}"`);
  }

  if (fallbackName) {
    const fallback = resolveProvider(fallbackName);
    if (!fallback) {
      console.error(`Unknown SMS_FALLBACK_PROVIDER "${fallbackName}"`);
    } else if (fallback !== primary) {
      providers.push(fallback);
    }
  }
  return providers;
}

export async function sendSms(to: string, body: string): Promise<SendSmsResult> {
  const providers = getProviders();
  if (providers.length === 0) {
    return { phoneE164: to, error: 'No SMS provider configured' };
  }

  const errors: string[] = [];
  for (const provider of providers) {
    const missing = provider.configError();
    if (missing) {
      console.error(`SMS provider ${provider.name} not configured: ${missing}`);
      errors.push(`${provider.name}: ${missing}`);
      continue;
    }

    try {
      const sid = await provider.send(to, body);
      console.log(`SMS accepted by ${provider.name} for ${to}, id: ${sid}`);
      return { phoneE164: to, sid, provider: provider.name };
    } catch (err: any) {
      const message = err?.message || 'Unknown error';
      console.error(`SMS via ${provider.name} failed for ${to}: ${message}`);
      errors.push(`${provider.name}: ${message}`);
    }
  }

  return {
    phoneE164: to,
    error: errors.join('; '),
    provider: providers[providers.length - 1].name,
  };
}

export async function sendSmsBatch(
  recipients: Array<{ phoneE164: string; body: string }>
): Promise<SendSmsResult[]> {
  // Recipients are few (a user's trusted contacts), so send them together
  return Promise.all(recipients.map((r) => sendSms(r.phoneE164, r.body)));
}
