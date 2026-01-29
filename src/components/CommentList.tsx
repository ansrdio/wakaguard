'use client';

import { Comment } from '@/lib/types';
import { MessageCircle, User } from 'lucide-react';

interface CommentListProps {
  comments: Comment[];
  loading: boolean;
}

export function CommentList({ comments, loading }: CommentListProps) {
  const formatTimeAgo = (timestamp: any) => {
    if (!timestamp?.toMillis) return 'Just now';
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (comments.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-20" />
        <p>No comments yet. Be the first to comment!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {comments.map((comment) => (
        <div key={comment.id} className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-gray-900">
                  User {comment.uid.substring(0, 8)}
                </span>
                <span className="text-xs text-gray-500">
                  {formatTimeAgo(comment.createdAt)}
                </span>
              </div>
              <p className="text-gray-700 text-sm leading-relaxed break-words">
                {comment.text}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
