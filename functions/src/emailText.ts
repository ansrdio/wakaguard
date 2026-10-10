/**
 * The words of WakaGuard's two account emails, and the link inside them.
 *
 * Firebase makes the one-time code and would put it on its own address
 * (<project>.firebaseapp.com). The link built here carries the same code to
 * the page on our address that knows what to do with it.
 */

import { getSetting } from './config';

export type EmailTask = 'verify' | 'reset';

/** Where the person signed up: decides where they are sent once the link has done its job. */
export type SentFrom = 'app' | 'web';

// These four have to match src/lib/emailLinks.ts and src/lib/frontPage.ts;
// functions/test/accountEmails.test.ts checks that they do
export const EMAIL_LINK_PATH = '/confirm';
export const BACK_TO_APP_PATH = '/open';
export const OPEN_APP_HREF = '/?app=1';
export const TASK_PARAM = 'after';

const MODES: Record<EmailTask, string> = { verify: 'verifyEmail', reset: 'resetPassword' };

const COMPANY_LINE = 'WakaGuard is a product of Inskriba Limited (RC 9913212).';
// brand-600 in src/app/globals.css
const BRAND_GREEN = '#11763f';

export function siteUrl(): string {
  return (getSetting('APP_BASE_URL') || 'https://wakaguard.com').replace(/\/+$/, '');
}

/** Where the page the link opens sends the person afterwards. */
export function continueUrl(site: string, task: EmailTask, from: SentFrom): string {
  return from === 'app'
    ? `${site}${BACK_TO_APP_PATH}?${TASK_PARAM}=${task}`
    : `${site}${OPEN_APP_HREF}&${TASK_PARAM}=${task}`;
}

/**
 * Our own link, carrying the one-time code out of the link Firebase generated.
 * Throws if that link has no code, which would mean Firebase changed its shape.
 */
export function ourEmailLink(firebaseLink: string, site: string, task: EmailTask, from: SentFrom): string {
  const code = new URL(firebaseLink).searchParams.get('oobCode');
  if (!code) throw new Error('The link Firebase generated has no one-time code');
  const query = new URLSearchParams({ mode: MODES[task], oobCode: code, continueUrl: continueUrl(site, task, from) });
  return `${site}${EMAIL_LINK_PATH}?${query}`;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

interface Words {
  subject: string;
  ask: string;
  button: string;
  ignore: string;
}

const WORDS: Record<EmailTask, Words> = {
  verify: {
    subject: 'Confirm your email for WakaGuard',
    ask: 'Confirm that this is your email address to finish setting up your WakaGuard account.',
    button: 'Confirm my email',
    ignore: 'If you did not sign up for WakaGuard, you can ignore this email.',
  },
  reset: {
    subject: 'Reset your WakaGuard password',
    ask: 'Someone asked to reset the password for your WakaGuard account. If that was you, choose a new one.',
    button: 'Choose a new password',
    ignore: 'If you did not ask for this, you can ignore this email. Your password stays the same.',
  },
};

export function buildAccountEmail(task: EmailTask, link: string): { subject: string; text: string; html: string } {
  const words = WORDS[task];
  const text = [
    'Hello,',
    '',
    words.ask,
    '',
    `${words.button}:`,
    link,
    '',
    words.ignore,
    '',
    COMPANY_LINE,
  ].join('\n');

  const href = escapeHtml(link);
  const html = `<!doctype html>
<html lang="en">
<body style="margin:0;padding:24px;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;">
    <tr><td style="padding:28px 24px;">
      <p style="margin:0 0 20px;font-size:20px;font-weight:700;color:${BRAND_GREEN};">WakaGuard</p>
      <p style="margin:0 0 12px;font-size:16px;line-height:24px;">Hello,</p>
      <p style="margin:0 0 24px;font-size:16px;line-height:24px;">${escapeHtml(words.ask)}</p>
      <p style="margin:0 0 24px;"><a href="${href}" style="display:inline-block;padding:14px 22px;background:${BRAND_GREEN};color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;border-radius:12px;">${escapeHtml(words.button)}</a></p>
      <p style="margin:0 0 8px;font-size:14px;line-height:20px;color:#475569;">If the button does not work, copy this address into your browser:</p>
      <p style="margin:0 0 24px;font-size:14px;line-height:20px;word-break:break-all;"><a href="${href}" style="color:#1d4ed8;">${href}</a></p>
      <p style="margin:0;font-size:14px;line-height:20px;color:#475569;">${escapeHtml(words.ignore)}</p>
    </td></tr>
  </table>
  <p style="max-width:480px;margin:16px auto 0;font-size:12px;line-height:18px;color:#64748b;text-align:center;">${escapeHtml(COMPANY_LINE)}</p>
</body>
</html>`;

  return { subject: words.subject, text, html };
}
