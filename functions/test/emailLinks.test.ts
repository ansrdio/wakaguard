import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  emailLinkFrom,
  emailLinkSettings,
  emailTaskFrom,
  emailTaskIn,
  openPhoneAppHref,
} from '../../src/lib/emailLinks';

test('email links go to our own address, and Continue comes back saying what was done', () => {
  assert.deepEqual(emailLinkSettings('https://wakaguard.com', 'verify', false), {
    url: 'https://wakaguard.com/?app=1&after=verify',
    linkDomain: 'wakaguard.com',
  });
  assert.equal(
    emailLinkSettings('https://wakaguard.com/', 'reset', false)?.url,
    'https://wakaguard.com/?app=1&after=reset'
  );
});

test('emails sent by the phone app lead back to the address that opens the app', () => {
  assert.deepEqual(emailLinkSettings('https://wakaguard.com', 'verify', true), {
    url: 'https://wakaguard.com/open?after=verify',
    linkDomain: 'wakaguard.com',
  });
  assert.equal(emailLinkSettings('https://wakaguard.com/', 'reset', true)?.url, 'https://wakaguard.com/open?after=reset');
});

test('the page at that address knows what was done, and its button opens the app', () => {
  assert.equal(emailTaskIn('?after=verify'), 'verify');
  assert.equal(emailTaskIn('?after=reset'), 'reset');
  assert.equal(emailTaskIn(''), 'unknown');
  assert.equal(emailTaskIn('?after=anything'), 'unknown');

  assert.equal(openPhoneAppHref('verify'), 'wakaguard://open?after=verify');
  assert.equal(openPhoneAppHref('reset'), 'wakaguard://open?after=reset');
  assert.equal(openPhoneAppHref('unknown'), 'wakaguard://open');
});

test('the site knows when someone has come back from an email page', () => {
  assert.equal(emailTaskFrom('?app=1&after=verify', ''), 'verify');
  assert.equal(emailTaskFrom('?app=1&after=reset', 'https://routepulse-5701f.firebaseapp.com/'), 'reset');

  // Emails sent by Android build 18 say only "?app=1"; the page before gives it away
  assert.equal(emailTaskFrom('?app=1', 'https://routepulse-5701f.firebaseapp.com/'), 'unknown');
  assert.equal(emailTaskFrom('?app=1', 'https://routepulse-5701f.web.app/'), 'unknown');
  assert.equal(emailTaskFrom('?app=1', 'https://wakaguard.com/__/auth/action?mode=verifyEmail'), 'unknown');
});

test('everyone else who opens the app on the site is left alone', () => {
  for (const [search, cameFrom] of [
    ['?app=1', ''],
    ['?app=1', 'https://wakaguard.com/'],
    ['?app=1', 'https://wakaguard.com/about'],
    ['?app=1', 'https://www.google.com/'],
    ['?app=1', 'https://notfirebaseapp.com/'],
    ['?app=1', 'not an address'],
    ['?app=1&after=something-else', ''],
    ['', 'https://routepulse-5701f.firebaseapp.com/'],
  ]) {
    assert.equal(emailTaskFrom(search, cameFrom), null, `${search} from ${cameFrom}`);
  }
});

test("Firebase's own addresses and a developer's machine keep Firebase's defaults", () => {
  for (const address of [
    'https://routepulse-5701f.web.app',
    'https://routepulse-5701f.firebaseapp.com',
    'https://preview--routepulse-5701f.web.app',
    'http://localhost:3000',
    'https://localhost',
    'http://127.0.0.1:3000',
    'https://wakaguard.test',
    'http://wakaguard.com',
    'not an address',
    '',
  ]) {
    assert.equal(emailLinkSettings(address, 'verify', false), null, address);
    assert.equal(emailLinkSettings(address, 'verify', true), null, address);
  }
});

test("our own page reads the link Firebase builds for an email", () => {
  const site = 'https://wakaguard.com';
  const back = encodeURIComponent('https://wakaguard.com/open?after=verify');

  // Sent by a phone app that answers "Open WakaGuard" (build 19 on)
  assert.deepEqual(emailLinkFrom(`?mode=verifyEmail&oobCode=abc&apiKey=k&continueUrl=${back}&lang=en`, site), {
    task: 'verify',
    code: 'abc',
    appOpens: true,
  });
  // Sent by the website or Android build 18, by an iPhone build with no address at all
  const web = encodeURIComponent('https://wakaguard.com/?app=1&after=reset');
  assert.deepEqual(emailLinkFrom(`?mode=resetPassword&oobCode=abc&continueUrl=${web}`, site), {
    task: 'reset',
    code: 'abc',
    appOpens: false,
  });
  assert.deepEqual(emailLinkFrom('?mode=verifyEmail&oobCode=abc', site), { task: 'verify', code: 'abc', appOpens: false });
  // Someone else's site dressed up as ours does not get the button
  const theirs = encodeURIComponent('https://example.com/open?after=verify');
  assert.deepEqual(emailLinkFrom(`?mode=verifyEmail&oobCode=abc&continueUrl=${theirs}`, site), {
    task: 'verify',
    code: 'abc',
    appOpens: false,
  });

  // Firebase's other links go to its own page; half a link goes nowhere
  assert.deepEqual(emailLinkFrom('?mode=recoverEmail&oobCode=abc', site), { task: 'other' });
  assert.equal(emailLinkFrom('?mode=verifyEmail', site), null);
  assert.equal(emailLinkFrom('?oobCode=abc', site), null);
  assert.equal(emailLinkFrom('', site), null);
});
