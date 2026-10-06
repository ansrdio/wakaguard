/**
 * @fileoverview Keeps an active Safe Trip's location up to date
 *
 * Watches the device position while a trip is active and writes it to the
 * private trip document and the public share document. Writes are throttled
 * to limit battery, data and Firestore usage, with a heartbeat so contacts can
 * tell a stationary traveller from a phone that has gone quiet.
 *
 * Mount this once, high in the tree. It only runs while the app is in the
 * foreground; background tracking needs a native plugin.
 *
 * @module useTripLocationSync
 */

'use client';

import { useEffect, useRef } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthedUser } from '@/hooks/useAuthedUser';
import { calculateDistance } from '@/lib/geo';
import { Trip } from '@/lib/types';

/** Never write more often than this */
const MIN_INTERVAL_MS = 30 * 1000;
/** Always write at least this often, even when not moving */
const HEARTBEAT_MS = 2 * 60 * 1000;
/** Movement that justifies a write before the heartbeat */
const MIN_MOVE_METERS = 50;

export function useTripLocationSync(activeTrip: Trip | null) {
  const { uid } = useAuthedUser();
  const tripId = activeTrip?.id ?? null;
  const lastSent = useRef<{ at: number; lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!uid || !tripId) return;
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;

    lastSent.current = null;

    const send = async (position: GeolocationPosition) => {
      const { latitude: lat, longitude: lng, accuracy } = position.coords;
      const now = Date.now();
      const prev = lastSent.current;

      if (prev) {
        const elapsed = now - prev.at;
        if (elapsed < MIN_INTERVAL_MS) return;
        const moved = calculateDistance(prev.lat, prev.lng, lat, lng) >= MIN_MOVE_METERS;
        if (!moved && elapsed < HEARTBEAT_MS) return;
      }
      lastSent.current = { at: now, lat, lng };

      try {
        await Promise.all([
          updateDoc(doc(db, 'users', uid, 'trips', tripId), {
            lastLocation: { lat, lng, accuracy },
            lastUpdate: serverTimestamp(),
          }),
          updateDoc(doc(db, 'sharedTrips', tripId), {
            lastLocation: { lat, lng, accuracy },
            lastUpdate: serverTimestamp(),
          }),
        ]);
      } catch (error) {
        console.error('Error syncing trip location:', error);
      }
    };

    const watchId = navigator.geolocation.watchPosition(
      send,
      (error) => console.warn('Trip location unavailable:', error.message),
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 30000 }
    );

    // watchPosition only fires on movement, so poll for the stationary heartbeat
    const heartbeat = setInterval(() => {
      navigator.geolocation.getCurrentPosition(send, () => {}, {
        enableHighAccuracy: false,
        maximumAge: 60000,
        timeout: 20000,
      });
    }, HEARTBEAT_MS);

    return () => {
      navigator.geolocation.clearWatch(watchId);
      clearInterval(heartbeat);
    };
  }, [uid, tripId]);
}
