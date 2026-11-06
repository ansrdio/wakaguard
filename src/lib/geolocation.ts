import { normalizeStateName, type NigerianState } from './nigerianStates';
import { askSpotState } from './placeName';

interface GeolocationResult {
  state: NigerianState | null;
  error?: string;
}

interface CachedLocation {
  state: NigerianState | null;
  timestamp: number;
  coords: { lat: number; lng: number };
}

// In-memory cache for geolocation results
const geoCache = new Map<string, CachedLocation>();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const CACHE_KEY_PREFIX = 'wakaguard_geo_';


/**
 * Generate cache key from coordinates (rounded to 3 decimal places ~100m accuracy)
 */
function getCacheKey(lat: number, lng: number): string {
  const roundedLat = Math.round(lat * 1000) / 1000;
  const roundedLng = Math.round(lng * 1000) / 1000;
  return `${roundedLat},${roundedLng}`;
}

/**
 * Get cached location from memory or localStorage
 */
function getCachedLocation(lat: number, lng: number): NigerianState | null {
  const key = getCacheKey(lat, lng);
  
  // Check memory cache first
  const memoryCache = geoCache.get(key);
  if (memoryCache && Date.now() - memoryCache.timestamp < CACHE_DURATION) {
    console.log('Geolocation cache hit (memory):', memoryCache.state);
    return memoryCache.state;
  }
  
  // Check localStorage
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(CACHE_KEY_PREFIX + key);
      if (stored) {
        const cached: CachedLocation = JSON.parse(stored);
        if (Date.now() - cached.timestamp < CACHE_DURATION) {
          console.log('Geolocation cache hit (localStorage):', cached.state);
          // Populate memory cache
          geoCache.set(key, cached);
          return cached.state;
        } else {
          // Expired - remove it
          localStorage.removeItem(CACHE_KEY_PREFIX + key);
        }
      }
    } catch (error) {
      console.error('Error reading geolocation cache:', error);
    }
  }
  
  return null;
}

/**
 * Save location to cache (memory and localStorage)
 */
function setCachedLocation(lat: number, lng: number, state: NigerianState | null): void {
  const key = getCacheKey(lat, lng);
  const cached: CachedLocation = {
    state,
    timestamp: Date.now(),
    coords: { lat, lng },
  };
  
  // Save to memory
  geoCache.set(key, cached);
  
  // Save to localStorage
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(CACHE_KEY_PREFIX + key, JSON.stringify(cached));
    } catch (error) {
      console.error('Error saving geolocation cache:', error);
    }
  }
}

/**
 * Detect Nigerian state from browser geolocation using reverse geocoding
 * 
 * @returns Promise<NigerianState | null> - Normalized state name or null if detection fails or state not in list
 */
export async function detectStateFromGeolocation(): Promise<GeolocationResult> {
  try {
    // (a) Request browser geolocation
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        resolve,
        reject,
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });

    const { latitude, longitude } = position.coords;

    // Check cache first (avoids API call if recently detected)
    const cachedState = getCachedLocation(latitude, longitude);
    if (cachedState !== null) {
      return {
        state: cachedState,
      };
    }

    // (b) Ask our server which state this is: it asks Google's address look-up
    // (functions/src/placeName.ts; OpenStreetMap until build 27). Google is not told who asked.
    const found = await askSpotState({ lat: latitude, lng: longitude });
    if (!found) {
      return {
        state: null,
        error: 'Could not determine state from location',
      };
    }
    const stateName = found.state;

    if (!stateName) {
      return {
        state: null,
        error: 'Could not determine state from location',
      };
    }

    // (c) Normalize state name to match our pilotStates labels
    const normalizedState = normalizeStateName(stateName);

    // Cache the result (even if null, to avoid repeated failed lookups)
    setCachedLocation(latitude, longitude, normalizedState);

    if (!normalizedState) {
      // State detected but not in our list (might be outside Nigeria)
      return {
        state: null,
        error: `Detected location (${stateName}) is not a recognised Nigerian state`,
      };
    }

    return {
      state: normalizedState,
    };

  } catch (error) {
    console.error('Geolocation detection error:', error);
    
    if (error instanceof GeolocationPositionError) {
      switch (error.code) {
        case error.PERMISSION_DENIED:
          return {
            state: null,
            error: 'Location permission denied',
          };
        case error.POSITION_UNAVAILABLE:
          return {
            state: null,
            error: 'Location information unavailable',
          };
        case error.TIMEOUT:
          return {
            state: null,
            error: 'Location request timed out',
          };
      }
    }

    return {
      state: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
