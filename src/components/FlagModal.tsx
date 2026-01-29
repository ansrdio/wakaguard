'use client';

import { useState } from 'react';
import { X, Flag, AlertTriangle } from 'lucide-react';

interface FlagModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<{ success: boolean; error?: string }>;
  targetType: 'report' | 'comment';
}

const FLAG_REASONS = [
  'Spam or misleading',
  'Inappropriate content',
  'Harassment or hate speech',
  'False information',
  'Duplicate report',
  'Other',
];

export function FlagModal({ isOpen, onClose, onSubmit, targetType }: FlagModalProps) {
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const finalReason = selectedReason === 'Other' && customReason.trim()
      ? customReason.trim()
      : selectedReason;

    if (!finalReason) {
      setError('Please select or enter a reason');
      return;
    }

    setSubmitting(true);

    const result = await onSubmit(finalReason);

    setSubmitting(false);

    if (result.success) {
      onClose();
      setSelectedReason('');
      setCustomReason('');
    } else {
      setError(result.error || 'Failed to submit flag');
    }
  };

  const handleClose = () => {
    if (!submitting) {
      onClose();
      setSelectedReason('');
      setCustomReason('');
      setError(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="border-b border-gray-200 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flag className="w-5 h-5 text-red-500" />
            <h2 className="text-xl font-bold text-gray-900">
              Flag {targetType === 'report' ? 'Report' : 'Comment'}
            </h2>
          </div>
          <button
            onClick={handleClose}
            disabled={submitting}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="flex items-start gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg mb-6">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-yellow-800">
              Flagging helps keep our community safe. Please select a reason for flagging this {targetType}.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="space-y-3 mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select a reason *
            </label>
            {FLAG_REASONS.map((reason) => (
              <label key={reason} className="flex items-start gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="reason"
                  value={reason}
                  checked={selectedReason === reason}
                  onChange={(e) => setSelectedReason(e.target.value)}
                  disabled={submitting}
                  className="mt-1 w-4 h-4 text-blue-500 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{reason}</span>
              </label>
            ))}
          </div>

          {selectedReason === 'Other' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Please explain
              </label>
              <textarea
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Describe the issue..."
                rows={3}
                maxLength={200}
                disabled={submitting}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
              />
              <p className="text-xs text-gray-500 mt-1">
                {customReason.length}/200 characters
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={submitting}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !selectedReason}
              className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting...' : 'Submit Flag'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
