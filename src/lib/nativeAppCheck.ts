/**
 * @fileoverview App Check in the phone apps (build 27)
 *
 * App Check lets Firebase tell WakaGuard's own apps from scripts calling the
 * server with a stolen or made-up account (security review, 4 November 2026).
 * The phones run the web app inside them, where the website's reCAPTCHA cannot
 * run, so the phone's own attestation answers instead: Play Integrity on
 * Android, App Attest on iPhone, through the native Firebase App Check plugin.
 * Its tokens are handed to the web Firebase SDK, which sends them with every
 * database, storage and function request.
 *
 * Nothing is enforced yet: Firebase only counts requests with and without a
 * valid token. A token that is slow or missing must never hold up a trip or
 * an SOS, so each wait is cut short and the request goes on without one.
 *
 * @module nativeAppCheck
 */

import type { FirebaseApp } from 'firebase/app';
import { CustomProvider, initializeAppCheck } from 'firebase/app-check';
import { FirebaseAppCheck } from '@capacitor-firebase/app-check';

/** Longest a request waits for a token before going without */
export const TOKEN_WAIT_MS = 3000;

export function startNativeAppCheck(app: FirebaseApp): void {
  const ready = FirebaseAppCheck.initialize({ isTokenAutoRefreshEnabled: true });
  ready.catch((error) => console.warn('App Check could not start on this phone:', error));

  initializeAppCheck(app, {
    provider: new CustomProvider({
      getToken: async () => {
        const answer = (async () => {
          await ready;
          const { token, expireTimeMillis } = await FirebaseAppCheck.getToken();
          return { token, expireTimeMillis: expireTimeMillis ?? Date.now() + 30 * 60 * 1000 };
        })();
        const tooSlow = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('App Check token took too long')), TOKEN_WAIT_MS));
        return Promise.race([answer, tooSlow]);
      },
    }),
    isTokenAutoRefreshEnabled: true,
  });
}
