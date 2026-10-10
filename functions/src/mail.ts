/**
 * Email sending with a swappable provider, for the two emails an account
 * needs: "confirm your email" and "reset your password".
 *
 * MAIL_PROVIDER selects the provider: 'brevo' or 'mock'. Left unset, WakaGuard
 * sends no email of its own and the app asks Firebase for its built-in
 * version instead (see src/lib/accountEmails.ts).
 *
 * A result with an id means the provider accepted the email. It does not mean
 * the email reached the inbox.
 */

import { getSetting } from './config';
import { brevoProvider } from './brevo';

export interface OutgoingEmail {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface MailSender {
  email: string;
  name: string;
  replyTo: string;
}

export interface MailProvider {
  name: string;
  /** Null when ready to send, otherwise a description of what is missing. */
  configError(): string | null;
  /** Resolves with the provider's message id, or throws. */
  send(email: OutgoingEmail, from: MailSender): Promise<string>;
}

/** What the mock provider was asked to send, newest last. For tests. */
export const mockOutbox: OutgoingEmail[] = [];

const mockProvider: MailProvider = {
  name: 'mock',
  configError: () => null,
  async send(email) {
    mockOutbox.push(email);
    console.log(`[MAIL MOCK] To: ${email.to}, Subject: ${email.subject}\n${email.text}`);
    return `MOCK_${Date.now()}`;
  },
};

const PROVIDERS: Record<string, MailProvider> = {
  brevo: brevoProvider,
  mock: mockProvider,
};

export function getMailSender(): MailSender {
  return {
    email: getSetting('MAIL_FROM_EMAIL'),
    name: getSetting('MAIL_FROM_NAME') || 'WakaGuard',
    replyTo: getSetting('MAIL_REPLY_TO'),
  };
}

/**
 * The provider to send with, or why there is none. "Not set up" is the normal
 * state until MAIL_PROVIDER is chosen; anything else is a mistake in the
 * settings and is logged.
 */
export function getMailProvider(): { provider: MailProvider } | { missing: string } {
  const name = getSetting('MAIL_PROVIDER').trim().toLowerCase();
  if (!name) return { missing: 'MAIL_PROVIDER is not set' };

  const provider = PROVIDERS[name];
  if (!provider) {
    console.error(`Unknown MAIL_PROVIDER "${name}"`);
    return { missing: `unknown MAIL_PROVIDER "${name}"` };
  }
  const missing = provider.configError();
  if (missing) {
    console.error(`Mail provider ${provider.name} not configured: ${missing}`);
    return { missing: `${provider.name}: ${missing}` };
  }
  return { provider };
}
