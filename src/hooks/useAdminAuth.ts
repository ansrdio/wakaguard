/**
 * @fileoverview Admin authentication hook
 * 
 * Checks if the current user has admin privileges via:
 * 1. Firebase Custom Claims (primary - set by Cloud Function)
 * 2. Client-side allowlist (fallback - for initial setup)
 * 
 * @module useAdminAuth
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthedUser } from '@/hooks/useAuthedUser';
import { isAdmin as isAdminFromList } from '@/config/admins';
import { auth } from '@/lib/firebase';

/**
 * Hook to check admin status and protect admin routes.
 * Redirects non-admins to home page.
 * 
 * @returns Admin status and checking state
 */
export function useAdminAuth() {
  const { uid, ready } = useAuthedUser();
  const router = useRouter();
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!ready || !uid) {
      if (ready && !uid) {
        setChecking(false);
        router.push('/');
      }
      return;
    }

    const checkAdminStatus = async () => {
      try {
        // Get the current user's ID token result which contains custom claims
        const user = auth.currentUser;
        if (!user) {
          setIsAdminUser(false);
          setChecking(false);
          router.push('/');
          return;
        }

        // Force refresh to get latest claims
        const idTokenResult = await user.getIdTokenResult(true);
        const hasAdminClaim = idTokenResult.claims.admin === true;
        
        // Check custom claims first, then fallback to allowlist
        const adminStatus = hasAdminClaim || isAdminFromList(uid);
        setIsAdminUser(adminStatus);
        setChecking(false);

        if (!adminStatus) {
          router.push('/');
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
        // Fallback to allowlist only
        const adminStatus = isAdminFromList(uid);
        setIsAdminUser(adminStatus);
        setChecking(false);
        
        if (!adminStatus) {
          router.push('/');
        }
      }
    };

    checkAdminStatus();
  }, [uid, ready, router]);

  return {
    isAdmin: isAdminUser,
    checking,
    uid,
  };
}
