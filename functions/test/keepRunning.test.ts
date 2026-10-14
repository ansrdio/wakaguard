import { test } from 'node:test';
import assert from 'node:assert/strict';
import { closesBackgroundApps, keepRunningHelp, shouldOfferKeepRunning } from '../../src/lib/keepRunning';

test('each kind of phone gets its own steps', () => {
  const android = keepRunningHelp('android');
  const iphone = keepRunningHelp('ios');
  const browser = keepRunningHelp('web');
  assert.match(android.steps.map((s) => s.title).join(' | '), /Tecno, Infinix and itel/);
  assert.match(iphone.steps.map((s) => s.body).join(' '), /Low Power Mode/);
  assert.match(browser.steps[0].title, /WakaGuard app/);
  assert.notDeepEqual(android.steps, iphone.steps);
});

test('only a phone app offers the way into the phone settings', () => {
  assert.equal(keepRunningHelp('android').offersSettings, true);
  assert.equal(keepRunningHelp('ios').offersSettings, true);
  assert.equal(keepRunningHelp('web').offersSettings, false);
  // Anything unknown is treated as a browser, which promises least
  assert.deepEqual(keepRunningHelp('windows'), keepRunningHelp('web'));
});

test('the Android steps do not ask for a choice the app does not have', () => {
  // The Android app does not ask for location "all the time", so the phone never offers it
  const words = JSON.stringify(keepRunningHelp('android'));
  assert.doesNotMatch(words, /all the time/i);
});

test('every step is a short title and one or two plain sentences', () => {
  for (const kind of ['android', 'ios', 'web']) {
    const help = keepRunningHelp(kind);
    assert.ok(help.intro.length > 40 && help.intro.length < 260, kind);
    assert.ok(help.steps.length >= 2, kind);
    for (const step of help.steps) {
      assert.ok(step.title.length <= 50, step.title);
      assert.ok(step.body.length <= 240, step.body);
      assert.match(step.body, /\.$/);
    }
  }
});

const UA = (phone: string) => `Mozilla/5.0 (Linux; Android 11; ${phone} Build/RP1A.200720.011; wv) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36 WakaGuard`;

test('Infinix, Tecno and itel phones are recognised from what the app\'s browser says', () => {
  for (const phone of ['Infinix X688B', 'TECNO KG5k', 'itel A665L', 'Infinix X6525']) {
    assert.equal(closesBackgroundApps(UA(phone)), true, phone);
  }
  for (const phone of ['SM-A155F', 'Pixel 8', 'Redmi Note 12', 'K', 'Nokia G21']) {
    assert.equal(closesBackgroundApps(UA(phone)), false, phone);
  }
  // A word that only contains one of the names is not that maker
  assert.equal(closesBackgroundApps(UA('Capitel 5')), false);
  assert.equal(closesBackgroundApps(''), false);
});

test('the steps are offered unasked once, on those phones only, and never on an iPhone', () => {
  const infinix = UA('Infinix X688B');
  assert.equal(shouldOfferKeepRunning('android', infinix, false), true);
  assert.equal(shouldOfferKeepRunning('android', infinix, true), false);
  assert.equal(shouldOfferKeepRunning('android', UA('SM-A155F'), false), false);
  assert.equal(shouldOfferKeepRunning('ios', infinix, false), false);
  // The website on one of these phones, when the browser still names the phone
  assert.equal(shouldOfferKeepRunning('web', infinix, false), true);
});
