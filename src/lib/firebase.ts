/**
 * @fileoverview Firebase initialization and configuration
 * 
 * This module initializes Firebase services for the WakaGuard application:
 * - App Check (optional, when a site key is configured)
 * - Firebase Authentication (anonymous + Google sign-in)
 * - Cloud Firestore (NoSQL database)
 * - Firebase Storage (image uploads)
 * 
 * Configuration is loaded from environment variables (see .env.local.example).
 * Offline persistence is enabled for better UX in areas with poor connectivity.
 * 
 * @module firebase
 */

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import { Capacitor } from '@capacitor/core';
import {
  getAuth,
  initializeAuth,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  Auth,
  connectAuthEmulator,
} from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  persistentSingleTabManager,
  Firestore,
  connectFirestoreEmulator,
  disableNetwork,
  enableNetwork,
  doc,
  getDocFromCache,
} from 'firebase/firestore';
import { getStorage, FirebaseStorage, connectStorageEmulator } from 'firebase/storage';
import { RESTART_GAP_MS, errorText, isLocalStoreFailure, restartPage } from './localStore';
import { settleWithin } from './timeLimit';

/**
 * Firebase configuration object.
 * All values are loaded from NEXT_PUBLIC_* environment variables.
 * These are safe to expose client-side (Firebase security rules enforce access).
 */
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/** Host the Firebase emulators listen on (see firebase.json for the ports) */
export const EMULATOR_HOST = '127.0.0.1';

/**
 * True when the app should talk to the local Firebase emulators instead of a
 * real project. Needs NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true and only ever
 * applies on a local address, so a mis-set flag cannot send real users to
 * localhost. See docs/SAFETY-ALERTS-SETUP.md.
 */
export function usingEmulators(): boolean {
  if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS !== 'true') return false;
  if (typeof window === 'undefined') return false;
  return ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);
}

// Firebase service instances (initialized client-side only)
let app: FirebaseApp;
/** Firebase Authentication instance */
let auth: Auth;
/** Cloud Firestore database instance */
let db: Firestore;
/** Firebase Storage instance for file uploads */
let storage: FirebaseStorage;

// Initialize Firebase only on client-side (not during SSR)
if (typeof window !== 'undefined') {
  // Prevent re-initialization if already initialized (hot reload safety)
  const isFirstInit = getApps().length === 0;
  app = isFirstInit ? initializeApp(firebaseConfig) : getApps()[0];

  // App Check lets Firebase tell this app's requests from scripted ones. It is
  // off until a reCAPTCHA v3 site key is configured, and must be set up before
  // the other services are used. See docs/SAFETY-ALERTS-SETUP.md.
  const appCheckSiteKey = process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY;
  if (isFirstInit && appCheckSiteKey) {
    const debugToken = process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_DEBUG_TOKEN;
    if (debugToken) {
      // For local development only: 'true' prints a token to register in the console
      (self as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN?: string | boolean })
        .FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken === 'true' ? true : debugToken;
    }
    try {
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(appCheckSiteKey),
        isTokenAutoRefreshEnabled: true,
      });
    } catch (err) {
      console.warn('App Check could not be initialised:', err);
    }
  }

  // Inside the phone app the page is served from a local address. getAuth()
  // also loads Google's sign-in popup helper, which never finishes loading
  // there on iOS and leaves sign-in hanging. The app only uses email and
  // guest sign-in, so start Auth without it.
  auth = isFirstInit && Capacitor.isNativePlatform()
    ? initializeAuth(app, { persistence: [indexedDBLocalPersistence, browserLocalPersistence] })
    : getAuth(app);
  // Keep a copy of the user's data on the device, so a trip can be seen,
  // started and ended with no signal. The phone app only ever has one page
  // open, so it takes the storage lock outright: otherwise reopening the app
  // within a few seconds of closing it finds the lock still held, and that
  // whole session runs with nothing kept on the device. Browsers share the
  // storage between tabs instead.
  db = isFirstInit
    ? initializeFirestore(app, {
        localCache: persistentLocalCache({
          tabManager: Capacitor.isNativePlatform()
            ? persistentSingleTabManager({ forceOwnership: true })
            : persistentMultipleTabManager(),
        }),
      })
    : getFirestore(app);
  storage = getStorage(app);

  // Must happen before any other use of the services
  if (isFirstInit && usingEmulators()) {
    connectAuthEmulator(auth, `http://${EMULATOR_HOST}:9099`, { disableWarnings: true });
    connectFirestoreEmulator(db, EMULATOR_HOST, 8080);
    connectStorageEmulator(storage, EMULATOR_HOST, 9199);
    console.info('Using the local Firebase emulators');
  }

  // A phone pauses the page's connections while the app is in the background.
  // Two things can be broken when it comes back.
  //
  // The copy of the data kept on the phone may have stopped working (see
  // localStore.ts): nothing can be read or saved until the page is loaded
  // again, so do that.
  //
  // Otherwise the live data stream may not have recovered, and the screen
  // keeps showing what it knew before. Restart the connection. Queued writes
  // are kept and sent as usual.
  if (isFirstInit && Capacitor.isNativePlatform()) {
    let busy = false;
    let restarting = false;
    // The phone reports a return twice, and the page lives on for a moment
    // after it has been told to load again
    const restart = (reason: string) => {
      if (restartPage(reason)) restarting = true;
      // Refused because the page was loaded again moments ago: look once more after the gap
      else setTimeout(onReturn, RESTART_GAP_MS);
    };
    const onReturn = async () => {
      if (busy || restarting || document.visibilityState !== 'visible') return;
      busy = true;
      try {
        if (await localStoreHasFailed()) {
          restart('the data kept on the phone stopped answering while the app was in the background');
          return;
        }
        await disableNetwork(db);
        await enableNetwork(db);
      } catch (err) {
        console.warn(`Could not restart the data connection: ${errorText(err)}`);
        if (isLocalStoreFailure(err)) restart('the data connection could not be restarted');
      } finally {
        busy = false;
      }
    };
    document.addEventListener('visibilitychange', onReturn);
    // Sent by the native shell when the app returns to the foreground
    document.addEventListener('resume', onReturn);
  }
}

/** Longest the check of the on-phone database may take before it counts as not answering */
const LOCAL_STORE_CHECK_MS = 4000;

/**
 * Ask the on-phone database for a document that is never there. A working
 * database answers "not in the cache"; a failed one answers with its own
 * fault, or not at all.
 */
async function localStoreHasFailed(): Promise<boolean> {
  // Once it has failed, Firestore throws from the call itself instead of
  // returning a promise that fails; the wrapper makes both look the same
  const read = (async () => getDocFromCache(doc(db, 'localStore', 'check')))();
  const outcome = await settleWithin(
    read.then(
      () => 'working' as const,
      (err) => {
        if (!isLocalStoreFailure(err)) return 'working' as const;
        console.error(`The data kept on the phone could not be read: ${errorText(err)}`);
        return 'failed' as const;
      }
    ),
    LOCAL_STORE_CHECK_MS,
    'no answer' as const
  );
  return outcome !== 'working';
}

export { app, auth, db, storage };
