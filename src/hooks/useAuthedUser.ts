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

    // Timeout fallback - if auth doesn't resolve in 5 seconds, mark as ready anyway
    const timeout = setTimeout(() => {
      if (!authResolved) {
        console.warn('Auth state timeout - proceeding without auth');
        setReady(true);
      }
    }, 5000);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      authResolved = true;
      clearTimeout(timeout);
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
      clearTimeout(timeout);
      unsubscribe();
      if (userDocUnsubscribe) userDocUnsubscribe();
    };
  }, []);

  return { uid, ready, isAnonymous, email, emailVerified, displayName, username, needsUsername };
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
