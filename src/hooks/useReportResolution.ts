'use client';

import { useState, useCallback } from 'react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthedUser } from '@/hooks/useAuthedUser';

export function useReportResolution(reportId: string) {
  const { uid } = useAuthedUser();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const voteResolution = useCallback(async (voteType: 'still_there' | 'resolved') => {
    if (!uid || !reportId) {
      return { success: false, error: 'Not authenticated' };
    }

    setLoading(true);
    setError(null);

    try {
      const voteRef = doc(db, 'reports', reportId, 'resolutionVotes', uid);
      await setDoc(voteRef, {
        uid,
        voteType,
        createdAt: serverTimestamp(),
      });

      setLoading(false);
      return { success: true };
    } catch (err) {
      console.error('Error voting on resolution:', err);
      const errorMessage = 'Failed to submit vote';
      setError(errorMessage);
      setLoading(false);
      return { success: false, error: errorMessage };
    }
  }, [uid, reportId]);

  return {
    voteResolution,
    loading,
    error,
  };
}
