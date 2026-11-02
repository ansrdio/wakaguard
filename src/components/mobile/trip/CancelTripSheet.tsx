'use client';

/**
 * "Cancel this trip?": for someone who started a trip and then did not set
 * off. It asks once, because ending a trip this way cannot be undone and,
 * unlike "I've arrived", tells nobody anything.
 */

import { createPortal } from 'react-dom';
import { Loader2 } from 'lucide-react';
import { useBackToClose } from '@/hooks/useBackToClose';

export function CancelTripSheet({
  contactsWereTexted,
  processing,
  onCancelTrip,
  onClose,
}: {
  /** An alert already went out, so the server will follow it with an all-clear */
  contactsWereTexted: boolean;
  processing: boolean;
  onCancelTrip: () => void;
  onClose: () => void;
}) {
  useBackToClose(true, onClose);

  // Drawn at the top of the page, above the full-screen trip map, which opens it too
  return createPortal(
    <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-black/50" role="dialog" aria-modal="true" aria-labelledby="cancel-trip-title">
      <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-sm p-6 space-y-4">
        <h2 id="cancel-trip-title" className="text-xl font-bold text-slate-900 dark:text-white">Cancel this trip?</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {contactsWereTexted
            ? 'Your contacts were alerted, so they will be told you checked in. Your location stops being shared.'
            : 'Your contacts won’t be told you arrived. Your location stops being shared.'}
        </p>
        <button
          type="button"
          disabled={processing}
          onClick={onCancelTrip}
          className="w-full py-3.5 rounded-2xl font-bold bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {processing && <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />}
          Cancel trip
        </button>
        <button
          type="button"
          disabled={processing}
          onClick={onClose}
          className="w-full py-3.5 rounded-2xl font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-slate-700 dark:text-blue-200 disabled:opacity-50"
        >
          Keep trip
        </button>
      </div>
    </div>,
    document.body
  );
}
