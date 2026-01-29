'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthedUser } from '@/hooks/useAuthedUser';

export function useBlockedUsers() {
  const { uid } = useAuthedUser();
  const [blockedUids, setBlockedUids] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [blocking, setBlocking] = useState(false);

  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return;
    }

    const fetchBlockedUsers = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setBlockedUids(data.blockedUids || []);
        }
      } catch (err) {
        console.error('Error fetching blocked users:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchBlockedUsers();
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

  const isBlocked = (targetUid: string) => {
    return blockedUids.includes(targetUid);
  };

  return {
    blockedUids,
    loading,
    blocking,
    blockUser,
    isBlocked,
  };
}
