'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { PositionFix, currentPosition } from '@/lib/recentPosition';

/**
 * Keeps the phone's latest position at hand, so an alert can carry it without
 * waiting for GPS. Asks once when the screen opens and again whenever
 * `refresh` is called or the app comes back to the front.
 */
export function useRecentPosition() {
  const [fix, setFix] = useState<PositionFix | null>(null);
  const fixRef = useRef<PositionFix | null>(null);

  const refresh = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude, atMs: Date.now() };
        fixRef.current = next;
        setFix(next);
      },
      () => console.warn('Could not get a position for safety messages'),
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 15000 }
    );
  }, []);

  useEffect(() => {
    refresh();
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [refresh]);

  /** The position to send as "where I am now", or null if the last fix is missing or too old */
  const current = useCallback(() => currentPosition(fixRef.current, Date.now()), []);

  return { hasFix: !!fix, current, refresh };
}
