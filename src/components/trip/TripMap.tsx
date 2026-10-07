'use client';

import { useEffect, useMemo, useRef } from 'react';
import { Circle, CircleMarker, MapContainer, Polyline, TileLayer, useMap } from 'react-leaflet';
import type { Map as LeafletMap } from 'leaflet';
import { Crosshair } from 'lucide-react';
import { MAP_TILES } from '@/lib/mapTiles';
import { NIGERIA_CENTER } from '@/lib/nigerianStates';
import { useLeafletResizeObserver } from '@/hooks/useLeafletInvalidateSize';
import { TripPathPoint } from '@/lib/types';
import { pathToDraw } from '@/lib/tripPath';

export interface TripMapProps {
  /** Where the trip has been, oldest first */
  path: TripPathPoint[];
  /** The latest position, or null when none has arrived yet */
  latest: { lat: number; lng: number; accuracy?: number } | null;
  /** The latest position is old, so it is drawn as where the person was */
  stale?: boolean;
  /** Height in pixels of anything laid over the top of the map, so the trip is framed below it */
  topInset?: number;
}

const BRAND = '#11763f';
const STALE = '#64748b';

const EDGE = 48;

const showAll = (map: LeafletMap, line: [number, number][], topInset: number) => {
  if (line.length === 1) map.setView(line[0], 15);
  else map.fitBounds(line, { paddingTopLeft: [EDGE, EDGE + topInset], paddingBottomRight: [EDGE, EDGE], maxZoom: 16 });
};

/**
 * Keeps the trip in view. The latest position usually arrives before the path
 * does, so the map is framed once around the single point and once more when
 * there is a line to show. After that it only follows the latest position if
 * that leaves the screen, so it does not fight someone who is looking around.
 */
function KeepInView({ line, topInset }: { line: [number, number][]; topInset: number }) {
  const map = useMap();
  /** 0: nothing framed yet, 1: framed a single point, 2: framed a line */
  const framed = useRef(0);
  const end = line[line.length - 1];
  const endKey = end ? `${end[0]},${end[1]}` : '';
  const shape = Math.min(line.length, 2);

  useEffect(() => {
    if (shape === 0) return;
    if (framed.current < shape) {
      framed.current = shape;
      showAll(map, line, topInset);
      return;
    }
    const latest = line[line.length - 1];
    if (!map.getBounds().pad(-0.15).contains(latest)) map.panTo(latest);
    // The line is a new array on every update; its end point and whether it is a point or a line are what matter
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endKey, shape, map]);

  return null;
}

function ShowAllButton({ line, topInset }: { line: [number, number][]; topInset: number }) {
  const map = useMap();
  if (line.length === 0) return null;
  return (
    <button
      type="button"
      onClick={() => showAll(map, line, topInset)}
      className="absolute bottom-4 right-4 z-[1000] w-11 h-11 bg-white rounded-full shadow-lg border border-slate-200 flex items-center justify-center text-slate-700"
      aria-label="Show the whole trip"
    >
      <Crosshair className="w-5 h-5" aria-hidden="true" />
    </button>
  );
}

/**
 * A trip on a map: the path travelled so far and the latest position.
 * Used for the traveller's own trip map and for the page a contact opens.
 * It draws only what the phone has reported; there is no planned route.
 */
export default function TripMap({ path, latest, stale = false, topInset = 0 }: TripMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  useLeafletResizeObserver(containerRef, mapRef);

  const line = useMemo(() => pathToDraw(path, latest), [path, latest]);
  const start = line.length > 1 ? line[0] : null;
  const colour = stale ? STALE : BRAND;

  return (
    <div ref={containerRef} className="relative h-full w-full">
      <MapContainer
        center={latest ? [latest.lat, latest.lng] : [NIGERIA_CENTER.lat, NIGERIA_CENTER.lng]}
        zoom={latest ? 15 : 6}
        className="h-full w-full"
        ref={mapRef}
        zoomControl={false}
      >
        <TileLayer attribution={MAP_TILES.attribution} url={MAP_TILES.url} maxZoom={MAP_TILES.maxZoom} />
        <KeepInView line={line} topInset={topInset} />

        {line.length > 1 && (
          <>
            <Polyline positions={line} pathOptions={{ color: '#ffffff', weight: 9, opacity: 0.9 }} />
            <Polyline positions={line} pathOptions={{ color: colour, weight: 5, opacity: 1 }} />
          </>
        )}

        {start && (
          <CircleMarker
            center={start}
            radius={6}
            pathOptions={{ color: colour, weight: 3, fillColor: '#ffffff', fillOpacity: 1 }}
          />
        )}

        {latest && (
          <>
            {typeof latest.accuracy === 'number' && latest.accuracy > 30 && latest.accuracy < 2000 && (
              <Circle
                center={[latest.lat, latest.lng]}
                radius={latest.accuracy}
                pathOptions={{ color: colour, weight: 1, fillColor: colour, fillOpacity: 0.12 }}
              />
            )}
            <CircleMarker
              center={[latest.lat, latest.lng]}
              radius={10}
              pathOptions={{ color: '#ffffff', weight: 4, fillColor: colour, fillOpacity: 1 }}
            />
          </>
        )}

        <ShowAllButton line={line} topInset={topInset} />
      </MapContainer>
    </div>
  );
}
