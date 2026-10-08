'use client';

import { useEffect } from 'react';
import { errorText, isLocalStoreFailure, restartPage } from '@/lib/localStore';

/**
 * Shown in place of a screen that has crashed. Without it the app shows one
 * bare line of text and no way forward, which is no state to leave someone in
 * during a trip.
 *
 * The one cause known to do this is the on-phone database stopping (see
 * localStore.ts): opening the trip map then crashed. That case reloads by
 * itself; anything else gets a button.
 */
export default function ScreenError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    console.error(`A screen crashed: ${errorText(error)}`);
    if (isLocalStoreFailure(error)) {
      restartPage('a screen crashed because the data kept on the phone stopped answering');
    }
  }, [error]);

  return (
    <div role="alert" className="min-h-screen flex items-center justify-center bg-slate-50 p-6 text-center">
      <div className="max-w-sm">
        <h1 className="text-xl font-bold text-slate-900">WakaGuard hit a problem</h1>
        <p className="mt-2 text-slate-700">
          Reload to carry on. A trip that is running keeps running, and the people you chose are still told if you
          do not arrive.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-5 w-full py-3.5 bg-brand-600 text-white rounded-2xl font-bold hover:bg-brand-700"
        >
          Reload WakaGuard
        </button>
      </div>
    </div>
  );
}
