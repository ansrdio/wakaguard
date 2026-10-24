/**
 * @fileoverview The Android System WebView the phone app runs inside
 *
 * Its Chrome version decides whether the app's styling works. Tailwind 4 needs
 * Chrome 111: cascade layers from 99, the `translate` property from 104 and
 * colour mixing from 111; older ones fall back to solid colours or ignore the
 * rule. Cheap phones often never update it, because people save data by not
 * updating apps. Seen on a tester's Itel A56 (19 October 2026): the switches in
 * Settings changed colour but did not slide.
 *
 * @module webView
 */

export const MIN_WEBVIEW_MAJOR = 111;

export const WEBVIEW_PLAY_URL = 'https://play.google.com/store/apps/details?id=com.google.android.webview';
export const CHROME_PLAY_URL = 'https://play.google.com/store/apps/details?id=com.android.chrome';

/**
 * The WebView's Chrome major version, from the user agent of an Android app
 * ("...; wv) ... Chrome/99.0..."). Null in a browser and on an iPhone.
 */
export function androidWebViewMajor(userAgent: string): number | null {
  if (!/Android/.test(userAgent) || !/;\s*wv\)/.test(userAgent)) return null;
  const match = /Chrome\/(\d+)/.exec(userAgent);
  return match ? Number(match[1]) : null;
}

/** True when the app runs in a WebView too old for its styling */
export function webViewIsOld(userAgent: string): boolean {
  const major = androidWebViewMajor(userAgent);
  return major !== null && major < MIN_WEBVIEW_MAJOR;
}
