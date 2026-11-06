'use client';

/**
 * Choosing a spot on Google's map (lib/googleMaps.ts), as LocationPicker.tsx
 * does on the old one: the pin stays in the middle and the map is moved under
 * it, which a thumb can do on a small screen. Tapping a spot brings it to the
 * middle. Used for a trip's destination and a road report's place.
 */

import { useEffect, useRef } from 'react';
import { MapNotice, useGoogleMap } from '@/components/google/useGoogleMap';
import type { LocationPickerProps } from './LocationPicker';

/** Close enough to tell one side of a junction from the other */
const STREET_ZOOM = 16;
/** Far enough out to see a whole city */
const CITY_ZOOM = 11;

/** Closer than this, two places are the same place (about a metre) */
const SAME_PLACE = 0.00001;
const samePlace = (a: google.maps.LatLngLiteral, b: google.maps.LatLngLiteral) =>
  Math.abs(a.lat - b.lat) < SAME_PLACE && Math.abs(a.lng - b.lng) < SAME_PLACE;

export default function GoogleLocationPicker({ location, onLocationSelect, startsFarOut = false, fill = false }: LocationPickerProps) {
  const box = useRef<HTMLDivElement>(null);
  const { map, state, retry } = useGoogleMap(box, {
    center: { lat: location.lat, lng: location.lng },
    zoom: startsFarOut ? CITY_ZOOM : STREET_ZOOM,
  });

  // Where the form last said the pin is, so that the map going there by itself
  // (after "Use my location") is not reported back as the person's choice
  const told = useRef<google.maps.LatLngLiteral>({ lat: location.lat, lng: location.lng });
  const choose = useRef(onLocationSelect);
  useEffect(() => {
    choose.current = onLocationSelect;
  }, [onLocationSelect]);

  // Sent somewhere by the form (the phone's own position): go there, close in
  useEffect(() => {
    if (!map) return;
    const place = { lat: location.lat, lng: location.lng };
    told.current = place;
    const middle = map.getCenter();
    if (!middle || !samePlace({ lat: middle.lat(), lng: middle.lng() }, place)) {
      map.setCenter(place);
      map.setZoom(Math.max(map.getZoom() ?? STREET_ZOOM, STREET_ZOOM));
    }
  }, [location.lat, location.lng, map]);

  useEffect(() => {
    if (!map) return;
    const settled = map.addListener('idle', () => {
      const middle = map.getCenter();
      if (!middle) return;
      const place = { lat: middle.lat(), lng: middle.lng() };
      if (samePlace(place, told.current)) return;
      told.current = place;
      choose.current(place.lat, place.lng);
    });
    const tapped = map.addListener('click', (event) => {
      if (event.latLng) map.panTo(event.latLng);
    });
    return () => {
      settled.remove();
      tapped.remove();
    };
  }, [map]);

  return (
    <div className={fill ? 'relative h-full overflow-hidden' : 'relative h-72 rounded-lg overflow-hidden border border-gray-300'}>
      <div ref={box} className="h-full w-full" />

      {/*
        The pin, with its point on the middle of the map. Touches pass through it to the map.
        Moved with `transform`, not Tailwind's translate classes: older Android WebViews ignore
        the `translate` property, and the pin would sit off the spot being chosen.
      */}
      {state === 'ready' && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 z-10 drop-shadow-md"
          style={{ transform: 'translate(-50%, -100%)' }}
        >
          <svg width="34" height="44" viewBox="0 0 34 44">
            <path d="M17 43 L4.5 22.5 A15 15 0 1 1 29.5 22.5 Z" fill="#C2410C" stroke="#FBF3E0" strokeWidth="2" strokeLinejoin="round" />
            <circle cx="17" cy="15" r="5.5" fill="#FBF3E0" />
          </svg>
        </div>
      )}
      <MapNotice state={state} onRetry={retry} />
    </div>
  );
}
