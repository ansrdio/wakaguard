'use client';

import { useState, useCallback } from 'react';
import { doc, updateDoc, increment, Timestamp, collection, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthedUser } from '@/hooks/useAuthedUser';
import { ReportStatus } from '@/lib/types';

interface ResolutionVote {
  reportId: string;
  uid: string;
  voteType: 'still_there' | 'resolved';
  createdAt: Timestamp;
}

const RESOLUTION_THRESHOLD = 3; // Number of "resolved" votes needed to mark as resolved

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
      const reportRef = doc(db, 'reports', reportId);
      
      // Add the vote to resolutionVotes subcollection
      const votesRef = collection(db, 'reports', reportId, 'resolutionVotes');
      await addDoc(votesRef, {
        uid,
        voteType,
        createdAt: Timestamp.now(),
      } as ResolutionVote);

      // Update the report's confirmation counts
      if (voteType === 'resolved') {
        await updateDoc(reportRef, {
          'confirmations.resolved': increment(1),
          lastConfirmedAt: Timestamp.now(),
        });
      } else {
        await updateDoc(reportRef, {
          'confirmations.still_there': increment(1),
          lastConfirmedAt: Timestamp.now(),
        });
      }

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

  const markAsResolved = useCallback(async (reason?: string) => {
    if (!uid || !reportId) {
      return { success: false, error: 'Not authenticated' };
    }

    setLoading(true);
    setError(null);

    try {
      const reportRef = doc(db, 'reports', reportId);
      
      await updateDoc(reportRef, {
        status: ReportStatus.RESOLVED,
        resolvedAt: Timestamp.now(),
        resolvedBy: uid,
        resolutionReason: reason || 'Marked as resolved by community',
        'confirmations.resolved': increment(1),
      });

      // Log the resolution action
      await addDoc(collection(db, 'resolutionLogs'), {
        reportId,
        uid,
        action: 'marked_resolved',
        reason: reason || 'Community reported condition resolved',
        createdAt: Timestamp.now(),
      });

      setLoading(false);
      return { success: true };
    } catch (err) {
      console.error('Error marking as resolved:', err);
      const errorMessage = 'Failed to mark as resolved';
      setError(errorMessage);
      setLoading(false);
      return { success: false, error: errorMessage };
    }
  }, [uid, reportId]);

  return {
    voteResolution,
    markAsResolved,
    loading,
    error,
    RESOLUTION_THRESHOLD,
  };
}
