'use client';

/**
 * A trip on Google's map (lib/googleMaps.ts): the same drawing as the old
 * TripMap.tsx, for the traveller's own trip map and the page contacts open.
 * The path travelled, the latest position (grey when old), how sure the phone
 * was of it, the planned route in grey dots, checkpoint stops and the
 * destination pin. Google's logo and terms stay in the bottom corners, as its
 * terms ask, so the button sits above them.
 */

import { useEffect, useMemo, useRef } from 'react';
import { Crosshair } from 'lucide-react';
import type { TripMapProps } from './TripMap';
import type { GoogleMapsLibraries } from '@/lib/googleMaps';
import { NIGERIA_CENTER } from '@/lib/nigerianStates';
import { pathToDraw } from '@/lib/tripPath';
import { MapNotice, useGoogleMap } from '@/components/google/useGoogleMap';
import { createHtmlMarker, dotElement, labelledDotElement } from '@/components/google/htmlMarker';

const BRAND = '#176B4F';
/** The destination's pin, in the road report pin's orange */
const DESTINATION = '#C2410C';
const STALE = '#63746B';
const STOP = '#334155';

const EDGE = 48;
const MAX_FRAMED_ZOOM = 16;
/** The latest position may come this close to the edge (a share of the view) before the map follows it */
const FOLLOW_MARGIN = 0.15;

type Line = [number, number][];

interface Removable {
  setMap(map: google.maps.Map | null): void;
}

function showAll(map: google.maps.Map, libs: GoogleMapsLibraries, line: Line, topInset: number) {
  if (line.length === 0) return;
  if (line.length === 1) {
    map.setCenter({ lat: line[0][0], lng: line[0][1] });
    map.setZoom(15);
    return;
  }
  const bounds = new libs.core.LatLngBounds();
  line.forEach(([lat, lng]) => bounds.extend({ lat, lng }));
  map.fitBounds(bounds, { top: EDGE + topInset, left: EDGE, right: EDGE, bottom: EDGE });
  libs.core.event.addListenerOnce(map, 'idle', () => {
    if ((map.getZoom() ?? 0) > MAX_FRAMED_ZOOM) map.setZoom(MAX_FRAMED_ZOOM);
  });
}

/** Whether a point is well inside what the map shows, not near its edges */
function wellInside(map: google.maps.Map, lat: number, lng: number): boolean {
  const bounds = map.getBounds();
  if (!bounds) return true;
  const ne = bounds.getNorthEast();
  const sw = bounds.getSouthWest();
  const latMargin = (ne.lat() - sw.lat()) * FOLLOW_MARGIN;
  const lngMargin = (ne.lng() - sw.lng()) * FOLLOW_MARGIN;
  return lat < ne.lat() - latMargin && lat > sw.lat() + latMargin && lng < ne.lng() - lngMargin && lng > sw.lng() + lngMargin;
}

export default function GoogleTripMap({
  path, latest, stale = false, topInset = 0, destination = null, route = null, stops = [],
}: TripMapProps) {
  const box = useRef<HTMLDivElement>(null);
  const { map, libs, state, retry } = useGoogleMap(box, {
    center: latest ? { lat: latest.lat, lng: latest.lng } : { lat: NIGERIA_CENTER.lat, lng: NIGERIA_CENTER.lng },
    zoom: latest ? 15 : 6,
  });

  const line = useMemo(() => pathToDraw(path, latest), [path, latest]);
  const colour = stale ? STALE : BRAND;
  const withDestination: Line = useMemo(
    () => (destination ? [...line, [destination.lat, destination.lng]] : line),
    [line, destination]
  );

  // Everything drawn, redrawn whenever the trip changes (a new position every couple of minutes)
  const stopsKey = stops.map((s) => `${s.lat},${s.lng},${s.label}`).join('|');
  const routeKey = route ? `${route.length}:${route[0]?.lat},${route[route.length - 1]?.lng}` : '';
  useEffect(() => {
    if (!map || !libs) return;
    const drawn: Removable[] = [];

    if (route && route.length > 1) {
      drawn.push(new libs.maps.Polyline({
        map,
        path: route,
        strokeOpacity: 0,
        clickable: false,
        zIndex: 1,
        icons: [{
          icon: { path: google.maps.SymbolPath.CIRCLE, scale: 2.5, fillColor: STALE, fillOpacity: 0.6, strokeOpacity: 0 },
          offset: '0',
          repeat: '11px',
        }],
      }));
    }

    if (line.length > 1) {
      const points = line.map(([lat, lng]) => ({ lat, lng }));
      drawn.push(new libs.maps.Polyline({ map, path: points, strokeColor: '#ffffff', strokeOpacity: 0.9, strokeWeight: 9, clickable: false, zIndex: 2 }));
      drawn.push(new libs.maps.Polyline({ map, path: points, strokeColor: colour, strokeOpacity: 1, strokeWeight: 5, clickable: false, zIndex: 3 }));
      const [startLat, startLng] = line[0];
      drawn.push(createHtmlMarker(libs, map, { lat: startLat, lng: startLng },
        dotElement({ size: 12, fill: '#ffffff', ring: colour, ringWidth: 3 }), { zIndex: 4 }));
    }

    if (latest) {
      if (typeof latest.accuracy === 'number' && latest.accuracy > 30 && latest.accuracy < 2000) {
        drawn.push(new libs.maps.Circle({
          map, center: { lat: latest.lat, lng: latest.lng }, radius: latest.accuracy,
          strokeColor: colour, strokeWeight: 1, strokeOpacity: 1, fillColor: colour, fillOpacity: 0.12, clickable: false, zIndex: 1,
        }));
      }
      drawn.push(createHtmlMarker(libs, map, { lat: latest.lat, lng: latest.lng },
        dotElement({ size: 22, fill: colour, ringWidth: 4, shadow: true }), { zIndex: 6 }));
    }

    for (const stop of stops) {
      drawn.push(createHtmlMarker(libs, map, { lat: stop.lat, lng: stop.lng },
        labelledDotElement(dotElement({ size: 16, fill: STOP, shadow: true }), stop.label), { clickable: true, zIndex: 5 }));
    }

    if (destination) {
      drawn.push(createHtmlMarker(libs, map, { lat: destination.lat, lng: destination.lng },
        labelledDotElement(dotElement({ size: 20, fill: DESTINATION, shadow: true }), 'Going here'), { clickable: true, zIndex: 7 }));
    }

    return () => drawn.forEach((thing) => thing.setMap(null));
    // The arrays are new on every update; these keys say when what they hold changed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, libs, line, colour, latest?.accuracy, stopsKey, routeKey, destination?.lat, destination?.lng]);

  // Keep the trip in view: framed once around the first point and once more when there is a line; after
  // that the map only follows the latest position if it nears the edge, so it does not fight someone looking around
  const framed = useRef(0);
  const end = line[line.length - 1];
  const endKey = end ? `${end[0]},${end[1]}` : '';
  const shape = Math.min(line.length, 2);
  useEffect(() => {
    if (!map || !libs || shape === 0) return;
    if (framed.current < shape) {
      framed.current = shape;
      showAll(map, libs, line, topInset);
      return;
    }
    const [lat, lng] = line[line.length - 1];
    if (!wellInside(map, lat, lng)) map.panTo({ lat, lng });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, libs, endKey, shape]);

  return (
    <div className="relative h-full w-full">
      <div ref={box} className="h-full w-full" />
      <MapNotice state={state} onRetry={retry} />
      {map && libs && withDestination.length > 0 && (
        <button
          type="button"
          onClick={() => showAll(map, libs, withDestination, topInset)}
          className="absolute bottom-8 right-3 z-10 w-11 h-11 bg-white rounded-full shadow-lg border border-slate-200 flex items-center justify-center text-slate-700"
          aria-label="Show the whole trip"
        >
          <Crosshair className="w-5 h-5" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
