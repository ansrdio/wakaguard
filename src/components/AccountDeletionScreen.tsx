'use client';

import { Loader2 } from 'lucide-react';
import { deleteAccount, dismissDeletionProblem, type DeletionProblem, type DeletionStage } from '@/lib/accountDeletion';
import { CONTACT_EMAIL } from '@/lib/company';

const PROBLEMS: Record<DeletionProblem, { title: string; text: string; canRetry: boolean }> = {
  'trip-running': {
    title: 'End your trip first',
    text: 'You have a trip running. End it, then delete your account. Nothing has been deleted.',
    canRetry: false,
  },
  offline: {
    title: 'No connection',
    text: 'Your account has not been deleted. Check your internet and try again.',
    canRetry: true,
  },
  failed: {
    title: 'Your account was not deleted',
    text: `Something went wrong before it finished. Try again, and if it keeps failing write to ${CONTACT_EMAIL}.`,
    canRetry: true,
  },
  // Password problems are shown in the dialog and never reach this screen
  'wrong-password': { title: 'Your account was not deleted', text: 'Please try again.', canRetry: false },
  'too-many-attempts': { title: 'Your account was not deleted', text: 'Please try again later.', canRetry: false },
};

/**
 * Takes over the whole screen while an account is being deleted, and if the
 * deletion did not go through. While it runs the server removes the profile
 * the rest of the app reads, so no ordinary screen should be showing.
 */
export function AccountDeletionScreen({ deletion }: { deletion: Exclude<DeletionStage, { stage: 'idle' }> }) {
  if (deletion.stage === 'deleting') {
    return (
      <div role="status" className="min-h-screen flex items-center justify-center bg-slate-50 p-6 text-center">
        <div className="max-w-sm">
          <Loader2 className="w-10 h-10 text-slate-500 animate-spin mx-auto" aria-hidden="true" />
          <h1 className="mt-4 text-xl font-bold text-slate-900">Deleting your account</h1>
          <p className="mt-2 text-slate-700">This can take a moment. Keep WakaGuard open.</p>
        </div>
      </div>
    );
  }

  const { title, text, canRetry } = PROBLEMS[deletion.problem];
  return (
    <div role="alert" className="min-h-screen flex items-center justify-center bg-slate-50 p-6 text-center">
      <div className="max-w-sm w-full">
        <h1 className="text-xl font-bold text-slate-900">{title}</h1>
        <p className="mt-2 text-slate-700">{text}</p>
        <div className="mt-5 space-y-2">
          {canRetry && (
            <button
              type="button"
              onClick={() => void deleteAccount()}
              className="w-full py-3.5 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700"
            >
              Try again
            </button>
          )}
          <button
            type="button"
            onClick={dismissDeletionProblem}
            className="w-full py-3.5 bg-white text-slate-900 border border-slate-300 rounded-2xl font-bold hover:bg-slate-100"
          >
            Back to WakaGuard
          </button>
        </div>
      </div>
    </div>
  );
}
