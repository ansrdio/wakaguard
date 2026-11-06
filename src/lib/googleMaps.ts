/**
 * @fileoverview Google's maps (build 27, item 15 in docs/BUILDS.md)
 *
 * The owner chose Google Maps for every map on 5 November 2026 ("switching to
 * google maps will tremendously elevate the app"): Google knows far more of
 * Nigeria's streets and landmarks than OpenStreetMap, and its place search
 * may only be shown on Google's own maps (Maps Platform Terms 3.2.3(e)).
 *
 * The maps stay in the web code (Maps JavaScript API), shared by the website,
 * both apps and the page contacts open. The key is public by nature: it is
 * limited in Google Cloud to our addresses (the website, `https://localhost`
 * for Android, `capacitor://localhost` for iPhone) and to 1,000 map openings a
 * day. A page served the iPhone app's way was tried on 5 November and loaded.
 *
 * Without NEXT_PUBLIC_GOOGLE_MAPS_KEY (local tests against the emulators) the
 * older OpenStreetMap maps are used instead; a release build must have it
 * (scripts/app-env.mjs). Never show both on one screen: Google does not allow
 * its maps or content next to another company's map.
 *
 * @module googleMaps
 */

export const GOOGLE_MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? '';

/** True when the maps are Google's */
export const USES_GOOGLE_MAPS = GOOGLE_MAPS_KEY !== '';

export interface GoogleMapsLibraries {
  maps: google.maps.MapsLibrary;
  core: google.maps.CoreLibrary;
}

const CALLBACK = '__wakaguardMapsReady';
const SCRIPT_TIMEOUT_MS = 20000;

let loading: Promise<GoogleMapsLibraries> | null = null;
let refused = false;
const refusedListeners = new Set<() => void>();

/** True once Google has refused our key on this page; the maps then say so instead of showing a grey box */
export function mapsRefused(): boolean {
  return refused;
}

/** Hear about a refusal that comes after a map is already on screen */
export function onMapsRefused(listener: () => void): () => void {
  refusedListeners.add(listener);
  return () => refusedListeners.delete(listener);
}

/** The address of Google's script; English names, borders and labels as seen from Nigeria */
export function scriptUrl(key: string): string {
  const query = new URLSearchParams({ key, v: 'weekly', loading: 'async', callback: CALLBACK, language: 'en', region: 'NG' });
  return `https://maps.googleapis.com/maps/api/js?${query.toString()}`;
}

/**
 * Google's script, loaded once per page however many maps ask for it. A
 * failed load (no connection) is forgotten, so the next map tries again.
 */
export function loadGoogleMaps(): Promise<GoogleMapsLibraries> {
  if (!USES_GOOGLE_MAPS) return Promise.reject(new Error('No Google Maps key'));
  if (typeof window === 'undefined') return Promise.reject(new Error('Maps need a browser'));
  if (loading) return loading;

  loading = new Promise<GoogleMapsLibraries>((resolve, reject) => {
    window.gm_authFailure = () => {
      refused = true;
      refusedListeners.forEach((listener) => listener());
    };
    const script = document.createElement('script');
    let timer = 0;
    const fail = (error: Error) => {
      window.clearTimeout(timer);
      loading = null;
      script.remove();
      reject(error);
    };
    timer = window.setTimeout(() => fail(new Error('Google Maps took too long to load')), SCRIPT_TIMEOUT_MS);
    (window as unknown as Record<string, unknown>)[CALLBACK] = async () => {
      try {
        const [maps, core] = await Promise.all([google.maps.importLibrary('maps'), google.maps.importLibrary('core')]);
        window.clearTimeout(timer);
        resolve({ maps, core });
      } catch (error) {
        fail(error instanceof Error ? error : new Error(String(error)));
      }
    };
    script.src = scriptUrl(GOOGLE_MAPS_KEY);
    script.async = true;
    script.onerror = () => fail(new Error('Google Maps could not load'));
    document.head.appendChild(script);
  });
  return loading;
}

/** What every WakaGuard map shares: no Google buttons, one finger moves it, Google's own places not tappable */
export const BASE_MAP_OPTIONS: google.maps.MapOptions = {
  disableDefaultUI: true,
  gestureHandling: 'greedy',
  clickableIcons: false,
  keyboardShortcuts: false,
  backgroundColor: '#E5E3DF',
};
