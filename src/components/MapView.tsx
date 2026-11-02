'use client';

import { useEffect, useRef, useMemo, memo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { MAP_TILES } from '@/lib/mapTiles';
import { MapboxLogo } from '@/components/MapboxLogo';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import { Crosshair, MapPin } from 'lucide-react';
import { Report } from '@/lib/types';
import { NigerianState, STATE_CENTERS, NIGERIA_CENTER } from '@/lib/nigerianStates';
import { useLeafletResizeObserver } from '@/hooks/useLeafletInvalidateSize';
import { isSerious, reportTypeWord } from '@/lib/reportWords';
import { MapLegend } from '@/components/MapLegend';
import { reportPictureSvg } from '@/lib/pictures';

const icon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = icon;

// A report's pin is the picture for its kind. A serious report has a red ring
// round the picture, the only red on this map.
function createCustomIcon(type: string, serious: boolean, isSelected: boolean) {
  const size = 34;

  return L.divIcon({
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        border-radius: 10px;
        overflow: hidden;
        line-height: 0;
        box-shadow: 0 0 0 2px white, ${serious ? '0 0 0 5px #dc2626, ' : ''}0 3px 8px rgba(0,0,0,0.35)${isSelected ? ', 0 0 0 9px rgba(59, 130, 246, 0.55)' : ''};
        transition: all 0.2s;
      ">${reportPictureSvg(type, size)}</div>
    `,
    className: 'custom-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

interface MapControllerProps {
  selectedReportId: string | null;
  reports: Report[];
  userLocation: { lat: number; lng: number } | null;
  selectedState: NigerianState | null;
  /** A "find me" request is running, from whichever button */
  locating: boolean;
}

/**
 * Moves the map, gliding when it can be seen. A map behind another tab has no
 * size, and Leaflet's glide then works out a position of NaN and throws, which
 * took the whole screen down (seen in a local test on 14 October 2026). Such a
 * map is set in place instead, and no failed move is allowed to crash a screen.
 */
function moveMap(map: ReturnType<typeof useMap>, center: [number, number], zoom: number, duration: number) {
  try {
    const size = map.getSize();
    if (size.x > 0 && size.y > 0) map.flyTo(center, zoom, { duration });
    else map.setView(center, zoom, { animate: false });
  } catch (error) {
    console.warn('The map could not move:', error);
  }
}

function MapController({ selectedReportId, reports, userLocation, selectedState, locating }: MapControllerProps) {
  const map = useMap();
  const mapRef = useRef(map);
  const lastNavRef = useRef<'report' | 'user' | 'state' | null>(null);
  // What the person's position was when a "find me" request began; undefined when none is running
  const locatingFromRef = useRef<MapControllerProps['userLocation'] | undefined>(undefined);

  // Keep mapRef updated
  useEffect(() => {
    mapRef.current = map;
  }, [map]);
  
  // Invalidate size on mount and when map is ready
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 100);
    return () => clearTimeout(timer);
  }, [map]);

  // And whenever the map's box changes size, as when its tab is shown again
  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') return;
    const watcher = new ResizeObserver(() => map.invalidateSize());
    watcher.observe(map.getContainer());
    return () => watcher.disconnect();
  }, [map]);
  
  // Priority 1: Selected report
  useEffect(() => {
    if (selectedReportId) {
      const report = reports.find(r => r.id === selectedReportId);
      if (report) {
        lastNavRef.current = 'report';
        moveMap(map, [report.location.lat, report.location.lng], 14, 0.5);
      }
    } else {
      // Clear report nav when deselected
      if (lastNavRef.current === 'report') {
        lastNavRef.current = null;
      }
    }
  }, [selectedReportId, reports, map]);

  // Priority 2: User location, when a "find me" request brings one back. A
  // first fix can take up to 10 seconds, and on a phone the button is in the
  // top bar, not on this map. Asking is a choice made just now, so it wins
  // over an open report. A request that fails leaves the map where it is.
  useEffect(() => {
    if (locating) {
      locatingFromRef.current = userLocation;
      return;
    }
    const before = locatingFromRef.current;
    locatingFromRef.current = undefined;
    if (before !== undefined && userLocation && userLocation !== before) {
      lastNavRef.current = 'user';
      moveMap(map, [userLocation.lat, userLocation.lng], 15, 1);
    }
  }, [locating, userLocation, map]);

  // Priority 3: State change (only if not viewing report or user location)
  useEffect(() => {
    if (
      selectedState && 
      STATE_CENTERS[selectedState] && 
      lastNavRef.current !== 'report' && 
      lastNavRef.current !== 'user'
    ) {
      const center = STATE_CENTERS[selectedState];
      lastNavRef.current = 'state';
      moveMap(map, [center.lat, center.lng], center.zoom, 1);
    }
  }, [selectedState, map]);

  return null;
}

interface MapViewProps {
  reports: Report[];
  selectedReportId: string | null;
  onMarkerClick: (reportId: string) => void;
  selectedState?: NigerianState | null;
  userLocation?: { lat: number; lng: number } | null;
  onLocate?: () => void;
  locating?: boolean;
}

const MapView = memo(function MapView({ reports, selectedReportId, onMarkerClick, selectedState, userLocation, onLocate, locating }: MapViewProps) {
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });
  }, []);

  // Memoize center calculation - use Nigerian state center or Nigeria center
  const defaultCenter: [number, number] = useMemo(() => {
    if (reports.length > 0) {
      return [reports[0].location.lat, reports[0].location.lng];
    }
    
    // Use selected state center if available
    if (selectedState && STATE_CENTERS[selectedState]) {
      const center = STATE_CENTERS[selectedState];
      return [center.lat, center.lng];
    }
    
    // Default to Nigeria center
    return [NIGERIA_CENTER.lat, NIGERIA_CENTER.lng];
  }, [reports, selectedState]);

  // Calculate appropriate zoom level
  const defaultZoom = useMemo(() => {
    if (reports.length > 0) {
      return 12;
    }
    
    // Use selected state zoom if available
    if (selectedState && STATE_CENTERS[selectedState]) {
      return STATE_CENTERS[selectedState].zoom;
    }
    
    // Default to Nigeria zoom
    return NIGERIA_CENTER.zoom;
  }, [reports, selectedState]);

  const containerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  
  // Watch for container resize and invalidate map
  useLeafletResizeObserver(containerRef, leafletMapRef);
  
  return (
    <div ref={containerRef} className="relative h-full w-full z-0">
      {/* Floating Locate Me Button */}
      {onLocate && (
        <button
          onClick={onLocate}
          disabled={locating}
          className="absolute right-6 z-[1000] p-3 bg-white hover:bg-slate-50 rounded-full shadow-lg border border-slate-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ bottom: 'calc(1.5rem + var(--map-bottom-clear, 0px))' }}
          title="Use my location"
        >
          {locating ? (
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent" />
          ) : (
            <Crosshair className="w-5 h-5 text-slate-700" />
          )}
        </button>
      )}

      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        className="h-full w-full"
        ref={leafletMapRef}
      >
      <TileLayer {...MAP_TILES} />
        <MapboxLogo className="bottom-[5.5rem] left-4" />
      
      <MapController 
        selectedReportId={selectedReportId} 
        reports={reports} 
        userLocation={userLocation || null} 
        selectedState={selectedState || null}
        locating={!!locating}
      />
      
      {/* User Location Marker (outside cluster) */}
      {userLocation && (
        <Marker 
          position={[userLocation.lat, userLocation.lng]}
          icon={L.divIcon({
            html: `
              <div style="
                width: 20px;
                height: 20px;
                background-color: #3b82f6;
                border: 3px solid white;
                border-radius: 50%;
                box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.3);
              "></div>
            `,
            className: 'user-location-marker',
            iconSize: [20, 20],
            iconAnchor: [10, 10],
          })}
        >
          <Popup>
            <div className="text-sm">
              <p className="font-semibold">Your Location</p>
            </div>
          </Popup>
        </Marker>
      )}
      
      {/* Clustered Report Markers */}
      <MarkerClusterGroup
        chunkedLoading
        maxClusterRadius={50}
        showCoverageOnHover={false}
        spiderfyOnMaxZoom={true}
        iconCreateFunction={(cluster: any) => {
          const count = cluster.getChildCount();
          let size = 'small';
          // One green for every group: red is kept for SOS (design PDF, build 25)
          const color = '#176B4F';
          
          if (count >= 10) {
            size = 'large';
          } else if (count >= 5) {
            size = 'medium';
          }
          
          return L.divIcon({
            html: `<div style="
              width: 40px;
              height: 40px;
              background-color: ${color};
              border: 3px solid white;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-weight: bold;
              font-size: 14px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            ">${count}</div>`,
            className: 'marker-cluster',
            iconSize: [40, 40],
          });
        }}
      >
        {reports.map((report) => (
          <Marker
            key={report.id}
            position={[report.location.lat, report.location.lng]}
            icon={createCustomIcon(report.type, isSerious(report.severity), report.id === selectedReportId)}
            eventHandlers={{
              click: () => onMarkerClick(report.id)
            }}
          >
            <Popup>
              <div className="p-2 min-w-[200px]">
                <h3 className="font-semibold mb-1">{reportTypeWord(report.type)}</h3>
                <p className="text-sm text-gray-600 mb-2">{report.description}</p>
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                  {isSerious(report.severity) && (
                    <span className="px-2 py-1 rounded bg-red-100 text-red-700">Serious</span>
                  )}
                  <span>👍 {report.upvotes}</span>
                  <span>👎 {report.downvotes}</span>
                </div>
                <button
                  onClick={() => onMarkerClick(report.id)}
                  className="w-full px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors"
                >
                  View details
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MarkerClusterGroup>
    </MapContainer>
    <MapLegend />
    </div>
  );
});

export default MapView;
