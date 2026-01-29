'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, serverTimestamp, runTransaction } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthedUser } from '@/hooks/useAuthedUser';
import { FlagTargetType } from '@/lib/types';
import { makeFlagId } from '@/lib/rules';

export function useFlag(targetType: FlagTargetType, targetId: string, reportId?: string) {
  const { uid } = useAuthedUser();
  const [existingFlag, setExistingFlag] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!uid || !targetId) {
      setLoading(false);
      return;
    }

    const checkExistingFlag = async () => {
      try {
        setLoading(true);
        const flagId = makeFlagId(targetType, targetId, uid);
        const flagDoc = await getDoc(doc(db, 'flags', flagId));

        setExistingFlag(flagDoc.exists());
      } catch (err) {
        console.error('Error checking existing flag:', err);
        setExistingFlag(false);
      } finally {
        setLoading(false);
      }
    };

    checkExistingFlag();
  }, [uid, targetType, targetId]);

  const submitFlag = async (reason: string) => {
    if (!uid) {
      return { success: false, error: 'Please wait for authentication to complete' };
    }

    if (existingFlag) {
      return { success: false, error: 'You have already flagged this content' };
    }

    if (!reason.trim()) {
      return { success: false, error: 'Please provide a reason for flagging' };
    }

    setSubmitting(true);

    try {
      const flagId = makeFlagId(targetType, targetId, uid);

      await runTransaction(db, async (transaction) => {
        const flagRef = doc(db, 'flags', flagId);

        // Check if flag already exists (race condition protection)
        const flagDoc = await transaction.get(flagRef);
        if (flagDoc.exists()) {
          throw new Error('Flag already exists');
        }

        // Create flag document
        const flagData: any = {
          targetType,
          targetId,
          uid,
          reason: reason.trim(),
          createdAt: serverTimestamp(),
        };

        // Add reportId if this is a comment flag
        if (targetType === FlagTargetType.COMMENT && reportId) {
          flagData.reportId = reportId;
        }

        transaction.set(flagRef, flagData);
      });

      setExistingFlag(true);
      return { success: true };
    } catch (err: any) {
      console.error('Error submitting flag:', err);
      
      if (err.message === 'Flag already exists') {
        setExistingFlag(true);
        return { success: false, error: 'You have already flagged this content' };
      }

      return { success: false, error: 'Failed to submit flag. Please try again.' };
    } finally {
      setSubmitting(false);
    }
  };

  return {
    existingFlag,
    loading,
    submitting,
    submitFlag,
    hasFlagged: existingFlag,
  };
}
