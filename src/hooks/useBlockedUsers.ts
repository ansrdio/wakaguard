'use client';

import { useState, useEffect } from 'react';
import { doc, onSnapshot, updateDoc, arrayRemove, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthedUser } from '@/hooks/useAuthedUser';

export function useBlockedUsers() {
  const { uid } = useAuthedUser();
  const [blockedUids, setBlockedUids] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [blocking, setBlocking] = useState(false);

  // Listened to, not read once: the list is used by several parts of the app
  // at the same time, and blocking in one must hide posts in the others
  useEffect(() => {
    if (!uid) {
      setBlockedUids([]);
      setLoading(false);
      return;
    }

    return onSnapshot(
      doc(db, 'users', uid),
      (snapshot) => {
        setBlockedUids(snapshot.data()?.blockedUids || []);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching blocked users:', err);
        setLoading(false);
      },
    );
  }, [uid]);

  const blockUser = async (targetUid: string) => {
    if (!uid) {
      return { success: false, error: 'Please wait for authentication to complete' };
    }

    if (uid === targetUid) {
      return { success: false, error: 'You cannot block yourself' };
    }

    if (blockedUids.includes(targetUid)) {
      return { success: false, error: 'User is already blocked' };
    }

    setBlocking(true);

    try {
      await updateDoc(doc(db, 'users', uid), {
        blockedUids: arrayUnion(targetUid),
      });

      setBlockedUids(prev => [...prev, targetUid]);
      return { success: true };
    } catch (err) {
      console.error('Error blocking user:', err);
      return { success: false, error: 'Failed to block user. Please try again.' };
    } finally {
      setBlocking(false);
    }
  };

  const unblockUser = async (targetUid: string) => {
    if (!uid) return { success: false, error: 'Please sign in first' };
    setBlocking(true);
    try {
      await updateDoc(doc(db, 'users', uid), { blockedUids: arrayRemove(targetUid) });
      setBlockedUids(prev => prev.filter((blocked) => blocked !== targetUid));
      return { success: true };
    } catch (err) {
      console.error('Error unblocking user:', err);
      return { success: false, error: 'Could not unblock. Please try again.' };
    } finally {
      setBlocking(false);
    }
  };

  const isBlocked = (targetUid: string) => {
    return blockedUids.includes(targetUid);
  };

  return {
    blockedUids,
    loading,
    blocking,
    blockUser,
    unblockUser,
    isBlocked,
  };
}
