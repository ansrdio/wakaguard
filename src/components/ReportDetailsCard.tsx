'use client';

import { useState } from 'react';
import { Report, FlagReason } from '@/lib/types';
import { X, MapPin, Calendar, ThumbsUp, ThumbsDown, MessageCircle, Flag, AlertCircle, Share2, Navigation, CheckCircle, XCircle, Send, Users } from 'lucide-react';
import { useAuthedUser } from '@/hooks/useAuthedUser';
import { useRequireAccount } from '@/hooks/useRequireAccount';
import { AuthModal } from '@/components/AuthModal';
import { flagReport } from '@/lib/actions';
import { useComments } from '@/hooks/useComments';
import { useReportResolution } from '@/hooks/useReportResolution';
import { useVote } from '@/hooks/useVote';

interface ReportDetailsCardProps {
  report: Report | null;
  onClose: () => void;
}

export function ReportDetailsCard({ report, onClose }: ReportDetailsCardProps) {
  const { uid, isAnonymous } = useAuthedUser();
  const { requireAccount, showAuthModal, closeAuthModal } = useRequireAccount({ uid, isAnonymous });
  const [flagging, setFlagging] = useState(false);
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [flagReason, setFlagReason] = useState<FlagReason>(FlagReason.SPAM);
  const [flagDetails, setFlagDetails] = useState('');
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [optimisticVotes, setOptimisticVotes] = useState<{upvotes: number, downvotes: number} | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [showComments, setShowComments] = useState(false);
  
  const { comments, loading: commentsLoading, submitting: commentSubmitting, addComment } = useComments(report?.id || '');
  const { voteResolution, loading: resolutionLoading } = useReportResolution(report?.id || '');
  const { submitVote, submitting: voteSubmitting } = useVote(report?.id || '');

  if (!report) return null;

  const handleVote = async (voteType: 'up' | 'down') => {
    if (!requireAccount('vote')) return;
    if (!uid || voteSubmitting) return;
    
    // Optimistic update
    const currentUpvotes = optimisticVotes?.upvotes ?? report.upvotes;
    const currentDownvotes = optimisticVotes?.downvotes ?? report.downvotes;
    
    setOptimisticVotes({
      upvotes: voteType === 'up' ? currentUpvotes + 1 : currentUpvotes,
      downvotes: voteType === 'down' ? currentDownvotes + 1 : currentDownvotes,
    });
    
    const result = await submitVote(voteType === 'up' ? 1 : -1);
    
    if (!result.success) {
      // Revert optimistic update
      setOptimisticVotes(null);
      setNotice({ type: 'error', message: 'Could not submit vote, try again.' });
      setTimeout(() => setNotice(null), 3000);
    } else {
      setNotice({ type: 'success', message: 'Thanks—vote recorded.' });
      setTimeout(() => setNotice(null), 2000);
    }
    
  };

  const handleFlag = async () => {
    if (!requireAccount('flag report')) return;
    if (!uid || flagging) return;
    
    setFlagging(true);
    const result = await flagReport(report.id, uid, flagReason, flagDetails);
    
    if (result.success) {
      setNotice({ type: 'success', message: 'Report flagged. Our team will review it.' });
      setShowFlagModal(false);
      setFlagDetails('');
      setTimeout(() => setNotice(null), 3000);
    } else {
      setNotice({ type: 'error', message: result.error || 'Failed to flag report' });
      setTimeout(() => setNotice(null), 3000);
    }
    
    setFlagging(false);
  };

  const handleNavigate = () => {
    const { lat, lng } = report.location;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    let url;
    if (isIOS) {
      // Apple Maps on iOS
      url = `maps://maps.apple.com/?daddr=${lat},${lng}`;
    } else if (isMobile) {
      // Google Maps on Android
      url = `geo:${lat},${lng}?q=${lat},${lng}`;
    } else {
      // Google Maps web on desktop
      url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    }
    
    window.open(url, '_blank');
  };

  const handleAddComment = async () => {
    if (!requireAccount('add comment')) return;
    if (!commentText.trim() || commentSubmitting) return;
    
    const result = await addComment(commentText);
    if (result.success) {
      setCommentText('');
      setNotice({ type: 'success', message: 'Comment posted!' });
      setTimeout(() => setNotice(null), 2000);
    } else {
      setNotice({ type: 'error', message: result.error || 'Failed to post comment' });
      setTimeout(() => setNotice(null), 3000);
    }
  };

  const handleShare = async () => {
    const url = `https://wakaguard.com/r?id=${report.id}`;
    
    try {
      // Try Web Share API first (better on mobile)
      if (navigator.share) {
        await navigator.share({
          title: 'WakaGuard Report',
          text: `${report.type} report in ${report.state}`,
          url: url,
        });
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (error) {
      // User cancelled share or clipboard failed
      console.error('Share failed:', error);
    }
  };

  // Check if report is old enough for confirmation (24-72 hours)
  const isOldEnoughForConfirmation = () => {
    if (!report.createdAt?.toMillis) return false;
    const ageHours = (Date.now() - report.createdAt.toMillis()) / (1000 * 60 * 60);
    return ageHours >= 24 && ageHours <= 72;
  };

  const handleConfirmStatus = async (status: 'resolved' | 'still_there') => {
    if (!requireAccount('confirm status')) return;
    if (!uid || resolutionLoading) return;

    const result = await voteResolution(status);
    if (result.success) {
      setNotice({
        type: 'success',
        message: status === 'resolved' ? 'Thanks! Your vote has been recorded.' : 'Thanks for confirming!'
      });
    } else {
      setNotice({ type: 'error', message: result.error || 'Failed to confirm status' });
    }
    setTimeout(() => setNotice(null), 3000);
  };


  const formatDate = (timestamp: any) => {
    if (!timestamp?.toDate) return 'Unknown';
    return timestamp.toDate().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatExpiry = (timestamp: any) => {
    if (!timestamp?.toDate) return 'Unknown';
    const expiryDate = timestamp.toDate();
    const now = new Date();
    const diff = expiryDate.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    
    if (days < 0) return 'Expired';
    if (days === 0) return 'Expires today';
    if (days === 1) return 'Expires tomorrow';
    return `Expires in ${days} days`;
  };

  return (
    <>
      {/* Mobile Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-[5000] md:hidden"
        onClick={onClose}
      />
      
      {/* Card/Sheet Container */}
      <div className="fixed md:absolute inset-x-0 bottom-0 md:top-4 md:right-4 md:bottom-4 md:inset-x-auto md:w-[380px] bg-white md:rounded-2xl rounded-t-3xl md:rounded-b-2xl shadow-lg md:border border-t md:border-slate-200 z-[5001] max-h-[85vh] md:max-h-auto flex flex-col animate-in slide-in-from-bottom md:slide-in-from-right duration-300">
      {/* Drag Handle (Mobile Only) */}
      <div className="md:hidden pt-2 pb-1 flex justify-center">
        <div className="w-12 h-1 bg-slate-300 rounded-full" />
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-5">
        {/* Inline Notice Banner */}
        {notice && (
          <div className={`mb-4 p-3 rounded-2xl border ${
            notice.type === 'success' 
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <p className="text-sm font-medium">{notice.message}</p>
          </div>
        )}

        {/* Confirmation Banner (for reports 24-72 hours old) */}
        {isOldEnoughForConfirmation() && uid && (
          <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-900 mb-3">
                  Is this issue still there?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleConfirmStatus('still_there')}
                    className="flex-1 px-3 py-2 bg-amber-600 text-white rounded-xl hover:bg-amber-700 transition-colors text-sm font-medium"
                  >
                    Yes, still there
                  </button>
                  <button
                    onClick={() => handleConfirmStatus('resolved')}
                    className="flex-1 px-3 py-2 bg-white text-amber-900 border border-amber-300 rounded-xl hover:bg-amber-50 transition-colors text-sm font-medium"
                  >
                    Resolved
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-bold capitalize text-slate-900">
                {report.type}
              </h2>
              <button
                onClick={handleShare}
                className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                title="Share report"
              >
                {copied ? (
                  <span className="text-xs font-medium text-green-600">Copied!</span>
                ) : (
                  <Share2 className="w-4 h-4 text-slate-500" />
                )}
              </button>
            </div>
            <span className={`inline-block text-xs px-2 py-1 rounded font-medium ${
              report.severity === 'critical' ? 'bg-red-100 text-red-700' :
              report.severity === 'high' ? 'bg-orange-100 text-orange-700' :
              report.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
              'bg-green-100 text-green-700'
            }`}>
              {report.severity} severity
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Photos Gallery */}
        {report.photoUrls && report.photoUrls.length > 0 && (
          <div className="mb-4">
            {report.photoUrls.length === 1 ? (
              <div 
                className="rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => setSelectedPhoto(report.photoUrls![0])}
              >
                <img 
                  src={report.photoUrls[0]} 
                  alt={`${report.type} photo`}
                  className="w-full h-64 object-cover"
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {report.photoUrls.map((url, index) => (
                  <div 
                    key={index} 
                    className="rounded-lg overflow-hidden aspect-square cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => setSelectedPhoto(url)}
                  >
                    <img 
                      src={url} 
                      alt={`${report.type} photo ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Legacy Image Support */}
        {!report.photoUrls && report.imageUrl && (
          <div className="mb-4 rounded-lg overflow-hidden">
            <img 
              src={report.imageUrl} 
              alt={report.type}
              className="w-full h-48 object-cover"
            />
          </div>
        )}

        {/* Description */}
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-2">Description</h3>
          <p className="text-sm text-slate-600">{report.description}</p>
        </div>

        {/* Location */}
        <div className="mb-4">
          <div className="flex items-start gap-2 text-sm text-slate-600">
            <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div>
              {report.location.address ? (
                <p>{report.location.address}</p>
              ) : (
                <p>{report.location.lat.toFixed(6)}, {report.location.lng.toFixed(6)}</p>
              )}
            </div>
          </div>
        </div>

        {/* Timestamps */}
        <div className="mb-4 space-y-2">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Calendar className="w-4 h-4" />
            <span>Reported {formatDate(report.createdAt)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Calendar className="w-4 h-4" />
            <span>{formatExpiry(report.expiresAt)}</span>
          </div>
        </div>

        {/* Stats Row */}
        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl mb-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <ThumbsUp className="w-4 h-4 text-green-600" />
              <span className="font-semibold text-slate-900">{optimisticVotes?.upvotes ?? report.upvotes}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ThumbsDown className="w-4 h-4 text-red-600" />
              <span className="font-semibold text-slate-900">{optimisticVotes?.downvotes ?? report.downvotes}</span>
            </div>
          </div>
          <button
            onClick={() => setShowComments(!showComments)}
            className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <MessageCircle className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-slate-700">{comments.length} Comments</span>
          </button>
        </div>
        
        {/* Comments Section - Always visible toggle */}
        <div className={`border border-slate-200 rounded-2xl overflow-hidden transition-all ${showComments ? 'mb-4' : 'mb-4'}`}>
          <button
            onClick={() => setShowComments(!showComments)}
            className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-blue-600" />
              <span className="font-semibold text-slate-900">Community Discussion</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
              </span>
              <svg className={`w-4 h-4 text-slate-500 transition-transform ${showComments ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>
          
          {showComments && (
            <div className="p-4 border-t border-slate-200">
              {/* Comment Form */}
              {uid ? (
                <div className="mb-4">
                  <div className="flex gap-2">
                    <textarea
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Share your experience or update..."
                      maxLength={500}
                      rows={2}
                      className="flex-1 px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm resize-none"
                      aria-label="Comment text"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey && commentText.trim()) {
                          e.preventDefault();
                          handleAddComment();
                        }
                      }}
                    />
                    <button
                      onClick={handleAddComment}
                      disabled={!commentText.trim() || commentSubmitting}
                      className="self-end px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Post comment"
                    >
                      {commentSubmitting ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Send className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-xs text-slate-400">{commentText.length}/500</span>
                    <span className="text-xs text-slate-400">Press Enter to send</span>
                  </div>
                </div>
              ) : (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-center">
                  <p className="text-sm text-amber-800">Sign in to join the discussion</p>
                </div>
              )}
              
              {/* Comments List */}
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {commentsLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : comments.length === 0 ? (
                  <div className="text-center py-6">
                    <MessageCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">No comments yet</p>
                    <p className="text-xs text-slate-400">Be the first to share an update!</p>
                  </div>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="p-3 bg-slate-50 rounded-xl">
                      <p className="text-sm text-slate-800 whitespace-pre-wrap">{comment.text}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-slate-500">
                          {comment.createdAt?.toDate?.()?.toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit'
                          }) || 'Just now'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Pinned Actions Footer */}
      <div className="border-t border-slate-200 p-4 bg-white md:rounded-b-2xl rounded-b-3xl">
        <div className="grid grid-cols-2 gap-3 mb-3">
          <button 
            onClick={() => handleVote('up')}
            disabled={voteSubmitting || !uid}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-2xl hover:bg-green-700 transition-colors text-sm font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ThumbsUp className="w-4 h-4" />
            {voteSubmitting ? 'Voting...' : 'Upvote'}
          </button>
          <button 
            onClick={() => handleVote('down')}
            disabled={voteSubmitting || !uid}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-2xl hover:bg-red-700 transition-colors text-sm font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ThumbsDown className="w-4 h-4" />
            {voteSubmitting ? 'Voting...' : 'Downvote'}
          </button>
        </div>
        
        {/* Navigate Button */}
        <button 
          onClick={handleNavigate}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-colors font-medium mb-3"
          aria-label="Navigate to location"
        >
          <Navigation className="w-4 h-4" />
          Navigate
        </button>
        
        {/* Community Status Verification */}
        <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 mb-3">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Community Status</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
            Help keep our data accurate - is this issue still present?
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button 
              onClick={() => handleConfirmStatus('resolved')}
              disabled={resolutionLoading || !uid}
              className="flex items-center justify-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors text-sm font-medium disabled:opacity-50"
              aria-label="Mark as resolved"
            >
              <CheckCircle className="w-4 h-4" />
              Issue Fixed
            </button>
            <button 
              onClick={() => handleConfirmStatus('still_there')}
              disabled={resolutionLoading || !uid}
              className="flex items-center justify-center gap-2 px-3 py-2 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-colors text-sm font-medium disabled:opacity-50"
              aria-label="Confirm still there"
            >
              <XCircle className="w-4 h-4" />
              Still There
            </button>
          </div>
          {/* Show confirmation counts */}
          <div className="flex items-center justify-center gap-4 mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
            <span className="text-xs text-emerald-600">
              ✓ {(report as any).confirmations?.resolved || 0} fixed
            </span>
            <span className="text-xs text-orange-600">
              ⚠ {(report as any).confirmations?.still_there || 0} still there
            </span>
          </div>
        </div>
        
        <button 
          onClick={() => {
            if (requireAccount('flag report')) {
              setShowFlagModal(true);
            }
          }}
          disabled={!uid}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-2xl hover:bg-slate-200 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Flag className="w-4 h-4" />
          Flag Report
        </button>
      </div>
    </div>

    {/* Photo Lightbox Modal */}
    {selectedPhoto && (
      <div 
        className="fixed inset-0 bg-black/90 z-[7000] flex items-center justify-center p-4"
        onClick={() => setSelectedPhoto(null)}
      >
        <button
          onClick={() => setSelectedPhoto(null)}
          className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
        >
          <X className="w-6 h-6 text-white" />
        </button>
        <img 
          src={selectedPhoto} 
          alt="Full size"
          className="max-w-full max-h-full object-contain"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    )}

    <AuthModal isOpen={showAuthModal} onClose={closeAuthModal} />

    {/* Flag Modal */}
    {showFlagModal && (
      <div className="fixed inset-0 bg-black/50 z-[6000] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 z-[6001]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-600" />
              <h3 className="text-lg font-bold text-slate-900">Flag Report</h3>
            </div>
            <button
              onClick={() => setShowFlagModal(false)}
              className="p-1 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>

          <p className="text-sm text-slate-600 mb-4">
            Help us maintain quality by reporting issues with this report.
          </p>

          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Reason
            </label>
            <select
              value={flagReason}
              onChange={(e) => setFlagReason(e.target.value as FlagReason)}
              className="w-full px-3 py-2 border border-slate-300 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value={FlagReason.SPAM}>Spam</option>
              <option value={FlagReason.INAPPROPRIATE}>Inappropriate content</option>
              <option value={FlagReason.INCORRECT}>Incorrect information</option>
              <option value={FlagReason.DUPLICATE}>Duplicate report</option>
              <option value={FlagReason.OTHER}>Other</option>
            </select>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Additional details (optional)
            </label>
            <textarea
              value={flagDetails}
              onChange={(e) => setFlagDetails(e.target.value)}
              placeholder="Provide more context..."
              className="w-full px-3 py-2 border border-slate-300 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm min-h-[80px] resize-none"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowFlagModal(false)}
              className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-2xl hover:bg-slate-200 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleFlag}
              disabled={flagging}
              className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-2xl hover:bg-orange-700 transition-colors font-medium disabled:opacity-50"
            >
              {flagging ? 'Submitting...' : 'Submit Flag'}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
