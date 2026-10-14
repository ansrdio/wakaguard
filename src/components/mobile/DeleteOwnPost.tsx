'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useBackToClose } from '@/hooks/useBackToClose';
import { useDeletePost } from '@/hooks/useDeletePost';

interface DeleteOwnPostProps {
  /** A road report or a comment on one */
  kind: 'report' | 'comment';
  targetId: string;
  /** The person who posted it, who is also the person looking at it */
  authorUid: string;
  onShowToast: (message: string, type: 'success' | 'error') => void;
  /** Called once it is gone, so the screen showing it can close */
  onDeleted?: () => void;
  /** A small text link, or a full-width button */
  compact?: boolean;
}

/**
 * "Delete" on something the person posted themselves. It is asked once more
 * before it happens, because it cannot be undone.
 */
export function DeleteOwnPost({ kind, targetId, authorUid, onShowToast, onDeleted, compact = false }: DeleteOwnPostProps) {
  const { deleting, deleteComment, deleteReport } = useDeletePost();
  const [confirming, setConfirming] = useState(false);
  useBackToClose(confirming, () => setConfirming(false));

  // A road report is itself called a report, so it is a "post" here as it is beside "Report this post"
  const what = kind === 'report' ? 'post' : 'comment';

  const remove = async () => {
    const result = kind === 'report' ? await deleteReport(targetId, authorUid) : await deleteComment(targetId);
    setConfirming(false);
    if (result.success) {
      onShowToast(kind === 'report' ? 'Your post is deleted.' : 'Your comment is deleted.', 'success');
      onDeleted?.();
    } else {
      onShowToast(result.error || 'Could not delete it. Try again.', 'error');
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        disabled={deleting}
        className={compact
          ? 'inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-red-700 disabled:opacity-60'
          : 'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-red-700 border border-red-200 rounded-xl hover:bg-red-50 disabled:opacity-60'}
      >
        <Trash2 className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} aria-hidden="true" />
        {compact ? 'Delete' : `Delete my ${what}`}
      </button>

      {confirming && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50" role="alertdialog" aria-modal="true" aria-labelledby="delete-post-title">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 text-left">
            <h2 id="delete-post-title" className="text-xl font-bold text-slate-900">Delete your {what}?</h2>
            <p className="mt-2 text-slate-700">
              {kind === 'report'
                ? 'It is taken off the map for everyone, with its photos and comments. This cannot be undone.'
                : 'It is removed for everyone. This cannot be undone.'}
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="flex-1 py-3 rounded-2xl bg-slate-100 text-slate-800 font-semibold hover:bg-slate-200"
              >
                Keep it
              </button>
              <button
                type="button"
                onClick={() => void remove()}
                disabled={deleting}
                className="flex-1 py-3 rounded-2xl bg-red-600 text-white font-bold hover:bg-red-700 disabled:opacity-60"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
