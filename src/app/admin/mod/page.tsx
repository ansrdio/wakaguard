'use client';

import { useState, useEffect } from 'react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useFlags, FlagWithContent } from '@/hooks/useFlags';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Report, Comment, FlagTargetType, ReportStatus, CommentStatus } from '@/lib/types';
import { Shield, AlertTriangle, CheckCircle, XCircle, Clock, Trash2, Eye } from 'lucide-react';
import { Toast } from '@/components/ui/Toast';
import Link from 'next/link';

export default function AdminModPage() {
  const { isAdmin, checking } = useAdminAuth();
  const { flags, loading, error } = useFlags(100);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [filter, setFilter] = useState<'all' | 'report' | 'comment'>('all');

  const formatTimeAgo = (timestamp: any) => {
    if (!timestamp?.toMillis) return 'Unknown';
    const now = Date.now();
    const diff = now - timestamp.toMillis();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  const handleReportAction = async (reportId: string, status: ReportStatus) => {
    setActionLoading(reportId);
    try {
      await updateDoc(doc(db, 'reports', reportId), { status });
      setToast({ type: 'success', message: `Report status updated to ${status}` });
    } catch (err) {
      console.error('Error updating report:', err);
      setToast({ type: 'error', message: 'Failed to update report status' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleCommentAction = async (commentId: string) => {
    setActionLoading(commentId);
    try {
      await updateDoc(doc(db, 'comments', commentId), { 
        status: CommentStatus.REMOVED 
      });
      setToast({ type: 'success', message: 'Comment removed' });
    } catch (err) {
      console.error('Error removing comment:', err);
      setToast({ type: 'error', message: 'Failed to remove comment' });
    } finally {
      setActionLoading(null);
    }
  };

  const filteredFlags = flags.filter(flag => {
    if (filter === 'all') return true;
    return flag.targetType === filter;
  });

  if (checking || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null; // Will redirect in useAdminAuth
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Admin Moderation</h1>
                <p className="text-sm text-gray-600">Review and moderate flagged content</p>
              </div>
            </div>
            <Link 
              href="/"
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-yellow-600" />
              <div>
                <p className="text-sm text-gray-600">Total Flags</p>
                <p className="text-2xl font-bold text-gray-900">{flags.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-3">
              <Eye className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Report Flags</p>
                <p className="text-2xl font-bold text-gray-900">
                  {flags.filter(f => f.targetType === FlagTargetType.REPORT).length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Comment Flags</p>
                <p className="text-2xl font-bold text-gray-900">
                  {flags.filter(f => f.targetType === FlagTargetType.COMMENT).length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filter */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All ({flags.length})
            </button>
            <button
              onClick={() => setFilter('report')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'report'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Reports ({flags.filter(f => f.targetType === FlagTargetType.REPORT).length})
            </button>
            <button
              onClick={() => setFilter('comment')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'comment'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Comments ({flags.filter(f => f.targetType === FlagTargetType.COMMENT).length})
            </button>
          </div>
        </div>

        {/* Flags List */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {filteredFlags.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">All Clear!</h3>
            <p className="text-gray-600">No flags to review at the moment.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredFlags.map((flag) => (
              <div key={flag.id} className="bg-white rounded-lg shadow-sm border-2 border-gray-200">
                {/* Flag Header */}
                <div className="border-b border-gray-200 p-4 bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded">
                            {flag.targetType.toUpperCase()}
                          </span>
                          <span className="text-sm text-gray-600">
                            Flagged {formatTimeAgo(flag.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-gray-900">
                          Reason: {flag.reason}
                        </p>
                        <p className="text-xs text-gray-500">
                          Reporter UID: {flag.reporterId.substring(0, 12)}...
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Content Preview */}
                <div className="p-6">
                  {flag.loading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                    </div>
                  ) : flag.targetContent ? (
                    <>
                      {flag.targetType === FlagTargetType.REPORT ? (
                        <ReportPreview 
                          report={flag.targetContent as Report}
                          onAction={handleReportAction}
                          loading={actionLoading === flag.targetId}
                        />
                      ) : (
                        <CommentPreview
                          comment={flag.targetContent as Comment}
                          reportId={(flag.targetContent as Comment)?.reportId || ''}
                          onAction={handleCommentAction}
                          loading={actionLoading === flag.targetId}
                        />
                      )}
                    </>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <XCircle className="w-12 h-12 mx-auto mb-3 opacity-20" />
                      <p>Content not found or already deleted</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      
      {/* Toast Notifications */}
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

function ReportPreview({ 
  report, 
  onAction, 
  loading 
}: { 
  report: Report; 
  onAction: (id: string, status: ReportStatus) => void;
  loading: boolean;
}) {
  return (
    <div>
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-lg font-semibold capitalize">{report.type}</h3>
          <span className={`px-2 py-1 text-xs font-medium rounded ${
            report.severity === 'critical' ? 'bg-red-100 text-red-700' :
            report.severity === 'high' ? 'bg-orange-100 text-orange-700' :
            report.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
            'bg-green-100 text-green-700'
          }`}>
            {report.severity}
          </span>
          <span className={`px-2 py-1 text-xs font-medium rounded ${
            report.status === ReportStatus.ACTIVE ? 'bg-green-100 text-green-700' :
            report.status === ReportStatus.RESOLVED ? 'bg-blue-100 text-blue-700' :
            report.status === ReportStatus.EXPIRED ? 'bg-red-100 text-red-700' :
            report.status === ReportStatus.FLAGGED ? 'bg-orange-100 text-orange-700' :
            'bg-gray-100 text-gray-700'
          }`}>
            {report.status}
          </span>
        </div>
        <p className="text-gray-700 mb-2">{report.description}</p>
        <p className="text-sm text-gray-500">
          📍 {report.location.lat.toFixed(6)}, {report.location.lng.toFixed(6)}
        </p>
      </div>

      <div className="flex gap-3 pt-4 border-t border-gray-200">
        <Link
          href={`/r?id=${report.id}`}
          target="_blank"
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          View Full Report
        </Link>
        <button
          onClick={() => onAction(report.id, ReportStatus.RESOLVED)}
          disabled={loading || report.status === ReportStatus.RESOLVED}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Mark Resolved
        </button>
        <button
          onClick={() => onAction(report.id, ReportStatus.FLAGGED)}
          disabled={loading || report.status === ReportStatus.FLAGGED}
          className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Mark Disputed
        </button>
        <button
          onClick={() => onAction(report.id, ReportStatus.EXPIRED)}
          disabled={loading || report.status === ReportStatus.EXPIRED}
          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Mark Expired
        </button>
      </div>
    </div>
  );
}

function CommentPreview({ 
  comment, 
  reportId,
  onAction, 
  loading 
}: { 
  comment: Comment; 
  reportId?: string;
  onAction: (id: string) => void;
  loading: boolean;
}) {
  return (
    <div>
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className={`px-2 py-1 text-xs font-medium rounded ${
            comment.status === CommentStatus.ACTIVE ? 'bg-green-100 text-green-700' :
            'bg-red-100 text-red-700'
          }`}>
            {comment.status}
          </span>
        </div>
        <p className="text-gray-700 mb-2">{comment.text}</p>
        <p className="text-sm text-gray-500">
          By user: {comment.uid.substring(0, 12)}...
        </p>
      </div>

      <div className="flex gap-3 pt-4 border-t border-gray-200">
        {reportId && (
          <Link
            href={`/r?id=${reportId}`}
            target="_blank"
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            View Report
          </Link>
        )}
        <button
          onClick={() => onAction(comment.id)}
          disabled={loading || comment.status === CommentStatus.REMOVED}
          className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          <Trash2 className="w-4 h-4" />
          Remove Comment
        </button>
      </div>
    </div>
  );
}
