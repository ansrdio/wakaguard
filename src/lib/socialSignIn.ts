/**
 * @fileoverview Sign in with Google and with Apple
 *
 * In the phone apps the plugin (@capacitor-firebase/authentication) signs in
 * with Google or Apple natively and hands back the provider's token; the app
 * then signs in to Firebase with it in the web layer, as it does for email
 * and password (skipNativeAuth in capacitor.config.ts). On the website,
 * Google's own pop-up is used.
 *
 * Which buttons show: Google on Android and iPhone; Apple on iPhone, where
 * Apple requires it of an app that offers Google. Not on the website yet:
 * Google's sign-in there needs a pop-up window, which the browsers inside
 * WhatsApp and other apps (where testers open our links) may not give, so
 * it waits until it can be tried in those. Both stay
 * hidden until switched on in the server's config/app (signInWith), so a
 * build can go out before the Google and Apple consoles are set up.
 *
 * Google and Apple accounts have their email confirmed by the provider, so
 * they skip "Check your email", and the server treats them as verified for
 * texting (getSenderProfile).
 *
 * @module socialSignIn
 */

import { Capacitor } from '@capacitor/core';
import {
  AuthCredential,
  getAdditionalUserInfo,
  GoogleAuthProvider,
  OAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  signInWithCredential,
  signInWithPopup,
} from 'firebase/auth';
import { auth } from './firebase';

export type SocialProvider = 'google' | 'apple';

export const PROVIDER_NAMES: Record<SocialProvider, string> = { google: 'Google', apple: 'Apple' };
const PROVIDER_IDS: Record<SocialProvider, string> = { google: 'google.com', apple: 'apple.com' };

/** The buttons for this platform, as switched on in config/app */
export function socialProvidersFor(platform: string, switchedOn: { google: boolean; apple: boolean }): SocialProvider[] {
  const list: SocialProvider[] = [];
  // Apple first on an iPhone, as Apple's own apps do
  if (platform === 'ios' && switchedOn.apple) list.push('apple');
  if (switchedOn.google && (platform === 'ios' || platform === 'android')) list.push('google');
  return list;
}

/** Which of these providers an account signs in with, for confirming it is them */
export function accountProviders(providerIds: string[]): { password: boolean; social: SocialProvider[] } {
  return {
    password: providerIds.includes('password'),
    social: (Object.keys(PROVIDER_IDS) as SocialProvider[]).filter((p) => providerIds.includes(PROVIDER_IDS[p])),
  };
}

export type SocialProblem = 'cancelled' | 'exists-with-password' | 'not-switched-on' | 'offline' | 'failed';

export const SOCIAL_PROBLEM_TEXT: Record<Exclude<SocialProblem, 'cancelled'>, (name: string) => string> = {
  'exists-with-password': () =>
    'This email already has a WakaGuard account with a password. Sign in with your email and password instead.',
  'not-switched-on': (name) => `Signing in with ${name} is not available yet. Please use your email.`,
  offline: () => 'No connection. Check your internet and try again.',
  failed: (name) => `Could not sign in with ${name}. Please try again.`,
};

/** What went wrong, from Firebase's or the plugin's error */
export function readSocialProblem(error: unknown): SocialProblem {
  const e = (error ?? {}) as { code?: unknown; message?: unknown };
  const code = typeof e.code === 'string' ? e.code : '';
  const message = typeof e.message === 'string' ? e.message.toLowerCase() : '';
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request' || code === 'auth/user-cancelled'
    || message.includes('cancel') || message.includes('error 1001')) return 'cancelled';
  if (code === 'auth/account-exists-with-different-credential' || code === 'auth/email-already-in-use') return 'exists-with-password';
  if (code === 'auth/operation-not-allowed' || code === 'auth/unauthorized-domain') return 'not-switched-on';
  if (code === 'auth/network-request-failed' || message.includes('network')) return 'offline';
  return 'failed';
}

/** The provider's token from the phone's own sign-in, as a Firebase credential */
async function nativeCredential(provider: SocialProvider): Promise<AuthCredential> {
  const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');
  if (provider === 'google') {
    const result = await FirebaseAuthentication.signInWithGoogle({ skipNativeAuth: true });
    if (!result.credential?.idToken) throw new Error('Google gave no token');
    return GoogleAuthProvider.credential(result.credential.idToken, result.credential.accessToken);
  }
  const result = await FirebaseAuthentication.signInWithApple({ skipNativeAuth: true });
  if (!result.credential?.idToken) throw new Error('Apple gave no token');
  return new OAuthProvider('apple.com').credential({ idToken: result.credential.idToken, rawNonce: result.credential.nonce });
}

function webProvider(provider: SocialProvider) {
  return provider === 'google' ? new GoogleAuthProvider() : new OAuthProvider('apple.com');
}

/** Sign in, creating the account if it is new. Never rejects. */
export async function signInWithSocial(provider: SocialProvider): Promise<{ ok: true; isNew: boolean } | { ok: false; problem: SocialProblem }> {
  try {
    const result = Capacitor.isNativePlatform()
      ? await signInWithCredential(auth, await nativeCredential(provider))
      : await signInWithPopup(auth, webProvider(provider));
    return { ok: true, isNew: getAdditionalUserInfo(result)?.isNewUser === true };
  } catch (error) {
    const problem = readSocialProblem(error);
    if (problem !== 'cancelled') console.error(`Sign-in with ${provider} failed: ${String((error as { code?: string })?.code ?? error)}`);
    return { ok: false, problem };
  }
}

/** Confirm it is them again, for deleting the account. Null when confirmed. */
export async function confirmWithSocial(provider: SocialProvider): Promise<SocialProblem | null> {
  const user = auth.currentUser;
  if (!user) return 'failed';
  try {
    if (Capacitor.isNativePlatform()) await reauthenticateWithCredential(user, await nativeCredential(provider));
    else await reauthenticateWithPopup(user, webProvider(provider));
    return null;
  } catch (error) {
    return readSocialProblem(error);
  }
}
