import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emailLinkSettings } from '../../src/lib/emailLinks';

test('email links go to our own address, and Continue opens the app', () => {
  assert.deepEqual(emailLinkSettings('https://wakaguard.com'), {
    url: 'https://wakaguard.com/?app=1',
    linkDomain: 'wakaguard.com',
  });
  assert.equal(emailLinkSettings('https://wakaguard.com/')?.url, 'https://wakaguard.com/?app=1');
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
    assert.equal(emailLinkSettings(address), null, address);
  }
});
