'use client';

import { useState } from 'react';
import { Ban, Flag } from 'lucide-react';
import { FlagModal } from '@/components/FlagModal';
import { useBackToClose } from '@/hooks/useBackToClose';
import { useBlockedUsers } from '@/hooks/useBlockedUsers';
import { useFlag } from '@/hooks/useFlag';
import { FlagTargetType } from '@/lib/types';

interface PostActionsProps {
  /** A road report or a comment on one */
  kind: 'report' | 'comment';
  targetId: string;
  /** The road report a comment belongs to */
  reportId: string;
  /** Who posted it. With no author, or for the viewer's own post, blocking is not offered. */
  authorUid?: string | null;
  viewerUid: string | null;
  /** Returns false, after asking the person to sign in, when they have no account */
  requireAccount: (doing: string) => boolean;
  onShowToast: (message: string, type: 'success' | 'error') => void;
  /** Called once the author has been blocked, so the post can be taken off the screen */
  onBlocked?: () => void;
  /** Small text links under a comment, or full-width buttons under a report */
  compact?: boolean;
}

/**
 * "Report" and "Block" for something another person posted. Reporting sends it
 * to us to review; blocking hides everything that person posts from the viewer.
 */
export function PostActions({
  kind, targetId, reportId, authorUid, viewerUid, requireAccount, onShowToast, onBlocked, compact = false,
}: PostActionsProps) {
  const { hasFlagged, submitFlag } = useFlag(
    kind === 'report' ? FlagTargetType.REPORT : FlagTargetType.COMMENT, targetId, reportId,
  );
  const { blockUser, blocking } = useBlockedUsers();
  const [reporting, setReporting] = useState(false);
  const [confirmingBlock, setConfirmingBlock] = useState(false);
  useBackToClose(reporting, () => setReporting(false));
  useBackToClose(confirmingBlock, () => setConfirmingBlock(false));

  const canBlock = !!authorUid && authorUid !== viewerUid;
  // A road report is itself called a report, so "Report this report" will not do
  const what = kind === 'report' ? 'post' : 'comment';

  const startReport = () => {
    if (!requireAccount(`report this ${what}`)) return;
    setReporting(true);
  };
  const startBlock = () => {
    if (!requireAccount('block someone')) return;
    setConfirmingBlock(true);
  };
  const block = async () => {
    if (!authorUid) return;
    const result = await blockUser(authorUid);
    setConfirmingBlock(false);
    if (result.success) {
      onShowToast('Blocked. You will not see their posts.', 'success');
      onBlocked?.();
    } else {
      onShowToast(result.error || 'Could not block. Try again.', 'error');
    }
  };

  const button = compact
    ? 'inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-red-700 disabled:opacity-60'
    : 'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-red-700 border border-red-200 rounded-xl hover:bg-red-50 disabled:opacity-60';
  const icon = compact ? 'w-3.5 h-3.5' : 'w-4 h-4';

  return (
    <>
      <div className={compact ? 'flex items-center gap-4 mt-2' : 'flex gap-2'}>
        <button type="button" onClick={startReport} disabled={hasFlagged} className={button}>
          <Flag className={icon} aria-hidden="true" />
          {hasFlagged ? 'Reported' : compact ? 'Report' : `Report this ${what}`}
        </button>
        {canBlock && (
          <button type="button" onClick={startBlock} disabled={blocking} className={button}>
            <Ban className={icon} aria-hidden="true" />
            {compact ? 'Block' : 'Block this person'}
          </button>
        )}
      </div>

      <FlagModal
        isOpen={reporting}
        onClose={() => setReporting(false)}
        targetType={kind}
        onSubmit={async (reason) => {
          const result = await submitFlag(reason);
          if (result.success) onShowToast('Reported. Thank you, we will look at it.', 'success');
          return result;
        }}
      />

      {confirmingBlock && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50" role="alertdialog" aria-modal="true" aria-labelledby="block-title">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6">
            <h2 id="block-title" className="text-xl font-bold text-slate-900">Block this person?</h2>
            <p className="mt-2 text-slate-700">
              You will no longer see their reports or comments. They are not told. You can unblock them later in
              Profile, under Settings.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmingBlock(false)}
                className="flex-1 py-3 rounded-2xl bg-slate-100 text-slate-800 font-semibold hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void block()}
                disabled={blocking}
                className="flex-1 py-3 rounded-2xl bg-red-600 text-white font-bold hover:bg-red-700 disabled:opacity-60"
              >
                {blocking ? 'Blocking…' : 'Block'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
