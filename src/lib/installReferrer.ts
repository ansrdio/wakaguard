/**
 * @fileoverview Who invited someone who installed the app from an invite link
 *
 * The invite page (src/app/join) sends Android phones to Google Play with the
 * inviter's username attached as Play's "referrer". After the install the app
 * asks Play for it (android/app/src/main/java/com/wakaguard/app/InstallReferrerPlugin.java)
 * and fills in "Who invited you?". Apple passes nothing through the App Store,
 * so on iPhone the invite page copies the name and the app offers to paste it.
 *
 * @module installReferrer
 */

import { Capacitor, registerPlugin } from '@capacitor/core';
import { readInviteName, type InviteVia } from './referralWords';

interface InstallReferrerPlugin {
  get(): Promise<{ referrer?: string | null }>;
}

const InstallReferrer = registerPlugin<InstallReferrerPlugin>('InstallReferrer');

/** The Play link with the inviter attached. Any other link is left as it is. */
export function storeLinkWithInviter(storeUrl: string, name: string | null, via: InviteVia): string {
  if (!name) return storeUrl;
  try {
    const url = new URL(storeUrl);
    if (url.hostname !== 'play.google.com') return storeUrl;
    url.searchParams.set('referrer', new URLSearchParams({ invited_by: name, via }).toString());
    return url.toString();
  } catch {
    return storeUrl;
  }
}

/** The inviter in what Play handed over. Null for an install that did not come from an invite link. */
export function readInstallReferrer(referrer: unknown): { name: string; via: InviteVia } | null {
  if (typeof referrer !== 'string' || !referrer) return null;
  let text = referrer;
  // Some routes into Play leave the text encoded once more
  if (!text.includes('=') && /%3d/i.test(text)) {
    try {
      text = decodeURIComponent(text);
    } catch {
      return null;
    }
  }
  const params = new URLSearchParams(text);
  const name = readInviteName(params.get('invited_by'));
  if (!name) return null;
  return { name, via: params.get('via') === 'trip' ? 'trip' : 'link' };
}

/** Asks Google Play, in the Android app only. Null anywhere else, or when Play has nothing. */
export async function inviterFromInstall(): Promise<{ name: string; via: InviteVia } | null> {
  if (Capacitor.getPlatform() !== 'android') return null;
  try {
    return readInstallReferrer((await InstallReferrer.get()).referrer);
  } catch {
    return null;
  }
}
