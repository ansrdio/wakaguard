'use client';

import { useEffect, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebaseFunctions';
import { readPhoneLocation } from '@/lib/locationCheck';
import { readWeatherAhead, roughly, WeatherAhead } from '@/lib/weatherWords';

/** A forecast is asked for again after this long, while the screen is in use */
const ASK_AGAIN_MS = 30 * 60 * 1000;

/**
 * Where the phone roughly is, only if location is already allowed: the
 * weather is never a reason to ask. A position up to half an hour old will do.
 */
async function roughPlace(): Promise<{ lat: number; lng: number } | null> {
  const { permission } = await readPhoneLocation();
  if (permission !== 'granted' && permission !== 'approximate') return null;
  if (typeof navigator === 'undefined' || !navigator.geolocation) return null;
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => resolve(roughly(position.coords.latitude, position.coords.longitude)),
      () => resolve(null),
      { enableHighAccuracy: false, maximumAge: ASK_AGAIN_MS, timeout: 10000 },
    );
  });
}

/**
 * The weather in the traveller's area for the next `hours` hours, or null
 * until it is known (and whenever it cannot be had: the line is then left
 * out). Asked for only while the screen can be seen, as MET Norway's terms
 * ask of apps.
 */
export function useWeatherAhead(enabled: boolean, hours: number): WeatherAhead | null {
  const [ahead, setAhead] = useState<WeatherAhead | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let current = true;
    let askedAt = 0;
    const ask = async () => {
      if (document.visibilityState === 'hidden') return;
      askedAt = Date.now();
      const place = await roughPlace();
      if (!place || !current) return;
      try {
        const answer = await httpsCallable(functions, 'weatherAhead', { timeout: 15000 })({ ...place, hours });
        if (current) setAhead(readWeatherAhead(answer.data));
      } catch {
        // No forecast just now: the line stays as it was, or absent
      }
    };
    const onShow = () => {
      if (document.visibilityState === 'visible' && Date.now() - askedAt >= ASK_AGAIN_MS) void ask();
    };
    void ask();
    const every = setInterval(() => void ask(), ASK_AGAIN_MS);
    document.addEventListener('visibilitychange', onShow);
    return () => {
      current = false;
      clearInterval(every);
      document.removeEventListener('visibilitychange', onShow);
    };
  }, [enabled, hours]);

  return enabled ? ahead : null;
}
