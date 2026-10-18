'use client';

/**
 * Mapbox's wordmark, which its terms ask for on any map that shows its
 * pictures through another library such as Leaflet (lib/mapTiles.ts). Put
 * inside a MapContainer; shows nothing when the map is not Mapbox's.
 *
 * It also drops Leaflet's own "Leaflet" credit (not required by its licence),
 * so that Mapbox's credits fit on one line even on a narrow map, below the
 * wordmark rather than across it.
 */

import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import { USES_MAPBOX } from '@/lib/mapTiles';

export function MapboxLogo({ className = 'bottom-5 left-1' }: { className?: string }) {
  const map = useMap();
  useEffect(() => {
    if (USES_MAPBOX) map.attributionControl?.setPrefix(false);
  }, [map]);

  if (!USES_MAPBOX) return null;
  return (
    <a
      href="https://www.mapbox.com/"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Mapbox"
      className={`absolute z-[1000] ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/mapbox-logo.svg" alt="Mapbox" width={88} height={23} />
    </a>
  );
}
