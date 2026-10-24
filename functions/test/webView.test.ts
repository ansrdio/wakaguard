import { test } from 'node:test';
import assert from 'node:assert/strict';
import { androidWebViewMajor, MIN_WEBVIEW_MAJOR, webViewIsOld } from '../../src/lib/webView';

const appUa = (chrome: string) =>
  `Mozilla/5.0 (Linux; Android 10; itel A56 Pro Build/QP1A.190711.020; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/${chrome} Mobile Safari/537.36`;
const CHROME_BROWSER = 'Mozilla/5.0 (Linux; Android 14; SM-S156V) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0 Mobile Safari/537.36';
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148';

test('the WebView version is read only inside the Android app', () => {
  assert.equal(androidWebViewMajor(appUa('101.0.4951.61')), 101);
  assert.equal(androidWebViewMajor(CHROME_BROWSER), null, 'Chrome itself, not the app');
  assert.equal(androidWebViewMajor(IPHONE), null);
});

test('a WebView below Chrome 111 is old', () => {
  assert.equal(MIN_WEBVIEW_MAJOR, 111);
  assert.equal(webViewIsOld(appUa('101.0.4951.61')), true);
  assert.equal(webViewIsOld(appUa('110.0.0.0')), true);
  assert.equal(webViewIsOld(appUa('111.0.0.0')), false);
  assert.equal(webViewIsOld(appUa('130.0.0.0')), false);
  assert.equal(webViewIsOld(CHROME_BROWSER), false, 'never in a browser');
  assert.equal(webViewIsOld(IPHONE), false);
});
