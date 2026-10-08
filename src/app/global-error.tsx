'use client';

import { useEffect } from 'react';
import { errorText, isLocalStoreFailure, restartPage } from '@/lib/localStore';

/**
 * The same as error.tsx, for a crash in the frame every screen sits in (the
 * theme and sign-in wrappers). It replaces the whole page, so it brings its
 * own html and body and cannot rely on the app's stylesheet.
 */
export default function AppError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    console.error(`The app crashed: ${errorText(error)}`);
    if (isLocalStoreFailure(error)) {
      restartPage('the app crashed because the data kept on the phone stopped answering');
    }
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          textAlign: 'center',
          background: '#f8fafc',
          color: '#0f172a',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        <div role="alert" style={{ maxWidth: 360 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>WakaGuard hit a problem</h1>
          <p style={{ marginTop: 8, color: '#334155' }}>
            Reload to carry on. A trip that is running keeps running, and the people you chose are still told if you
            do not arrive.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              marginTop: 20,
              width: '100%',
              padding: '14px 0',
              background: '#11763f',
              color: '#ffffff',
              border: 0,
              borderRadius: 16,
              fontSize: 16,
              fontWeight: 700,
            }}
          >
            Reload WakaGuard
          </button>
        </div>
      </body>
    </html>
  );
}
