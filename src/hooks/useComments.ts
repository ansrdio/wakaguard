'use client';

import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  addDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Comment, CommentStatus } from '@/lib/types';
import { useAuthedUser } from '@/hooks/useAuthedUser';
import { useBlockedUsers } from '@/hooks/useBlockedUsers';

export function useComments(reportId: string) {
  const { uid } = useAuthedUser();
  const { blockedUids } = useBlockedUsers();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!reportId) {
      setLoading(false);
      return;
    }

    // Simplified query - just filter by reportId, sort client-side
    const commentsQuery = query(
      collection(db, 'comments'),
      where('reportId', '==', reportId)
    );

    const unsubscribe = onSnapshot(
      commentsQuery,
      (snapshot) => {
        const commentsList: Comment[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          // Only include active comments
          if (data.status === CommentStatus.ACTIVE || !data.status) {
            commentsList.push({
              id: doc.id,
              ...data,
            } as Comment);
          }
        });
        // Sort by createdAt descending (newest first)
        commentsList.sort((a, b) => {
          const aTime = a.createdAt?.toMillis?.() || 0;
          const bTime = b.createdAt?.toMillis?.() || 0;
          return bTime - aTime;
        });
        // Filter out blocked users
        const unblocked = commentsList.filter(comment => !blockedUids.includes(comment.uid));
        setComments(unblocked);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error fetching comments:', err);
        setError('Failed to load comments');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [reportId, blockedUids]);

  const addComment = async (text: string) => {
    if (!uid) {
      return { success: false, error: 'Please wait for authentication to complete' };
    }

    if (!text.trim()) {
      return { success: false, error: 'Comment text is required' };
    }

    if (text.length > 500) {
      return { success: false, error: 'Comment must be 500 characters or less' };
    }

    setSubmitting(true);

    try {
      await addDoc(collection(db, 'comments'), {
        reportId,
        uid,
        text: text.trim(),
        status: CommentStatus.ACTIVE,
        createdAt: serverTimestamp(),
      });

      return { success: true };
    } catch (err) {
      console.error('Error adding comment:', err);
      return { success: false, error: 'Failed to post comment. Please try again.' };
    } finally {
      setSubmitting(false);
    }
  };

  return {
    comments,
    loading,
    error,
    submitting,
    addComment,
  };
}
