'use client';

import { useEffect, useState } from 'react';
import { SLOW_SIGN_IN_MS } from '@/lib/signedInHint';

/**
 * The full-screen "Loading..." shown while the app starts.
 *
 * With `signingIn` (someone was signed in on this phone and the app is waiting
 * to hear that they still are) it says "Signing you in...". On a weak
 * connection that can take up to a minute, so after a few seconds it says why
 * and offers a call to 112: nobody should be stuck on this screen without help.
 */
export function AppLoader({ signingIn = false }: { signingIn?: boolean }) {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (!signingIn) return;
    const timer = setTimeout(() => setSlow(true), SLOW_SIGN_IN_MS);
    return () => clearTimeout(timer);
  }, [signingIn]);

  return (
    <div className="flex items-center justify-center min-h-screen px-6">
      <div className="text-center max-w-xs">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
        <p className="text-gray-600">{signingIn ? 'Signing you in...' : 'Loading...'}</p>
        {signingIn && slow && (
          <>
            <p className="mt-3 text-sm text-gray-600 dark:text-slate-300">
              This takes longer on a weak connection. You don&apos;t need to sign in again.
            </p>
            <a
              href="tel:112"
              className="mt-6 inline-flex items-center justify-center px-6 py-3 bg-red-600 text-white rounded-2xl font-semibold hover:bg-red-700 transition-colors"
            >
              Call 112
            </a>
          </>
        )}
      </div>
    </div>
  );
}
