/**
 * @fileoverview Firebase initialization and configuration
 * 
 * This module initializes Firebase services for the WakaGuard application:
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
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

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
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);

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
