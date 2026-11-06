'use client';

/**
 * One Google map in a box (lib/googleMaps.ts), made once its script has
 * loaded. Google's map follows its box's size by itself, so nothing like the
 * old map's invalidateSize is needed when a tab or sheet changes size.
 */

import { RefObject, useCallback, useEffect, useRef, useState } from 'react';
import { MapPinOff } from 'lucide-react';
import { BASE_MAP_OPTIONS, GoogleMapsLibraries, loadGoogleMaps, mapsRefused, onMapsRefused } from '@/lib/googleMaps';

/** loading: the script is coming; failed: it could not load (no connection); refused: Google refused our key */
export type GoogleMapState = 'loading' | 'ready' | 'failed' | 'refused';

export function useGoogleMap(container: RefObject<HTMLDivElement | null>, initial: google.maps.MapOptions) {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [libs, setLibs] = useState<GoogleMapsLibraries | null>(null);
  const [state, setState] = useState<GoogleMapState>(() => (mapsRefused() ? 'refused' : 'loading'));
  const [attempt, setAttempt] = useState(0);
  // Where the map first opens; later changes move it through the map itself
  const initialRef = useRef(initial);

  useEffect(() => onMapsRefused(() => setState('refused')), []);

  useEffect(() => {
    let live = true;
    loadGoogleMaps()
      .then((loaded) => {
        if (!live || !container.current) return;
        const made = new loaded.maps.Map(container.current, { ...BASE_MAP_OPTIONS, ...initialRef.current });
        setLibs(loaded);
        setMap(made);
        setState((now) => (now === 'refused' ? now : 'ready'));
      })
      .catch(() => {
        if (live) setState('failed');
      });
    return () => {
      live = false;
    };
  }, [container, attempt]);

  const retry = useCallback(() => {
    setState('loading');
    setAttempt((n) => n + 1);
  }, []);

  return { map, libs, state, retry };
}

/** Laid over the map's box when there is no map to show, with a way to try again when it may help */
export function MapNotice({ state, onRetry }: { state: GoogleMapState; onRetry: () => void }) {
  if (state === 'loading' || state === 'ready') return null;
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-slate-100 dark:bg-slate-800 p-6 text-center">
      <MapPinOff className="w-8 h-8 text-slate-400" aria-hidden="true" />
      <p className="text-sm text-slate-700 dark:text-slate-200">
        {state === 'failed' ? 'The map could not load. Check your connection.' : 'The map is not available right now.'}
      </p>
      {state === 'failed' && (
        <button
          type="button"
          onClick={onRetry}
          className="px-4 min-h-11 rounded-xl bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-sm font-semibold text-slate-800 dark:text-white"
        >
          Try again
        </button>
      )}
    </div>
  );
}
