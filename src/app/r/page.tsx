'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, Suspense } from 'react';
import { useReport } from '@/hooks/useReport';
import { useVote } from '@/hooks/useVote';
import { useComments } from '@/hooks/useComments';
import { useFlag } from '@/hooks/useFlag';
import { useBlockedUsers } from '@/hooks/useBlockedUsers';
import { useAuthedUser } from '@/hooks/useAuthedUser';
import { useRequireAccount } from '@/hooks/useRequireAccount';
import { AuthModal } from '@/components/AuthModal';
import { PhotoCarousel } from '@/components/PhotoCarousel';
import { CommentList } from '@/components/CommentList';
import { FlagModal } from '@/components/FlagModal';
import { Toast } from '@/components/ui/Toast';
import { FlagTargetType } from '@/lib/types';
import { 
  ArrowLeft, MapPin, Calendar, Clock, ThumbsUp, ThumbsDown, 
  MessageCircle, Flag, Share2, AlertCircle, CheckCircle, Navigation, Ban 
} from 'lucide-react';
import Link from 'next/link';
import { buildReportLink } from '@/lib/appUrl';

function ReportDetailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  // Read id from query param instead of path param
  const reportId = searchParams.get('id') || '';
  
  const { report, loading, error } = useReport(reportId);
  const { uid, isAnonymous } = useAuthedUser();
  const { requireAccount, showAuthModal, closeAuthModal } = useRequireAccount({ uid, isAnonymous });
  const { existingVote, loading: voteLoading, submitting, submitVote, hasVoted } = useVote(reportId);
  const { comments, loading: commentsLoading, submitting: commentSubmitting, addComment } = useComments(reportId);
  const { existingFlag: reportFlagged, submitFlag: submitReportFlag } = useFlag(FlagTargetType.REPORT, reportId);
  const { blockUser, isBlocked, blocking } = useBlockedUsers();
  const [voteMessage, setVoteMessage] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [commentMessage, setCommentMessage] = useState<string | null>(null);
  const [isFlagModalOpen, setIsFlagModalOpen] = useState(false);
  const [flagMessage, setFlagMessage] = useState<string | null>(null);
  const [blockMessage, setBlockMessage] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const formatDate = (timestamp: any) => {
    if (!timestamp?.toDate) return 'Unknown';
    return timestamp.toDate().toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTimeAgo = (timestamp: any) => {
    if (!timestamp?.toMillis) return 'Unknown';
    const now = Date.now();
    const diff = now - timestamp.toMillis();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
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

  const handleVote = async (value: 1 | -1) => {
    setVoteMessage(null);
    if (!requireAccount('vote')) return;
    const result = await submitVote(value);
    
    if (result.success) {
      setVoteMessage(value === 1 ? '✓ Upvoted!' : '✓ Downvoted!');
      setTimeout(() => setVoteMessage(null), 3000);
    } else {
      setVoteMessage(result.error || 'Failed to vote');
      setTimeout(() => setVoteMessage(null), 5000);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    setCommentMessage(null);

    if (!requireAccount('add comment')) return;

    if (!commentText.trim()) {
      setCommentMessage('Please enter a comment');
      setTimeout(() => setCommentMessage(null), 3000);
      return;
    }

    const result = await addComment(commentText);
    
    if (result.success) {
      setCommentText('');
      setCommentMessage('✓ Comment posted!');
      setTimeout(() => setCommentMessage(null), 3000);
    } else {
      setCommentMessage(result.error || 'Failed to post comment');
      setTimeout(() => setCommentMessage(null), 5000);
    }
  };

  const handleFlagReport = async (reason: string) => {
    if (!requireAccount('flag report')) {
      return { success: false, error: 'Sign in required' };
    }
    const result = await submitReportFlag(reason);
    
    if (result.success) {
      setFlagMessage('✓ Report flagged for review');
      setTimeout(() => setFlagMessage(null), 3000);
    } else {
      setFlagMessage(result.error || 'Failed to flag report');
      setTimeout(() => setFlagMessage(null), 5000);
    }
    
    return result;
  };

  const handleBlockUser = async () => {
    if (!report) return;

    if (!requireAccount('block user')) return;

    if (window.confirm('Block this user? You will no longer see their reports or comments.')) {
      const result = await blockUser(report.uid);
      
      if (result.success) {
        setBlockMessage('✓ User blocked. Returning to home...');
        setTimeout(() => {
          router.push('/');
        }, 2000);
      } else {
        setBlockMessage(result.error || 'Failed to block user');
        setTimeout(() => setBlockMessage(null), 5000);
      }
    }
  };

  const handleNavigate = () => {
    if (!report) return;

    const { lat, lng } = report.location;
    const coords = `${lat},${lng}`;

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);

    let mapsUrl;

    if (isIOS) {
      mapsUrl = `maps://maps.apple.com/?q=${lat},${lng}`;
    } else if (isAndroid) {
      mapsUrl = `geo:${lat},${lng}?q=${lat},${lng}`;
    } else {
      mapsUrl = `https://www.google.com/maps/search/?api=1&query=${coords}`;
    }

    window.open(mapsUrl, '_blank');
  };

  const handleShare = async () => {
    // Use new query param URL format for sharing
    const url = buildReportLink(reportId);
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${report?.type} - WakaGuard`,
          text: report?.description,
          url: url,
        });
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      navigator.clipboard.writeText(url);
      setToast({ type: 'success', message: 'Link copied to clipboard!' });
    }
  };

  // No reportId provided
  if (!reportId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">No Report ID</h1>
          <p className="text-gray-600 mb-6">Please provide a report ID in the URL.</p>
          <Link 
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading report...</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Report Not Found</h1>
          <p className="text-gray-600 mb-6">
            {error || 'The report you\'re looking for doesn\'t exist or has been removed.'}
          </p>
          <Link 
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push('/')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Back</span>
            </button>
            <Link href="/" className="text-xl font-bold text-gray-900">
              WakaGuard
            </Link>
            <button
              onClick={handleShare}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Share2 className="w-5 h-5" />
              <span className="hidden sm:inline">Share</span>
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <div className="flex items-start justify-between mb-3">
            <h1 className="text-3xl font-bold text-gray-900 capitalize">
              {report.type}
            </h1>
            <span className={`px-3 py-1 rounded-lg font-medium text-sm ${
              report.severity === 'critical' ? 'bg-red-500 text-white' :
              report.severity === 'high' ? 'bg-orange-500 text-white' :
              report.severity === 'medium' ? 'bg-yellow-500 text-white' :
              'bg-green-500 text-white'
            }`}>
              {report.severity}
            </span>
          </div>

          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>{formatTimeAgo(report.createdAt)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>{formatDate(report.createdAt)}</span>
            </div>
            <div className={`flex items-center gap-2 ${
              report.verification === 'verified' ? 'text-green-600' :
              report.verification === 'pending' ? 'text-yellow-600' :
              'text-red-600'
            }`}>
              <span className="w-2 h-2 rounded-full bg-current"></span>
              <span className="capitalize font-medium">{report.verification}</span>
            </div>
          </div>
        </div>

        {report.photoUrls && report.photoUrls.length > 0 && (
          <div className="mb-8">
            <PhotoCarousel photos={report.photoUrls} reportType={report.type} />
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Description</h2>
          <p className="text-gray-700 leading-relaxed">{report.description}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-start justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-red-500" />
              Location
            </h2>
            <button
              onClick={handleNavigate}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Navigation className="w-4 h-4" />
              Navigate
            </button>
          </div>
          {report.location.address ? (
            <p className="text-gray-700">{report.location.address}</p>
          ) : (
            <p className="text-gray-600 font-mono text-sm">
              {report.location.lat.toFixed(6)}, {report.location.lng.toFixed(6)}
            </p>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Community Feedback</h2>
          
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <ThumbsUp className="w-6 h-6 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{report.upvotes}</div>
              <div className="text-sm text-gray-600">Upvotes</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <ThumbsDown className="w-6 h-6 text-red-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{report.downvotes}</div>
              <div className="text-sm text-gray-600">Downvotes</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <MessageCircle className="w-6 h-6 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{report.commentCount}</div>
              <div className="text-sm text-gray-600">Comments</div>
            </div>
          </div>

          {voteMessage && (
            <div className={`p-3 rounded-lg mb-4 flex items-center gap-2 ${
              voteMessage.startsWith('✓') 
                ? 'bg-green-50 text-green-700 border border-green-200' 
                : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
            }`}>
              {voteMessage.startsWith('✓') && <CheckCircle className="w-5 h-5" />}
              {!voteMessage.startsWith('✓') && <AlertCircle className="w-5 h-5" />}
              <span className="font-medium">{voteMessage}</span>
            </div>
          )}

          {hasVoted && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
              <div className="flex items-center gap-2 text-blue-700">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">
                  You already voted {existingVote?.value === 1 ? '👍 Up' : '👎 Down'} on this report
                </span>
              </div>
              <p className="text-sm text-blue-600 mt-1">One vote per user is allowed</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => handleVote(1)}
              disabled={hasVoted || submitting || voteLoading}
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-all ${
                hasVoted || submitting || voteLoading
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : existingVote?.value === 1
                    ? 'bg-green-600 text-white'
                    : 'bg-green-500 text-white hover:bg-green-600'
              }`}>
              <ThumbsUp className="w-5 h-5" />
              {existingVote?.value === 1 ? 'Upvoted' : 'Upvote'}
            </button>
            <button 
              onClick={() => handleVote(-1)}
              disabled={hasVoted || submitting || voteLoading}
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-all ${
                hasVoted || submitting || voteLoading
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : existingVote?.value === -1
                    ? 'bg-red-600 text-white'
                    : 'bg-red-500 text-white hover:bg-red-600'
              }`}>
              <ThumbsDown className="w-5 h-5" />
              {existingVote?.value === -1 ? 'Downvoted' : 'Downvote'}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-blue-500" />
            Comments ({comments.length})
          </h2>
          
          {commentMessage && (
            <div className={`p-3 rounded-lg mb-4 flex items-center gap-2 ${
              commentMessage.startsWith('✓') 
                ? 'bg-green-50 text-green-700 border border-green-200' 
                : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
            }`}>
              {commentMessage.startsWith('✓') && <CheckCircle className="w-5 h-5" />}
              {!commentMessage.startsWith('✓') && <AlertCircle className="w-5 h-5" />}
              <span className="font-medium">{commentMessage}</span>
            </div>
          )}

          <div className="mb-6">
            <CommentList comments={comments} loading={commentsLoading} />
          </div>

          <form onSubmit={handleAddComment} className="border-t border-gray-200 pt-6">
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Add a comment..."
              rows={3}
              maxLength={500}
              disabled={commentSubmitting}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-gray-500">
                {commentText.length}/500 characters
              </span>
              <button 
                type="submit"
                disabled={commentSubmitting || !commentText.trim()}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {commentSubmitting ? 'Posting...' : 'Post Comment'}
              </button>
            </div>
          </form>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Report Actions</h2>
          
          {flagMessage && (
            <div className={`p-3 rounded-lg mb-4 flex items-center gap-2 ${
              flagMessage.startsWith('✓') 
                ? 'bg-green-50 text-green-700 border border-green-200' 
                : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
            }`}>
              {flagMessage.startsWith('✓') && <CheckCircle className="w-5 h-5" />}
              {!flagMessage.startsWith('✓') && <AlertCircle className="w-5 h-5" />}
              <span className="font-medium">{flagMessage}</span>
            </div>
          )}

          {blockMessage && (
            <div className={`p-3 rounded-lg mb-4 flex items-center gap-2 ${
              blockMessage.startsWith('✓') 
                ? 'bg-green-50 text-green-700 border border-green-200' 
                : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
            }`}>
              {blockMessage.startsWith('✓') && <CheckCircle className="w-5 h-5" />}
              {!blockMessage.startsWith('✓') && <AlertCircle className="w-5 h-5" />}
              <span className="font-medium">{blockMessage}</span>
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Status</span>
              <span className="text-sm font-medium capitalize">{report.status}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Expiration</span>
              <span className="text-sm font-medium">{formatExpiry(report.expiresAt)}</span>
            </div>
            
            {reportFlagged ? (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 text-blue-700">
                  <CheckCircle className="w-5 h-5" />
                  <span className="text-sm font-medium">You have flagged this report</span>
                </div>
                <p className="text-xs text-blue-600 mt-1">Our team will review it soon</p>
              </div>
            ) : (
              <button 
                onClick={() => setIsFlagModalOpen(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Flag className="w-5 h-5" />
                Flag Report
              </button>
            )}

            {isBlocked(report.uid) ? (
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-2 text-gray-700">
                  <Ban className="w-5 h-5" />
                  <span className="text-sm font-medium">User is blocked</span>
                </div>
              </div>
            ) : (
              <button 
                onClick={handleBlockUser}
                disabled={blocking}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Ban className="w-5 h-5" />
                {blocking ? 'Blocking...' : 'Block User'}
              </button>
            )}
          </div>
        </div>

        <FlagModal
          isOpen={isFlagModalOpen}
          onClose={() => setIsFlagModalOpen(false)}
          onSubmit={handleFlagReport}
          targetType="report"
        />
      </main>
    </div>
      
    {toast && (
      <Toast
        type={toast.type}
        message={toast.message}
        onClose={() => setToast(null)}
      />
    )}
    <AuthModal isOpen={showAuthModal} onClose={closeAuthModal} />
    </>
  );
}

// Wrap in Suspense for useSearchParams
export default function ReportDetailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gray-900"></div>
      </div>
    }>
      <ReportDetailContent />
    </Suspense>
  );
}
