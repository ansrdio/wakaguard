/**
 * @fileoverview Authentication hook for WakaGuard
 * 
 * Manages Firebase Authentication state. Users must sign in with
 * Google or email/password - anonymous sign-in is disabled.
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
 * - No anonymous: Users must explicitly sign in
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

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // Clean up previous user doc listener
      if (userDocUnsubscribe) {
        userDocUnsubscribe();
        userDocUnsubscribe = null;
      }

      if (firebaseUser && !firebaseUser.isAnonymous) {
        setUid(firebaseUser.uid);
        setIsAnonymous(false);
        setEmail(firebaseUser.email);
        setEmailVerified(firebaseUser.emailVerified);
        setDisplayName(firebaseUser.displayName);
        
        // Ensure user document exists and listen for changes
        await ensureUserDocument(firebaseUser.uid);
        
        // Listen to user document for username changes
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
      } else {
        setUid(null);
        setIsAnonymous(false);
        setEmail(null);
        setEmailVerified(false);
        setDisplayName(null);
        setUsername(null);
        setNeedsUsername(false);
        setReady(true);
      }
    });

    return () => {
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
