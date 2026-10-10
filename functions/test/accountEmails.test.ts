import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import * as server from '../src/emailText';
import { buildAccountEmail, continueUrl, ourEmailLink } from '../src/emailText';
import { getMailProvider, getMailSender } from '../src/mail';
import { BACK_TO_APP_PATH, EMAIL_LINK_PATH, emailLinkFrom, emailLinkSettings, emailTaskIn } from '../../src/lib/emailLinks';
import { OPEN_APP_HREF } from '../../src/lib/frontPage';

const ENV_KEYS = ['MAIL_PROVIDER', 'BREVO_API_KEY', 'MAIL_FROM_EMAIL', 'MAIL_FROM_NAME', 'MAIL_REPLY_TO', 'APP_BASE_URL'];
const realFetch = globalThis.fetch;
const SITE = 'https://wakaguard.com';

beforeEach(() => {
  for (const key of ENV_KEYS) delete process.env[key];
});
afterEach(() => {
  globalThis.fetch = realFetch;
});

test('the server and the site agree on the addresses', () => {
  assert.equal(server.EMAIL_LINK_PATH, EMAIL_LINK_PATH);
  assert.equal(server.BACK_TO_APP_PATH, BACK_TO_APP_PATH);
  assert.equal(server.OPEN_APP_HREF, OPEN_APP_HREF);
  // Where the server says to continue is where the app itself would have said
  for (const task of ['verify', 'reset'] as const) {
    assert.equal(continueUrl(SITE, task, 'app'), emailLinkSettings(SITE, task, true)?.url);
    assert.equal(continueUrl(SITE, task, 'web'), emailLinkSettings(SITE, task, false)?.url);
  }
});

test("our link carries Firebase's one-time code to our own page", () => {
  const fromFirebase =
    'https://routepulse-5701f.firebaseapp.com/__/auth/action?mode=verifyEmail&oobCode=AbC-123_x&apiKey=the-web-key&continueUrl=https%3A%2F%2Fwakaguard.com%2Fopen%3Fafter%3Dverify&lang=en';
  const link = ourEmailLink(fromFirebase, SITE, 'verify', 'app');

  const url = new URL(link);
  assert.equal(url.origin + url.pathname, 'https://wakaguard.com/confirm');
  assert.equal(url.searchParams.get('mode'), 'verifyEmail');
  assert.equal(url.searchParams.get('oobCode'), 'AbC-123_x');
  assert.equal(url.searchParams.get('continueUrl'), 'https://wakaguard.com/open?after=verify');
  // Nothing of Firebase's address, and no key, is left in it
  assert.doesNotMatch(link, /firebaseapp|routepulse|apiKey/);

  // The page it opens reads it as the app's own link, and knows the app will answer
  assert.deepEqual(emailLinkFrom(url.search, SITE), { task: 'verify', code: 'AbC-123_x', appOpens: true });
  assert.equal(emailTaskIn(new URL(url.searchParams.get('continueUrl')!).search), 'verify');
});

test('a reset link from the website continues on the website, and the local emulator link works too', () => {
  const fromEmulator = 'http://127.0.0.1:9099/emulator/action?mode=resetPassword&lang=en&oobCode=code42&apiKey=fake-api-key';
  const link = ourEmailLink(fromEmulator, SITE, 'reset', 'web');
  assert.deepEqual(emailLinkFrom(new URL(link).search, SITE), { task: 'reset', code: 'code42', appOpens: false });
  assert.equal(new URL(link).searchParams.get('continueUrl'), 'https://wakaguard.com/?app=1&after=reset');

  assert.throws(() => ourEmailLink('https://example.com/__/auth/action?mode=verifyEmail', SITE, 'verify', 'web'), /no one-time code/);
});

test('each email says what it is for and holds the link, safely', () => {
  const link = 'https://wakaguard.com/confirm?mode=verifyEmail&oobCode=abc&continueUrl=https%3A%2F%2Fwakaguard.com%2Fopen%3Fafter%3Dverify';
  const verify = buildAccountEmail('verify', link);
  assert.equal(verify.subject, 'Confirm your email for WakaGuard');
  assert.ok(verify.text.includes(link));
  assert.match(verify.text, /Inskriba Limited \(RC 9913212\)/);
  // In the page the "&" of the address is written "&amp;", once on the button and twice as the address to copy
  const escaped = link.replace(/&/g, '&amp;');
  assert.equal(verify.html.split(escaped).length - 1, 3);
  assert.ok(!verify.html.includes('mode=verifyEmail&oobCode'), 'a bare & would break the link in some mail apps');
  assert.match(verify.html, /Confirm my email/);

  const reset = buildAccountEmail('reset', link);
  assert.equal(reset.subject, 'Reset your WakaGuard password');
  assert.match(reset.text, /Your password stays the same/);
  assert.match(reset.html, /Choose a new password/);
});

test('no provider chosen means WakaGuard sends nothing itself', () => {
  assert.deepEqual(getMailProvider(), { missing: 'MAIL_PROVIDER is not set' });
  process.env.MAIL_PROVIDER = 'pigeon';
  assert.deepEqual(getMailProvider(), { missing: 'unknown MAIL_PROVIDER "pigeon"' });
  process.env.MAIL_PROVIDER = 'brevo';
  assert.deepEqual(getMailProvider(), { missing: 'brevo: missing BREVO_API_KEY, MAIL_FROM_EMAIL' });
  process.env.MAIL_PROVIDER = 'mock';
  assert.ok('provider' in getMailProvider());
});

test('Brevo request matches the documented format', async () => {
  process.env.MAIL_PROVIDER = 'brevo';
  process.env.BREVO_API_KEY = 'key_123';
  process.env.MAIL_FROM_EMAIL = 'noreply@wakaguard.com';
  process.env.MAIL_REPLY_TO = 'help@wakaguard.com';
  const calls: Array<{ url: string; headers: Record<string, string>; body: any }> = [];
  globalThis.fetch = (async (url: any, init: any) => {
    calls.push({ url: String(url), headers: init.headers, body: JSON.parse(init.body) });
    return new Response(JSON.stringify({ messageId: '<202610101234.1@smtp-relay.mailin.fr>' }), { status: 201 });
  }) as typeof fetch;

  const found = getMailProvider();
  assert.ok('provider' in found);
  const id = await found.provider.send(
    { to: 'ada@example.com', subject: 'Hello', text: 'plain', html: '<p>rich</p>' },
    getMailSender()
  );

  assert.equal(id, '<202610101234.1@smtp-relay.mailin.fr>');
  assert.equal(calls[0].url, 'https://api.brevo.com/v3/smtp/email');
  assert.equal(calls[0].headers['api-key'], 'key_123');
  assert.deepEqual(calls[0].body, {
    sender: { name: 'WakaGuard', email: 'noreply@wakaguard.com' },
    to: [{ email: 'ada@example.com' }],
    replyTo: { email: 'help@wakaguard.com' },
    subject: 'Hello',
    htmlContent: '<p>rich</p>',
    textContent: 'plain',
  });
});

test('a refusal from Brevo is reported with its reason, and no reply-to is sent unless set', async () => {
  process.env.MAIL_PROVIDER = 'brevo';
  process.env.BREVO_API_KEY = 'key_123';
  process.env.MAIL_FROM_EMAIL = 'noreply@wakaguard.com';
  let sent: any = null;
  globalThis.fetch = (async (_url: any, init: any) => {
    sent = JSON.parse(init.body);
    return new Response(JSON.stringify({ code: 'unauthorized', message: 'Key not found' }), { status: 401 });
  }) as typeof fetch;

  const found = getMailProvider();
  assert.ok('provider' in found);
  await assert.rejects(
    found.provider.send({ to: 'ada@example.com', subject: 's', text: 't', html: 'h' }, getMailSender()),
    /Brevo 401: Key not found/
  );
  assert.equal('replyTo' in sent, false);
});
