'use client';

/**
 * Road reports on Google's map (lib/googleMaps.ts), as MapView.tsx shows them
 * on the old one: each report as the picture for its kind (a red ring when
 * serious), nearby reports grouped into a green count until the map is close
 * enough to tell them apart, and the person's own position in blue.
 *
 * The map stops short of anything lying over its bottom edge (the reports
 * sheet's rounded corners), because Google's logo sits in the bottom-left
 * corner and its terms do not allow covering it.
 */

import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Crosshair } from 'lucide-react';
import { STATE_CENTERS, NIGERIA_CENTER } from '@/lib/nigerianStates';
import { isSerious } from '@/lib/reportWords';
import { reportPictureSvg } from '@/lib/pictures';
import { MapLegend } from '@/components/MapLegend';
import { MapNotice, useGoogleMap } from '@/components/google/useGoogleMap';
import { createHtmlMarker, dotElement, HtmlMarker } from '@/components/google/htmlMarker';
import { Group, groupNearby } from '@/lib/mapGroups';
import type { Report } from '@/lib/types';
import type { MapViewProps } from './MapView';
import type { GoogleMapsLibraries } from '@/lib/googleMaps';

const GREEN = '#176B4F';
const PICTURE_SIZE = 34;
/** Reports closer together than this on screen are shown as one count */
const GROUP_RADIUS_PX = 50;
/** From this close in, every report shows on its own */
const NO_GROUPS_FROM_ZOOM = 17;

function reportElement(type: string, serious: boolean, selected: boolean): HTMLDivElement {
  const holder = document.createElement('div');
  holder.style.cursor = 'pointer';
  holder.setAttribute('role', 'button');
  holder.innerHTML = `<div style="width:${PICTURE_SIZE}px;height:${PICTURE_SIZE}px;border-radius:10px;overflow:hidden;line-height:0;box-shadow:0 0 0 2px white, ${serious ? '0 0 0 5px #dc2626, ' : ''}0 3px 8px rgba(0,0,0,0.35)${selected ? ', 0 0 0 9px rgba(59, 130, 246, 0.55)' : ''};">${reportPictureSvg(type, PICTURE_SIZE)}</div>`;
  return holder;
}

function groupElement(count: number): HTMLDivElement {
  const group = document.createElement('div');
  group.textContent = String(count);
  group.setAttribute('role', 'button');
  group.setAttribute('aria-label', `${count} reports here. Tap to see them`);
  Object.assign(group.style, {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: GREEN,
    border: '3px solid white',
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    font: '700 14px system-ui, -apple-system, sans-serif',
    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
    cursor: 'pointer',
  });
  return group;
}

function moveTo(map: google.maps.Map, center: google.maps.LatLngLiteral, zoom: number) {
  map.setZoom(zoom);
  map.panTo(center);
}

function zoomInto(map: google.maps.Map, libs: GoogleMapsLibraries, group: Group<Report>) {
  const bounds = new libs.core.LatLngBounds();
  group.members.forEach((r) => bounds.extend(r.location));
  map.fitBounds(bounds, 64);
  libs.core.event.addListenerOnce(map, 'idle', () => {
    // All in one spot: fitting cannot pull them apart, so go in to where they show one by one
    if ((map.getZoom() ?? 0) < NO_GROUPS_FROM_ZOOM && group.members.every((r) => r.location.lat === group.members[0].location.lat && r.location.lng === group.members[0].location.lng)) {
      map.setZoom(NO_GROUPS_FROM_ZOOM);
    }
  });
}

const GoogleMapView = memo(function GoogleMapView({
  reports, selectedReportId, onMarkerClick, selectedState, userLocation, onLocate, locating,
}: MapViewProps) {
  const box = useRef<HTMLDivElement>(null);

  // Where the map first opens: the first report, else the chosen state, else the middle of Nigeria
  const opening = useMemo(() => {
    if (reports.length > 0) return { center: reports[0].location, zoom: 12 };
    if (selectedState && STATE_CENTERS[selectedState]) {
      const c = STATE_CENTERS[selectedState];
      return { center: { lat: c.lat, lng: c.lng }, zoom: c.zoom };
    }
    return { center: { lat: NIGERIA_CENTER.lat, lng: NIGERIA_CENTER.lng }, zoom: NIGERIA_CENTER.zoom };
    // Only the first opening matters; later changes move the map below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const { map, libs, state, retry } = useGoogleMap(box, { center: opening.center, zoom: opening.zoom });

  // The zoom after each move: the groups depend on it, not on where the map is
  const [zoom, setZoom] = useState(opening.zoom);
  useEffect(() => {
    if (!map) return;
    const listener = map.addListener('idle', () => setZoom(Math.round(map.getZoom() ?? opening.zoom)));
    return () => listener.remove();
  }, [map, opening.zoom]);

  const clicked = useRef(onMarkerClick);
  useEffect(() => {
    clicked.current = onMarkerClick;
  }, [onMarkerClick]);

  // The reports, grouped for the current zoom. Redrawn only when the groups or the chosen report change.
  const groups = useMemo(
    () => groupNearby(reports, zoom >= NO_GROUPS_FROM_ZOOM ? 0 : GROUP_RADIUS_PX, zoom),
    [reports, zoom]
  );
  const groupsKey = groups.map((g) => g.members.map((r) => `${r.id}:${r.type}:${r.severity}`).join(',')).join('|');
  useEffect(() => {
    if (!map || !libs) return;
    const drawn: HtmlMarker[] = groups.map((group) => {
      if (group.members.length === 1) {
        const report = group.members[0];
        const selected = report.id === selectedReportId;
        const element = reportElement(report.type, isSerious(report.severity), selected);
        element.addEventListener('click', () => clicked.current(report.id));
        return createHtmlMarker(libs, map, report.location, element, { clickable: true, zIndex: selected ? 30 : 20 });
      }
      const element = groupElement(group.members.length);
      element.addEventListener('click', () => zoomInto(map, libs, group));
      return createHtmlMarker(libs, map, group.center, element, { clickable: true, zIndex: 25 });
    });
    return () => drawn.forEach((marker) => marker.setMap(null));
    // groupsKey says when the groups changed; the array itself is new on every move
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, libs, groupsKey, selectedReportId]);

  // The person's own position
  useEffect(() => {
    if (!map || !libs || !userLocation) return;
    const dot = dotElement({ size: 20, fill: '#3b82f6', ringWidth: 3 });
    dot.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.3)';
    const marker = createHtmlMarker(libs, map, userLocation, dot, { zIndex: 10 });
    return () => marker.setMap(null);
  }, [map, libs, userLocation]);

  // Moving the map. Priority 1: a report chosen in the list or on the map
  const lastMove = useRef<'report' | 'user' | 'state' | null>(null);
  useEffect(() => {
    if (!map) return;
    if (selectedReportId) {
      const report = reports.find((r) => r.id === selectedReportId);
      if (report) {
        lastMove.current = 'report';
        moveTo(map, report.location, 14);
      }
    } else if (lastMove.current === 'report') {
      lastMove.current = null;
    }
  }, [selectedReportId, reports, map]);

  // Priority 2: the person's position, when a "find me" request brings one back. Asking is a
  // choice made just now, so it wins over an open report. A request that fails leaves the map where it is.
  const locatingFrom = useRef<MapViewProps['userLocation'] | undefined>(undefined);
  useEffect(() => {
    if (!map) return;
    if (locating) {
      locatingFrom.current = userLocation;
      return;
    }
    const before = locatingFrom.current;
    locatingFrom.current = undefined;
    if (before !== undefined && userLocation && userLocation !== before) {
      lastMove.current = 'user';
      moveTo(map, userLocation, 15);
    }
  }, [locating, userLocation, map]);

  // Priority 3: a different state chosen, unless a report or the person's position is being shown
  useEffect(() => {
    if (!map || !selectedState || !STATE_CENTERS[selectedState]) return;
    if (lastMove.current === 'report' || lastMove.current === 'user') return;
    const centre = STATE_CENTERS[selectedState];
    lastMove.current = 'state';
    moveTo(map, { lat: centre.lat, lng: centre.lng }, centre.zoom);
  }, [selectedState, map]);

  return (
    <div className="relative h-full w-full z-0">
      <div ref={box} className="absolute inset-x-0 top-0" style={{ bottom: 'var(--map-bottom-clear, 0px)' }} />
      <MapNotice state={state} onRetry={retry} />

      {onLocate && (
        <button
          onClick={onLocate}
          disabled={locating}
          className="absolute right-6 z-10 p-3 bg-white hover:bg-slate-50 rounded-full shadow-lg border border-slate-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ bottom: 'calc(2.25rem + var(--map-bottom-clear, 0px))' }}
          title="Use my location"
        >
          {locating ? (
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent" />
          ) : (
            <Crosshair className="w-5 h-5 text-slate-700" />
          )}
        </button>
      )}

      <MapLegend clearOfLogo />
    </div>
  );
});

export default GoogleMapView;
