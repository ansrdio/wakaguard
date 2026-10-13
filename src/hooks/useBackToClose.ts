'use client';

import { useEffect, useRef } from 'react';
import { openBackLayer } from '@/lib/backLayers';

/**
 * While `open` is true, the phone's Back button calls `close` instead of
 * leaving the screen. Use it for every sheet, pop-up and full-screen view.
 */
export function useBackToClose(open: boolean, close: () => void) {
  const closeRef = useRef(close);
  useEffect(() => {
    closeRef.current = close;
  });

  useEffect(() => {
    if (!open) return;
    return openBackLayer(() => closeRef.current());
  }, [open]);
}
