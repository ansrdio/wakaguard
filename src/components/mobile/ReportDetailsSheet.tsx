'use client';

import { useState } from 'react';
import { X, Navigation, Share2, ThumbsUp, ThumbsDown, Flag, MessageCircle, CheckCircle, XCircle, Send } from 'lucide-react';
import { Report, FlagReason } from '@/lib/types';
import { useAuthedUser } from '@/hooks/useAuthedUser';
import { useRequireAccount } from '@/hooks/useRequireAccount';
import { AuthModal } from '@/components/AuthModal';
import { useComments } from '@/hooks/useComments';
import { flagReport } from '@/lib/actions';
import { useVote } from '@/hooks/useVote';
import { useReportResolution } from '@/hooks/useReportResolution';

interface ReportDetailsSheetProps {
  report: Report | null;
  onClose: () => void;
  onShowToast: (message: string, type: 'success' | 'error') => void;
}

export function ReportDetailsSheet({ report, onClose, onShowToast }: ReportDetailsSheetProps) {
  const { uid, isAnonymous } = useAuthedUser();
  const { requireAccount, showAuthModal, closeAuthModal } = useRequireAccount({ uid, isAnonymous });
  const [flagging, setFlagging] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [showComments, setShowComments] = useState(false);

  const { comments, loading: commentsLoading, submitting: commentSubmitting, addComment } = useComments(report?.id || '');
  const { submitVote, submitting: voteSubmitting } = useVote(report?.id || '');
  const { voteResolution, loading: resolutionLoading } = useReportResolution(report?.id || '');

  if (!report) return null;

  const handleNavigate = () => {
    const { lat, lng } = report.location;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    let url;
    if (isIOS) {
      url = `maps://maps.apple.com/?daddr=${lat},${lng}`;
    } else if (isMobile) {
      url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    } else {
      url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    }
    
    window.open(url, '_blank');
  };

  const handleShare = async () => {
    const shareUrl = `https://wakaguard.com/r?id=${report.id}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${report.type} - WakaGuard`,
          text: report.description,
          url: shareUrl,
        });
        onShowToast('Shared successfully', 'success');
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          await navigator.clipboard.writeText(shareUrl);
          onShowToast('Link copied to clipboard', 'success');
        }
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      onShowToast('Link copied to clipboard', 'success');
    }
  };

  const handleVote = async (value: 'up' | 'down') => {
    if (!requireAccount('vote')) return;
    if (!uid || voteSubmitting) return;

    const result = await submitVote(value === 'up' ? 1 : -1);
    if (result.success) {
      onShowToast(value === 'up' ? 'Upvoted' : 'Downvoted', 'success');
    } else {
      onShowToast(result.error || 'Failed to vote', 'error');
    }
  };

  const handleFlag = async () => {
    if (!requireAccount('flag report')) return;
    if (!uid || flagging) return;
    
    setFlagging(true);
    try {
      await flagReport(report.id, uid, FlagReason.INAPPROPRIATE, 'Flagged from mobile');
      onShowToast('Report flagged', 'success');
    } catch (error) {
      onShowToast('Failed to flag', 'error');
    } finally {
      setFlagging(false);
    }
  };

  const handleConfirmStatus = async (status: 'resolved' | 'still_there') => {
    if (!requireAccount('confirm status')) return;
    if (!uid || resolutionLoading) return;

    const result = await voteResolution(status);
    if (result.success) {
      onShowToast(status === 'resolved' ? 'Thanks! Your vote has been recorded.' : 'Thanks for confirming!', 'success');
    } else {
      onShowToast(result.error || 'Failed to confirm status', 'error');
    }
  };

  const handleAddComment = async () => {
    if (!requireAccount('add comment')) return;
    if (!commentText.trim() || commentSubmitting) return;
    
    const result = await addComment(commentText);
    if (result.success) {
      setCommentText('');
      onShowToast('Comment posted', 'success');
    } else {
      onShowToast(result.error || 'Failed to post comment', 'error');
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl shadow-2xl max-h-[90vh] flex flex-col animate-in slide-in-from-bottom duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900 capitalize">
            {report.type.replace('_', ' ')}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 pb-20 space-y-4">
          {/* Photos */}
          {report.photoUrls && report.photoUrls.length > 0 && (
            <div className="flex gap-2 overflow-x-auto">
              {report.photoUrls.map((url, idx) => (
                <img
                  key={idx}
                  src={url}
                  alt={`Photo ${idx + 1}`}
                  className="w-32 h-32 object-cover rounded-xl flex-shrink-0"
                />
              ))}
            </div>
          )}

          {/* Description */}
          <div>
            <h3 className="text-sm font-medium text-slate-700 mb-1">Description</h3>
            <p className="text-sm text-slate-900">{report.description}</p>
          </div>

          {/* Location */}
          {report.location.address && (
            <div>
              <h3 className="text-sm font-medium text-slate-700 mb-1">Location</h3>
              <p className="text-sm text-slate-900">{report.location.address}</p>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 bg-slate-50 rounded-xl">
              <div className="text-lg font-semibold text-slate-900">{report.upvotes - report.downvotes}</div>
              <div className="text-xs text-slate-500">Votes</div>
            </div>
            <div className="text-center p-3 bg-slate-50 rounded-xl">
              <div className="text-lg font-semibold text-slate-900">{report.commentCount}</div>
              <div className="text-xs text-slate-500">Comments</div>
            </div>
            <div className="text-center p-3 bg-slate-50 rounded-xl">
              <div className="text-lg font-semibold text-slate-900 capitalize">{report.severity}</div>
              <div className="text-xs text-slate-500">Severity</div>
            </div>
          </div>

          {/* Primary Actions */}
          <div className="space-y-2">
            <button
              onClick={handleNavigate}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
            >
              <Navigation className="w-4 h-4" />
              Navigate
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleConfirmStatus('resolved')}
                disabled={resolutionLoading || !uid}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                <CheckCircle className="w-4 h-4" />
                Resolved
              </button>
              <button
                onClick={() => handleConfirmStatus('still_there')}
                disabled={resolutionLoading || !uid}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-600 text-white rounded-xl font-medium hover:bg-orange-700 transition-colors disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" />
                Still There
              </button>
            </div>
          </div>

          {/* Secondary Actions */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleVote('up')}
              disabled={voteSubmitting || !uid}
              className="flex flex-col items-center gap-1 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors disabled:opacity-50"
            >
              <ThumbsUp className="w-4 h-4 text-slate-700" />
              <span className="text-xs text-slate-600">Upvote</span>
            </button>
            <button
              onClick={() => handleVote('down')}
              disabled={voteSubmitting || !uid}
              className="flex flex-col items-center gap-1 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors disabled:opacity-50"
            >
              <ThumbsDown className="w-4 h-4 text-slate-700" />
              <span className="text-xs text-slate-600">Downvote</span>
            </button>
            <button
              onClick={handleShare}
              className="flex flex-col items-center gap-1 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <Share2 className="w-4 h-4 text-slate-700" />
              <span className="text-xs text-slate-600">Share</span>
            </button>
          </div>

          {/* Comments Section */}
          <div className="border-t border-slate-200 pt-4">
            <button
              onClick={() => setShowComments(!showComments)}
              className="flex items-center gap-2 text-sm font-medium text-slate-900 mb-3"
            >
              <MessageCircle className="w-4 h-4 text-blue-600" />
              Comments ({comments.length})
            </button>

            {showComments && (
              <div className="space-y-3">
                {/* Add Comment */}
                {uid && (
                  <div className="space-y-2">
                    <textarea
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Add a comment..."
                      maxLength={500}
                      rows={3}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm resize-none"
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">{commentText.length}/500</span>
                      <button
                        onClick={handleAddComment}
                        disabled={!commentText.trim() || commentSubmitting}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50"
                      >
                        <Send className="w-4 h-4" />
                        {commentSubmitting ? 'Posting...' : 'Post'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Comments List */}
                <div className="space-y-2">
                  {commentsLoading ? (
                    <p className="text-sm text-slate-500 text-center py-4">Loading...</p>
                  ) : comments.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-4">No comments yet</p>
                  ) : (
                    comments.map((comment) => (
                      <div key={comment.id} className="p-3 bg-slate-50 rounded-xl">
                        <p className="text-sm text-slate-800 mb-1">{comment.text}</p>
                        <span className="text-xs text-slate-500">
                          {comment.createdAt?.toDate?.()?.toLocaleDateString() || 'Just now'}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Flag Button */}
          <button
            onClick={handleFlag}
            disabled={flagging || !uid}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition-colors text-sm font-medium disabled:opacity-50"
          >
            <Flag className="w-4 h-4" />
            Flag Report
          </button>
        </div>
      </div>
      <AuthModal isOpen={showAuthModal} onClose={closeAuthModal} />
    </>
  );
}
