'use client';

import { useEffect } from 'react';
import { useServiceWorker } from '@/hooks/useServiceWorker';

export function ServiceWorkerProvider({ children }: { children: React.ReactNode }) {
  const { isUpdateAvailable, updateServiceWorker } = useServiceWorker();

  useEffect(() => {
    if (isUpdateAvailable) {
      // Show update prompt or auto-update
      const shouldUpdate = window.confirm('A new version of WakaGuard is available. Update now?');
      if (shouldUpdate) {
        updateServiceWorker();
      }
    }
  }, [isUpdateAvailable, updateServiceWorker]);

  return <>{children}</>;
}
