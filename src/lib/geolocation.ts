import { normalizeStateName, type NigerianState } from './nigerianStates';

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

// Rate limiting for Nominatim API
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1000; // 1 second between requests (Nominatim limit)

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
 * Wait for rate limit (1 request per second for Nominatim)
 */
async function waitForRateLimit(): Promise<void> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
    console.log(`Rate limiting: waiting ${waitTime}ms before API call`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  lastRequestTime = Date.now();
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

    // Rate limit to respect Nominatim's 1 request/second policy
    await waitForRateLimit();

    // (b) Call reverse-geocode API to get state name
    // Using Nominatim (OpenStreetMap) - free, no API key required
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?` +
      `format=json&lat=${latitude}&lon=${longitude}&` +
      `addressdetails=1&zoom=10`,
      {
        headers: {
          'User-Agent': 'WakaGuard/1.0', // Nominatim requires User-Agent
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Geocoding API error: ${response.status}`);
    }

    const data = await response.json();

    // Extract state name from various possible fields
    const stateName = 
      data.address?.state ||
      data.address?.region ||
      data.address?.province ||
      data.address?.county ||
      null;

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
        error: `Detected location (${stateName}) is not a recognized Nigerian state`,
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

/**
 * Alternative reverse geocoding using Google Maps Geocoding API
 * Requires NEXT_PUBLIC_GOOGLE_MAPS_API_KEY environment variable
 * More accurate but requires API key and has usage limits
 */
export async function detectStateFromGeolocationGoogle(): Promise<GeolocationResult> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  
  if (!apiKey) {
    return {
      state: null,
      error: 'Google Maps API key not configured',
    };
  }

  try {
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      });
    });

    const { latitude, longitude } = position.coords;

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?` +
      `latlng=${latitude},${longitude}&key=${apiKey}`
    );

    if (!response.ok) {
      throw new Error(`Google Geocoding API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      return {
        state: null,
        error: 'Could not geocode location',
      };
    }

    // Find administrative_area_level_1 (state) from address components
    let stateName: string | null = null;
    
    for (const result of data.results) {
      for (const component of result.address_components || []) {
        if (component.types.includes('administrative_area_level_1')) {
          stateName = component.long_name;
          break;
        }
      }
      if (stateName) break;
    }

    if (!stateName) {
      return {
        state: null,
        error: 'Could not determine state from location',
      };
    }

    const normalizedState = normalizeStateName(stateName);

    if (!normalizedState) {
      return {
        state: null,
        error: `Detected location (${stateName}) is not a recognized Nigerian state`,
      };
    }

    return {
      state: normalizedState,
    };

  } catch (error) {
    console.error('Google geolocation detection error:', error);
    return {
      state: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
