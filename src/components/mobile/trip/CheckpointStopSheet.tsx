'use client';

/**
 * "Stopped at a checkpoint?" (build 27): asks once, then the stop goes on the
 * page contacts open, with the time and where the phone is. Nobody is texted.
 */

import { createPortal } from 'react-dom';
import { Loader2 } from 'lucide-react';
import { useBackToClose } from '@/hooks/useBackToClose';

export function CheckpointStopSheet({
  onTrip,
  processing,
  onLog,
  onClose,
}: {
  /** A trip is running, so the stop shows on its page */
  onTrip: boolean;
  processing: boolean;
  onLog: () => void;
  onClose: () => void;
}) {
  useBackToClose(true, onClose);

  return createPortal(
    <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-black/50" role="dialog" aria-modal="true" aria-labelledby="checkpoint-title">
      <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-sm p-6 space-y-4">
        <h2 id="checkpoint-title" className="text-xl font-bold text-slate-900 dark:text-white">Stopped at a checkpoint?</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {onTrip
            ? 'Your contacts will see the time and where you are on your trip page. Nobody is texted.'
            : 'It is saved with the time and where you are. Start a trip first if you want your contacts to see it.'}
        </p>
        <button
          type="button"
          disabled={processing}
          onClick={onLog}
          className="w-full py-3.5 rounded-2xl font-bold bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {processing && <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />}
          Yes, log it
        </button>
        <button
          type="button"
          disabled={processing}
          onClick={onClose}
          className="w-full py-3.5 rounded-2xl font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-slate-700 dark:text-blue-200 disabled:opacity-50"
        >
          Not now
        </button>
      </div>
    </div>,
    document.body
  );
}
