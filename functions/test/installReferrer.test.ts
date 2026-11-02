import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inviterFromInstall, readInstallReferrer, storeLinkWithInviter } from '../../src/lib/installReferrer';
import { DEFAULT_UPDATE_URL_ANDROID, DEFAULT_UPDATE_URL_IOS } from '../../src/lib/appConfig';

test('the Google Play link carries the inviter, and the app reads it back from Play', () => {
  const link = storeLinkWithInviter(DEFAULT_UPDATE_URL_ANDROID, 'lord_elijah', 'link');
  assert.equal(link, 'https://play.google.com/store/apps/details?id=com.wakaguard.app&referrer=invited_by%3Dlord_elijah%26via%3Dlink');
  // Play hands the referrer back decoded once
  const referrer = new URL(link).searchParams.get('referrer');
  assert.deepEqual(readInstallReferrer(referrer), { name: 'lord_elijah', via: 'link' });
  assert.deepEqual(readInstallReferrer(new URL(storeLinkWithInviter(DEFAULT_UPDATE_URL_ANDROID, 'Deve', 'trip')).searchParams.get('referrer')), { name: 'Deve', via: 'trip' });
});

test('other links, or no inviter yet, are left as they are', () => {
  assert.equal(storeLinkWithInviter(DEFAULT_UPDATE_URL_IOS, 'Deve', 'link'), DEFAULT_UPDATE_URL_IOS);
  assert.equal(storeLinkWithInviter('https://wakaguard.com/download', 'Deve', 'link'), 'https://wakaguard.com/download');
  assert.equal(storeLinkWithInviter(DEFAULT_UPDATE_URL_ANDROID, null, 'link'), DEFAULT_UPDATE_URL_ANDROID);
  assert.equal(storeLinkWithInviter('not a link', 'Deve', 'link'), 'not a link');
});

test('an install that did not come from an invite link gives nobody', () => {
  assert.equal(readInstallReferrer('utm_source=google-play&utm_medium=organic'), null);
  assert.equal(readInstallReferrer(''), null);
  assert.equal(readInstallReferrer(null), null);
  assert.equal(readInstallReferrer(undefined), null);
  assert.equal(readInstallReferrer(42), null);
  assert.equal(readInstallReferrer('invited_by=has space'), null);
  assert.equal(readInstallReferrer('invited_by=9lives'), null);
  assert.equal(readInstallReferrer('invited_by%3D%E0%A4%A'), null);
});

test('a referrer left encoded once more still reads, and anything but a trip counts as a link', () => {
  assert.deepEqual(readInstallReferrer('invited_by%3DDeve%26via%3Dlink'), { name: 'Deve', via: 'link' });
  assert.deepEqual(readInstallReferrer('invited_by=Deve'), { name: 'Deve', via: 'link' });
  assert.deepEqual(readInstallReferrer('invited_by=@Deve&via=typed'), { name: 'Deve', via: 'link' });
});

test('outside the Android app nothing is asked', async () => {
  assert.equal(await inviterFromInstall(), null);
});
