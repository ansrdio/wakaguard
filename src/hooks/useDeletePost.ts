'use client';

import { useState } from 'react';
import { deleteDoc, doc } from 'firebase/firestore';
import { deleteObject, listAll, ref } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';

export interface DeleteResult {
  success: boolean;
  error?: string;
}

/**
 * Lets a person take down their own road report or comment.
 *
 * The database rules already allow it for the author and nobody else, so a
 * failure here is a refusal by the server or no connection, not a missing
 * check. The post goes first, so that it is off everyone's screen at once;
 * a report's photos follow. If the app is closed before the photos are gone,
 * the server removes them and whatever other people attached to the report
 * (functions/src/reportCleanup.ts).
 */
export function useDeletePost() {
  const [deleting, setDeleting] = useState(false);

  const run = async (work: () => Promise<void>): Promise<DeleteResult> => {
    setDeleting(true);
    try {
      await work();
      return { success: true };
    } catch (err) {
      console.error('Could not delete the post:', err);
      return { success: false, error: 'Could not delete it. Check your connection and try again.' };
    } finally {
      setDeleting(false);
    }
  };

  const deleteComment = (commentId: string) => run(() => deleteDoc(doc(db, 'comments', commentId)));

  const deleteReport = (reportId: string, authorUid: string) => run(async () => {
    await deleteDoc(doc(db, 'reports', reportId));
    // Not waited for and never an error to the person: the report is already gone
    void listAll(ref(storage, `report_photos/${authorUid}/${reportId}`))
      .then((found) => Promise.all(found.items.map((photo) => deleteObject(photo))))
      .catch((err) => console.warn('Photos left for the server to remove:', err));
  });

  return { deleting, deleteComment, deleteReport };
}
