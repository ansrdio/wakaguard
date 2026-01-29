import { useEffect, useRef } from 'react';
import type { Map as LeafletMap } from 'leaflet';

/**
 * Debounced hook to call map.invalidateSize() when dependencies change
 * Fixes map sizing issues after container layout changes
 * 
 * @param mapRef - React ref to the Leaflet map instance
 * @param dependencies - Array of dependencies that trigger invalidation
 * @param debounceMs - Debounce delay in milliseconds (default: 100ms)
 */
export function useLeafletInvalidateSize(
  mapRef: React.RefObject<LeafletMap | null>,
  dependencies: any[] = [],
  debounceMs: number = 100
) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear any pending invalidation
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Debounce the invalidateSize call
    timeoutRef.current = setTimeout(() => {
      if (mapRef.current) {
        try {
          mapRef.current.invalidateSize();
        } catch (error) {
          console.warn('Failed to invalidate map size:', error);
        }
      }
    }, debounceMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, dependencies);
}

/**
 * Hook to observe container resize and invalidate map size
 * Uses ResizeObserver for accurate container dimension changes
 * 
 * @param containerRef - React ref to the map container element
 * @param mapRef - React ref to the Leaflet map instance
 */
export function useLeafletResizeObserver(
  containerRef: React.RefObject<HTMLElement | null>,
  mapRef: React.RefObject<LeafletMap | null>
) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let timeoutId: NodeJS.Timeout | null = null;

    const resizeObserver = new ResizeObserver(() => {
      // Debounce resize events
      if (timeoutId) clearTimeout(timeoutId);
      
      timeoutId = setTimeout(() => {
        if (mapRef.current) {
          try {
            mapRef.current.invalidateSize();
          } catch (error) {
            console.warn('Failed to invalidate map size on resize:', error);
          }
        }
      }, 150);
    });

    resizeObserver.observe(container);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      resizeObserver.disconnect();
    };
  }, [containerRef, mapRef]);
}
