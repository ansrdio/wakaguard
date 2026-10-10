import type { ActionCodeSettings } from 'firebase/auth';
import { OPEN_APP_HREF } from './frontPage';

/**
 * Where the links in WakaGuard's own emails (verify your address, reset your
 * password) point.
 *
 * Left alone, Firebase puts them on its own address
 * (<project>.firebaseapp.com), and the page they open ends with nowhere to
 * go. With these settings the link is on our address, and the page offers
 * "Continue", which opens the app.
 *
 * The link can only be moved to an address Firebase Hosting serves for this
 * project, which rules out Firebase's own addresses and a developer's
 * machine. For those, null: Firebase's defaults are used.
 */

const NOT_OURS = /(^|\.)(web\.app|firebaseapp\.com|localhost|test)$|^127\.0\.0\.1$|^\[::1\]$/;

export function emailLinkSettings(appUrl: string): ActionCodeSettings | null {
  let host: string;
  try {
    const parsed = new URL(appUrl);
    if (parsed.protocol !== 'https:') return null;
    host = parsed.hostname;
  } catch {
    return null;
  }
  if (NOT_OURS.test(host)) return null;

  return { url: `${appUrl.replace(/\/+$/, '')}${OPEN_APP_HREF}`, linkDomain: host };
}
