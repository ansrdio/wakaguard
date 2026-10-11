/**
 * The words of WakaGuard's two account emails, and the link inside them.
 *
 * Firebase makes the one-time code and would put it on its own address
 * (<project>.firebaseapp.com). The link built here carries the same code to
 * the page on our address that knows what to do with it.
 *
 * The link is written out as plain text, in both versions of the email, and
 * never as a button or an <a href>. Mail providers that count clicks (Brevo
 * does, and offers no way to switch it off) replace every href with an
 * address of their own. Text they leave alone, and mail apps turn an address
 * in text into a link by themselves.
 */

import { getSetting } from './config';

export type EmailTask = 'verify' | 'reset';

/** Where the person signed up: decides where they are sent once the link has done its job. */
export type SentFrom = 'app' | 'web';

// These five have to match src/lib/emailLinks.ts and src/lib/frontPage.ts;
// functions/test/accountEmails.test.ts checks that they do
export const EMAIL_LINK_PATH = '/confirm';
export const BACK_TO_APP_PATH = '/open';
export const OPEN_APP_HREF = '/?app=1';
export const TASK_PARAM = 'after';
export const FROM_PARAM = 'from';

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
 *
 * It is kept short, because it is shown in full in the email: instead of the
 * whole address to continue to, it says only whether the phone app asked.
 */
export function ourEmailLink(firebaseLink: string, site: string, task: EmailTask, from: SentFrom): string {
  const code = new URL(firebaseLink).searchParams.get('oobCode');
  if (!code) throw new Error('The link Firebase generated has no one-time code');
  const query = new URLSearchParams({ mode: MODES[task], oobCode: code });
  if (from === 'app') query.set(FROM_PARAM, 'app');
  return `${site}${EMAIL_LINK_PATH}?${query}`;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

interface Words {
  subject: string;
  ask: string;
  /** What tapping the link does, ahead of the link itself. */
  lead: string;
  ignore: string;
}

const WORDS: Record<EmailTask, Words> = {
  verify: {
    subject: 'Confirm your email for WakaGuard',
    ask: 'Confirm that this is your email address to finish setting up your WakaGuard account.',
    lead: 'To confirm it, tap this link',
    ignore: 'If you did not sign up for WakaGuard, you can ignore this email.',
  },
  reset: {
    subject: 'Reset your WakaGuard password',
    ask: 'Someone asked to reset the password for your WakaGuard account.',
    lead: 'If that was you, tap this link to choose a new one',
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
    `${words.lead}:`,
    link,
    '',
    words.ignore,
    '',
    COMPANY_LINE,
  ].join('\n');

  const shown = escapeHtml(link);
  const html = `<!doctype html>
<html lang="en">
<body style="margin:0;padding:24px;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;">
    <tr><td style="padding:28px 24px;">
      <p style="margin:0 0 20px;font-size:20px;font-weight:700;color:${BRAND_GREEN};">WakaGuard</p>
      <p style="margin:0 0 12px;font-size:16px;line-height:24px;">Hello,</p>
      <p style="margin:0 0 16px;font-size:16px;line-height:24px;">${escapeHtml(words.ask)}</p>
      <p style="margin:0 0 8px;font-size:16px;line-height:24px;font-weight:700;">${escapeHtml(words.lead)}:</p>
      <p style="margin:0 0 16px;padding:14px 16px;background:#f1f5f9;border-radius:12px;font-size:15px;line-height:22px;word-break:break-all;">${shown}</p>
      <p style="margin:0 0 24px;font-size:14px;line-height:20px;color:#475569;">If nothing happens when you tap it, copy the whole address into your browser.</p>
      <p style="margin:0;font-size:14px;line-height:20px;color:#475569;">${escapeHtml(words.ignore)}</p>
    </td></tr>
  </table>
  <p style="max-width:480px;margin:16px auto 0;font-size:12px;line-height:18px;color:#64748b;text-align:center;">${escapeHtml(COMPANY_LINE)}</p>
</body>
</html>`;

  return { subject: words.subject, text, html };
}
