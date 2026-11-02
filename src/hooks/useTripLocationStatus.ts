'use client';

import { useEffect, useState } from 'react';
import { describeLocationStatus, LocationStatus } from '@/lib/tripPlanning';
import { Trip } from '@/lib/types';

/**
 * Whether the traveller's positions are reaching the server, without a false
 * "No location received" just after coming back to the app (RETURN_HOLD_MS).
 */
export function useTripLocationStatus(trip: Trip, nowMs: number): LocationStatus {
  // From the start too: the copy read when the app opens can be just as old
  const [backAtMs, setBackAtMs] = useState(() => Date.now());

  useEffect(() => {
    // Held all the time the app is away, so the warning is not what the screen
    // shows in the moment before the app hears that it is back
    const onChange = () => setBackAtMs(document.visibilityState === 'visible' ? Date.now() : Infinity);
    document.addEventListener('visibilitychange', onChange);
    return () => document.removeEventListener('visibilitychange', onChange);
  }, []);

  return describeLocationStatus(trip.lastUpdate?.toMillis() ?? null, !!trip.lastLocation, nowMs, backAtMs);
}
