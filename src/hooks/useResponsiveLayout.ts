'use client';

import { useEffect, useState } from 'react';

/**
 * Hook to detect desktop vs mobile layout using matchMedia
 * Subscribes to viewport changes for live layout switching
 * Returns mounted state to prevent hydration mismatch
 */
export function useResponsiveLayout() {
  const [mounted, setMounted] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    setMounted(true);

    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    
    // Set initial value
    setIsDesktop(mediaQuery.matches);

    // Listen for changes
    const handler = (e: MediaQueryListEvent) => {
      setIsDesktop(e.matches);
    };

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler);
    } else {
      // Safari < 14
      mediaQuery.addListener(handler);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handler);
      } else {
        mediaQuery.removeListener(handler);
      }
    };
  }, []);

  return { mounted, isDesktop };
}
