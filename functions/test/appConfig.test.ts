import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_UPDATE_URL_ANDROID,
  DEFAULT_UPDATE_URL_IOS,
  noticeToShow,
  readAppConfig,
  updateNeed,
} from '../../src/lib/appConfig';

test('an empty or missing document means no switches and the default store links', () => {
  for (const data of [undefined, null, {}, 'nonsense']) {
    const config = readAppConfig(data);
    assert.deepEqual(config, {
      minBuild: null,
      latestBuild: null,
      notice: null,
      updateUrlAndroid: DEFAULT_UPDATE_URL_ANDROID,
      updateUrlIos: DEFAULT_UPDATE_URL_IOS,
      signInWith: { google: false, apple: false },
      directions: false,
    });
  }
});

test('build numbers must be whole and positive', () => {
  assert.equal(readAppConfig({ minBuild: 23 }).minBuild, 23);
  for (const bad of [0, -3, 23.5, '23', NaN, Infinity]) {
    assert.equal(readAppConfig({ minBuild: bad, latestBuild: bad }).minBuild, null);
    assert.equal(readAppConfig({ minBuild: bad, latestBuild: bad }).latestBuild, null);
  }
});

test('update links may only go to the stores or our site, over https', () => {
  const ok = readAppConfig({
    updateUrlAndroid: 'https://play.google.com/store/apps/details?id=com.wakaguard.app&hl=en',
    updateUrlIos: 'https://apps.apple.com/app/id6758538666',
  });
  assert.match(ok.updateUrlAndroid, /^https:\/\/play\.google\.com\//);
  assert.match(ok.updateUrlIos, /^https:\/\/apps\.apple\.com\//);
  for (const bad of ['http://play.google.com/x', 'https://play.google.com.evil.example/x', 'javascript:alert(1)', 'https://example.com', 42]) {
    assert.equal(readAppConfig({ updateUrlAndroid: bad }).updateUrlAndroid, DEFAULT_UPDATE_URL_ANDROID);
  }
});

test('a notice needs an id and short text, and is plain info unless marked a warning', () => {
  assert.deepEqual(readAppConfig({ notice: { id: 'oct18', text: '  Texts are slow today.  ' } }).notice, {
    id: 'oct18', text: 'Texts are slow today.', level: 'info',
  });
  assert.equal(readAppConfig({ notice: { id: 'a', text: 'Heads up', level: 'warning' } }).notice?.level, 'warning');
  assert.equal(readAppConfig({ notice: { text: 'No id' } }).notice, null);
  assert.equal(readAppConfig({ notice: { id: 'has space', text: 'x' } }).notice, null);
  assert.equal(readAppConfig({ notice: { id: 'a', text: '   ' } }).notice, null);
  assert.equal(readAppConfig({ notice: { id: 'a', text: 'x'.repeat(281) } }).notice, null);
});

test('an old phone app is told to update, a website never is', () => {
  const config = readAppConfig({ minBuild: 23, latestBuild: 25 });
  assert.equal(updateNeed(22, config, true), 'required');
  assert.equal(updateNeed(23, config, true), 'available');
  assert.equal(updateNeed(25, config, true), 'none');
  assert.equal(updateNeed(26, config, true), 'none');
  assert.equal(updateNeed(22, config, false), 'none');
  assert.equal(updateNeed(22, null, true), 'none');
  assert.equal(updateNeed(22, readAppConfig({}), true), 'none');
});

test('a dismissed notice stays hidden until a new one replaces it', () => {
  const config = readAppConfig({ notice: { id: 'n1', text: 'Hello' } });
  assert.equal(noticeToShow(config, null)?.id, 'n1');
  assert.equal(noticeToShow(config, 'n1'), null);
  assert.equal(noticeToShow(readAppConfig({ notice: { id: 'n2', text: 'Again' } }), 'n1')?.id, 'n2');
  assert.equal(noticeToShow(null, null), null);
});
