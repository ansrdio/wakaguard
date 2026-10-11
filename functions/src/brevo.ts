/**
 * Brevo email provider (https://developers.brevo.com/reference/sendtransacemail).
 *
 * Settings:
 * - BREVO_API_KEY    from Brevo, under SMTP & API > API keys
 * - MAIL_FROM_EMAIL  the address the emails come from. Its domain has to be
 *                    authenticated in Brevo (Senders, Domains & Dedicated IPs)
 *                    or the emails are rejected or land in spam.
 * - MAIL_FROM_NAME   shown beside it; 'WakaGuard' unless set
 * - MAIL_REPLY_TO    where replies go, if not to the sender
 *
 * Brevo counts clicks by swapping every link (<a href>) in an email for one
 * on its own address, and has no setting to stop that for emails sent this
 * way. That is the very thing these emails exist to avoid, so they hold their
 * link as plain text, which Brevo leaves alone (see emailText.ts).
 */

import { getNumberSetting, getSetting } from './config';
import type { MailProvider } from './mail';

const API_URL = 'https://api.brevo.com/v3/smtp/email';
const DEFAULT_TIMEOUT_MS = 15000;

export const brevoProvider: MailProvider = {
  name: 'brevo',

  configError() {
    const missing = [
      !getSetting('BREVO_API_KEY') && 'BREVO_API_KEY',
      !getSetting('MAIL_FROM_EMAIL') && 'MAIL_FROM_EMAIL',
    ].filter(Boolean);
    return missing.length > 0 ? `missing ${missing.join(', ')}` : null;
  },

  async send(email, from) {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'api-key': getSetting('BREVO_API_KEY'),
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        sender: { name: from.name, email: from.email },
        to: [{ email: email.to }],
        ...(from.replyTo ? { replyTo: { email: from.replyTo } } : {}),
        subject: email.subject,
        htmlContent: email.html,
        textContent: email.text,
      }),
      signal: AbortSignal.timeout(getNumberSetting('BREVO_TIMEOUT_MS', DEFAULT_TIMEOUT_MS)),
    });

    const raw = await response.text();
    let data: any = null;
    try {
      data = JSON.parse(raw);
    } catch {
      // Non-JSON error page; reported below
    }

    if (!response.ok || !data?.messageId) {
      const reason = data?.message || raw.slice(0, 200) || 'empty response';
      throw new Error(`Brevo ${response.status}: ${reason}`);
    }
    return String(data.messageId);
  },
};
