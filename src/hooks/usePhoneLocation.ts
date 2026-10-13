'use client';

import { useCallback, useEffect, useState } from 'react';
import { PhoneLocation, readPhoneLocation } from '@/lib/locationCheck';

const RECHECK_MS = 20000;

/**
 * What the phone allows, kept up to date while `watching`: read at once, when
 * the app comes back to the front (the traveller may have been in settings),
 * and every so often in between. Null until the phone has answered.
 */
export function usePhoneLocation(watching: boolean): { phone: PhoneLocation | null; recheck: () => void } {
  const [phone, setPhone] = useState<PhoneLocation | null>(null);

  const recheck = useCallback(() => {
    void readPhoneLocation().then(setPhone);
  }, []);

  useEffect(() => {
    if (!watching) return;
    recheck();
    const interval = setInterval(recheck, RECHECK_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') recheck();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', recheck);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', recheck);
    };
  }, [watching, recheck]);

  return { phone: watching ? phone : null, recheck };
}
