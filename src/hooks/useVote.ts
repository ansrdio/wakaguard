'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, serverTimestamp, runTransaction } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthedUser } from '@/hooks/useAuthedUser';
import { makeVoteId } from '@/lib/rules';

export function useVote(reportId: string) {
  const { uid } = useAuthedUser();
  const [existingVote, setExistingVote] = useState<{ value: 1 | -1 } | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!uid || !reportId) {
      setLoading(false);
      return;
    }

    const checkExistingVote = async () => {
      try {
        setLoading(true);
        const voteId = makeVoteId(reportId, uid);
        const voteDoc = await getDoc(doc(db, 'votes', voteId));

        if (voteDoc.exists()) {
          setExistingVote({ value: voteDoc.data().value });
        } else {
          setExistingVote(null);
        }
      } catch (err) {
        console.error('Error checking existing vote:', err);
        setExistingVote(null);
      } finally {
        setLoading(false);
      }
    };

    checkExistingVote();
  }, [uid, reportId]);

  const submitVote = async (value: 1 | -1) => {
    if (!uid) {
      return { success: false, error: 'Please wait for authentication to complete' };
    }

    if (existingVote) {
      return { success: false, error: 'You have already voted on this report' };
    }

    setSubmitting(true);

    try {
      const voteId = makeVoteId(reportId, uid);

      // Use a transaction to ensure vote doesn't already exist
      await runTransaction(db, async (transaction) => {
        const voteRef = doc(db, 'votes', voteId);

        // Check if vote already exists (race condition protection)
        const voteDoc = await transaction.get(voteRef);
        if (voteDoc.exists()) {
          throw new Error('Vote already exists');
        }

        // Create vote document
        // Note: Count updates are handled by Cloud Function (onVoteCreate)
        transaction.set(voteRef, {
          reportId,
          uid,
          value,
          createdAt: serverTimestamp(),
        });
      });

      setExistingVote({ value });
      return { success: true };
    } catch (err: any) {
      console.error('Error submitting vote:', err);
      
      if (err.message === 'Vote already exists') {
        setExistingVote({ value }); // Update local state
        return { success: false, error: 'You have already voted on this report' };
      }

      return { success: false, error: 'Failed to submit vote. Please try again.' };
    } finally {
      setSubmitting(false);
    }
  };

  return {
    existingVote,
    loading,
    submitting,
    submitVote,
    hasVoted: !!existingVote,
  };
}
