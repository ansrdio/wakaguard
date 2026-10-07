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
  Firestore,
  enableIndexedDbPersistence,
  connectFirestoreEmulator,
  disableNetwork,
  enableNetwork,
} from 'firebase/firestore';
import { getStorage, FirebaseStorage, connectStorageEmulator } from 'firebase/storage';

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
  db = getFirestore(app);
  storage = getStorage(app);

  // Must happen before any other use of the services
  if (isFirstInit && usingEmulators()) {
    connectAuthEmulator(auth, `http://${EMULATOR_HOST}:9099`, { disableWarnings: true });
    connectFirestoreEmulator(db, EMULATOR_HOST, 8080);
    connectStorageEmulator(storage, EMULATOR_HOST, 9199);
    console.info('Using the local Firebase emulators');
  }

  // A phone pauses the page's connections while the app is in the background,
  // and the live data stream does not always recover afterwards: the screen then
  // keeps showing what it knew before. Restart the connection when the app
  // comes back. Queued writes are kept and sent as usual.
  if (isFirstInit && Capacitor.isNativePlatform()) {
    let reconnecting = false;
    const reconnect = async () => {
      if (reconnecting || document.visibilityState !== 'visible') return;
      reconnecting = true;
      try {
        await disableNetwork(db);
        await enableNetwork(db);
      } catch (err) {
        console.warn('Could not restart the data connection:', err);
      } finally {
        reconnecting = false;
      }
    };
    document.addEventListener('visibilitychange', reconnect);
    // Sent by the native shell when the app returns to the foreground
    document.addEventListener('resume', reconnect);
  }

  // Enable IndexedDB persistence for offline support
  // This allows the app to work in areas with poor network connectivity
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      // Multiple tabs open - persistence can only be enabled in one tab
      console.warn('Firestore persistence unavailable: multiple tabs open');
    } else if (err.code === 'unimplemented') {
      // Browser doesn't support IndexedDB persistence
      console.warn('Firestore persistence unavailable: browser not supported');
    }
  });
}

export { app, auth, db, storage };
