'use client';

import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { MAP_TILES } from '@/lib/mapTiles';
import { MapboxLogo } from '@/components/MapboxLogo';

interface Place {
  lat: number;
  lng: number;
}

interface LocationPickerProps {
  location: Place & { address?: string };
  onLocationSelect: (lat: number, lng: number) => void;
  /**
   * True when the starting place is only a guess (the middle of a state), so
   * the map opens far enough out to find the right town on it.
   */
  startsFarOut?: boolean;
}

/** Close enough to tell one side of a junction from the other */
const STREET_ZOOM = 16;
/** Far enough out to see a whole city */
const CITY_ZOOM = 11;

/** Closer than this, two places are the same place (about a metre) */
const SAME_PLACE = 0.00001;
const samePlace = (a: Place, b: Place) =>
  Math.abs(a.lat - b.lat) < SAME_PLACE && Math.abs(a.lng - b.lng) < SAME_PLACE;

/**
 * Keeps the map and the form agreeing on where the pin is. The pin does not
 * move: it stays in the middle and the map is moved under it, which a thumb
 * can do on a small screen. Tapping a spot brings that spot to the middle.
 */
function PinInTheMiddle({ location, onLocationSelect }: Pick<LocationPickerProps, 'location' | 'onLocationSelect'>) {
  const map = useMap();
  // Where the form last said the pin is, so that the map going there by itself
  // (after "Use my location") is not reported back as the person's choice
  const told = useRef<Place>({ lat: location.lat, lng: location.lng });

  useEffect(() => {
    const place = { lat: location.lat, lng: location.lng };
    told.current = place;
    // Sent somewhere by the form (the phone's own position): go there, close in
    if (!samePlace(map.getCenter(), place)) {
      map.setView([place.lat, place.lng], Math.max(map.getZoom(), STREET_ZOOM), { animate: false });
    }
  }, [location.lat, location.lng, map]);

  useMapEvents({
    moveend() {
      const middle = map.getCenter();
      if (samePlace(middle, told.current)) return;
      told.current = { lat: middle.lat, lng: middle.lng };
      onLocationSelect(middle.lat, middle.lng);
    },
    click(event) {
      map.panTo(event.latlng);
    },
  });

  return null;
}

export default function LocationPicker({ location, onLocationSelect, startsFarOut = false }: LocationPickerProps) {
  return (
    <div className="relative h-72 rounded-lg overflow-hidden border border-gray-300">
      <MapContainer
        center={[location.lat, location.lng]}
        zoom={startsFarOut ? CITY_ZOOM : STREET_ZOOM}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer {...MAP_TILES} />
        <MapboxLogo />
        <PinInTheMiddle location={location} onLocationSelect={onLocationSelect} />
      </MapContainer>

      {/* The pin, with its point on the middle of the map. Touches pass through it to the map. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 z-[650] -translate-x-1/2 -translate-y-full drop-shadow-md"
      >
        <svg width="34" height="44" viewBox="0 0 34 44">
          <path d="M17 43 L4.5 22.5 A15 15 0 1 1 29.5 22.5 Z" fill="#C2410C" stroke="#FBF3E0" strokeWidth="2" strokeLinejoin="round" />
          <circle cx="17" cy="15" r="5.5" fill="#FBF3E0" />
        </svg>
      </div>
    </div>
  );
}
