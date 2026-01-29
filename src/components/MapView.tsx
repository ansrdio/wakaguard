'use client';

import { useEffect, useRef, useMemo, memo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import { Crosshair, MapPin } from 'lucide-react';
import { Report, Severity } from '@/lib/types';
import { NigerianState, STATE_CENTERS, NIGERIA_CENTER } from '@/lib/nigerianStates';
import { useLeafletResizeObserver } from '@/hooks/useLeafletInvalidateSize';
import { getLandmarksByState, getLandmarkIcon, Landmark } from '@/lib/landmarks';
import { MapLegend } from '@/components/MapLegend';

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

const severityColors: Record<Severity, string> = {
  [Severity.CRITICAL]: '#dc2626',
  [Severity.HIGH]: '#ea580c',
  [Severity.MEDIUM]: '#ca8a04',
  [Severity.LOW]: '#16a34a',
};

function createCustomIcon(severity: Severity, isSelected: boolean) {
  const color = severityColors[severity];
  const size = 30;
  
  return L.divIcon({
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        background-color: ${color};
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        ${isSelected ? 'box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.5), 0 2px 8px rgba(0,0,0,0.3);' : ''}
        transition: all 0.2s;
      "></div>
    `,
    className: 'custom-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

function createLandmarkIcon(emoji: string) {
  return L.divIcon({
    html: `
      <div style="
        width: 28px;
        height: 28px;
        background-color: rgba(255, 255, 255, 0.95);
        border: 2px solid #94a3b8;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        box-shadow: 0 1px 4px rgba(0,0,0,0.2);
      ">${emoji}</div>
    `,
    className: 'landmark-marker',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
}

interface LandmarkLayerProps {
  selectedState: NigerianState | null;
}

function LandmarkLayer({ selectedState }: LandmarkLayerProps) {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());
  const [landmarks, setLandmarks] = useState<Landmark[]>([]);

  useEffect(() => {
    const handleZoom = () => setZoom(map.getZoom());
    map.on('zoomend', handleZoom);
    return () => { map.off('zoomend', handleZoom); };
  }, [map]);

  useEffect(() => {
    if (selectedState) {
      setLandmarks(getLandmarksByState(selectedState));
    } else {
      setLandmarks([]);
    }
  }, [selectedState]);

  if (zoom < 11 || landmarks.length === 0) return null;

  return (
    <>
      {landmarks.map((landmark) => (
        <Marker
          key={landmark.id}
          position={[landmark.lat, landmark.lng]}
          icon={createLandmarkIcon(getLandmarkIcon(landmark.category))}
        >
          <Popup>
            <div className="text-sm">
              <p className="font-semibold">{landmark.name}</p>
              <p className="text-xs text-slate-500 capitalize">{landmark.category}</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  );
}

interface MapControllerProps {
  selectedReportId: string | null;
  reports: Report[];
  userLocation: { lat: number; lng: number } | null;
  selectedState: NigerianState | null;
  shouldFollowUser: boolean;
}

function MapController({ selectedReportId, reports, userLocation, selectedState, shouldFollowUser }: MapControllerProps) {
  const map = useMap();
  const mapRef = useRef(map);
  const lastNavRef = useRef<'report' | 'user' | 'state' | null>(null);
  
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
  
  // Priority 1: Selected report
  useEffect(() => {
    if (selectedReportId) {
      const report = reports.find(r => r.id === selectedReportId);
      if (report) {
        lastNavRef.current = 'report';
        map.flyTo([report.location.lat, report.location.lng], 14, {
          duration: 0.5
        });
      }
    } else {
      // Clear report nav when deselected
      if (lastNavRef.current === 'report') {
        lastNavRef.current = null;
      }
    }
  }, [selectedReportId, reports, map]);

  // Priority 2: User location (only when shouldFollowUser is true)
  useEffect(() => {
    if (userLocation && shouldFollowUser && lastNavRef.current !== 'report') {
      lastNavRef.current = 'user';
      map.flyTo([userLocation.lat, userLocation.lng], 15, {
        duration: 1
      });
    }
  }, [userLocation, shouldFollowUser, map]);

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
      map.flyTo([center.lat, center.lng], center.zoom, {
        duration: 1
      });
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
  const [shouldFollowUser, setShouldFollowUser] = useState(false);

  // Handle locate button click
  const handleLocateClick = () => {
    if (onLocate) {
      setShouldFollowUser(true);
      onLocate();
      // Reset after navigation completes
      setTimeout(() => setShouldFollowUser(false), 2000);
    }
  };

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
      {/* Compact severity legend - minimal overlay */}
      <div className="absolute top-4 right-4 z-[1000] bg-white/95 backdrop-blur-sm rounded-lg shadow-md px-2.5 py-2 border border-slate-200">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-red-600" />
            <div className="w-2 h-2 rounded-full bg-orange-600" />
            <div className="w-2 h-2 rounded-full bg-yellow-600" />
            <div className="w-2 h-2 rounded-full bg-green-600" />
          </div>
          <span className="text-[10px] text-slate-500 font-medium">Severity</span>
        </div>
      </div>

      {/* Floating Locate Me Button */}
      {onLocate && (
        <button
          onClick={handleLocateClick}
          disabled={locating}
          className="absolute bottom-6 right-6 z-[1000] p-3 bg-white hover:bg-slate-50 rounded-full shadow-lg border border-slate-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />
      
      <MapController 
        selectedReportId={selectedReportId} 
        reports={reports} 
        userLocation={userLocation || null} 
        selectedState={selectedState || null}
        shouldFollowUser={shouldFollowUser}
      />
      
      {/* Landmark Markers - visible at zoom 11+ */}
      <LandmarkLayer selectedState={selectedState || null} />
      
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
          let color = '#3b82f6';
          
          if (count >= 10) {
            size = 'large';
            color = '#dc2626';
          } else if (count >= 5) {
            size = 'medium';
            color = '#ea580c';
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
            icon={createCustomIcon(report.severity, report.id === selectedReportId)}
            eventHandlers={{
              click: () => onMarkerClick(report.id)
            }}
          >
            <Popup>
              <div className="p-2 min-w-[200px]">
                <h3 className="font-semibold capitalize mb-1">{report.type}</h3>
                <p className="text-sm text-gray-600 mb-2">{report.description}</p>
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                  <span className={`px-2 py-1 rounded ${
                    report.severity === 'critical' ? 'bg-red-100 text-red-700' :
                    report.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                    report.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {report.severity}
                  </span>
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
