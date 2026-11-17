/**
 * @fileoverview Authentication hook for WakaGuard
 * 
 * Manages Firebase Authentication state.
 * Anonymous is used for view-only access; writes require a non-anonymous account.
 * 
 * @module useAuthedUser
 */

'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { noteSignedIn, waitLeftMs, wasSignedIn } from '@/lib/signedInHint';

/** Set once Firebase has said who is signed in; from then on each new listener hears at once */
let firebaseAnswered = false;
/**
 * When this page began waiting for that answer. Shared, so the wait is counted
 * once from the start and not again by each screen that asks.
 */
let waitStartedAt: number | null = null;

/**
 * Hook to manage Firebase Authentication state.
 *
 * Features:
 * - State tracking: Monitors auth state changes in real-time
 * - User document: Ensures Firestore user document exists
 * - Username: Fetches and tracks username from Firestore
 * - Anonymous is view-only; actions require a signed-in account
 *
 * @returns Authentication state object
 */
export function useAuthedUser() {
  const [uid, setUid] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  // Read in the browser after the first draw, so the built page and the app's first draw agree
  const [signedInBefore, setSignedInBefore] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [emailVerified, setEmailVerified] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [needsUsername, setNeedsUsername] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let userDocUnsubscribe: (() => void) | null = null;
    let authResolved = false;

    // Each time the app opens, Firebase checks the saved sign-in with Google
    // before it answers, which takes seconds on slow mobile data. Opening as
    // signed out meanwhile looks like being logged out, so someone who was
    // signed in on this phone is waited for much longer (lib/signedInHint.ts)
    const before = wasSignedIn();
    setSignedInBefore(before);
    waitStartedAt ??= Date.now();
    const timeout = firebaseAnswered
      ? null
      : setTimeout(() => {
          if (!authResolved) {
            console.warn('No answer on who is signed in yet: opening as signed out until it comes');
            setReady(true);
          }
        }, waitLeftMs(waitStartedAt, Date.now(), before));

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      authResolved = true;
      firebaseAnswered = true;
      if (timeout) clearTimeout(timeout);
      noteSignedIn(!!firebaseUser && !firebaseUser.isAnonymous);
      // Clean up previous user doc listener
      if (userDocUnsubscribe) {
        userDocUnsubscribe();
        userDocUnsubscribe = null;
      }

      if (firebaseUser) {
        setUid(firebaseUser.uid);
        setIsAnonymous(firebaseUser.isAnonymous);
        setEmail(firebaseUser.isAnonymous ? null : firebaseUser.email);
        setEmailVerified(firebaseUser.isAnonymous ? false : firebaseUser.emailVerified);
        setDisplayName(firebaseUser.isAnonymous ? null : firebaseUser.displayName);

        if (firebaseUser.isAnonymous) {
          setUsername(null);
          setNeedsUsername(false);
          setReady(true);
          return;
        }

        await ensureUserDocument(firebaseUser.uid);

        const userRef = doc(db, 'users', firebaseUser.uid);
        userDocUnsubscribe = onSnapshot(userRef, (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            setUsername(data.username || null);
            setNeedsUsername(!data.username);
          } else {
            setUsername(null);
            setNeedsUsername(true);
          }
          setReady(true);
        }, (error) => {
          console.error('Error listening to user doc:', error);
          setReady(true);
        });
        return;
      }

      setUid(null);
      setIsAnonymous(false);
      setEmail(null);
      setEmailVerified(false);
      setDisplayName(null);
      setUsername(null);
      setNeedsUsername(false);
      setReady(true);
    });

    return () => {
      if (timeout) clearTimeout(timeout);
      unsubscribe();
      if (userDocUnsubscribe) userDocUnsubscribe();
    };
  }, []);

  /** Still waiting to hear who is signed in, on a phone where someone was: show "Signing you in", not the sign-in screen */
  const restoring = signedInBefore && !ready;

  return { uid, ready, restoring, isAnonymous, email, emailVerified, displayName, username, needsUsername };
}

async function ensureUserDocument(uid: string) {
  try {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      await setDoc(userRef, {
        createdAt: serverTimestamp(),
        blockedUids: [],
      });
      console.log('Created user document for:', uid);
    }
  } catch (error) {
    console.error('Error ensuring user document:', error);
  }
}
