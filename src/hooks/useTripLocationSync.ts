/**
 * @fileoverview Keeps an active Safe Trip's location up to date
 *
 * Two location sources, same throttling:
 * - Native app: a background location watcher that keeps running with the
 *   screen locked. Updates are posted with native HTTP to the tripLocation
 *   function, because Android throttles WebView requests in the background.
 * - Browser: the web Geolocation API, written straight to Firestore. This
 *   only works while the page is open and visible.
 *
 * Mount this once, high in the tree.
 *
 * @module useTripLocationSync
 */

'use client';

import { useEffect, useRef } from 'react';
import { Capacitor, CapacitorHttp, registerPlugin } from '@capacitor/core';
import type { BackgroundGeolocationPlugin } from '@capacitor-community/background-geolocation';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthedUser } from '@/hooks/useAuthedUser';
import { calculateDistance } from '@/lib/geo';
import { HEARTBEAT_MS, LocationFix, SentFix, shouldSendFix, tripLocationEndpoint } from '@/lib/tripLocation';
import { Trip } from '@/lib/types';

const BackgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>('BackgroundGeolocation');

export type TripLocationProblem = 'permission_denied' | 'unavailable';

const distance = (a: LocationFix, b: LocationFix) => calculateDistance(a.lat, a.lng, b.lat, b.lng);

async function writeViaFirestore(uid: string, tripId: string, fix: LocationFix, isStart: boolean) {
  const lastLocation = { lat: fix.lat, lng: fix.lng, ...(fix.accuracy != null ? { accuracy: fix.accuracy } : {}) };
  await Promise.all([
    updateDoc(doc(db, 'users', uid, 'trips', tripId), {
      lastLocation,
      lastUpdate: serverTimestamp(),
      ...(isStart ? { startLocation: { lat: fix.lat, lng: fix.lng } } : {}),
    }),
    updateDoc(doc(db, 'sharedTrips', tripId), { lastLocation, lastUpdate: serverTimestamp() }),
  ]);
}

async function writeViaNativeHttp(uid: string, tripId: string, key: string, fix: LocationFix) {
  const url = tripLocationEndpoint();
  if (!url) throw new Error('tripLocation endpoint not configured');

  const response = await CapacitorHttp.post({
    url,
    headers: { 'Content-Type': 'application/json' },
    data: { uid, tripId, key, lat: fix.lat, lng: fix.lng, accuracy: fix.accuracy ?? null },
    connectTimeout: 15000,
    readTimeout: 15000,
  });
  if (response.status >= 400) throw new Error(`tripLocation responded ${response.status}`);
}

/**
 * @param activeTrip The trip to track, or null
 * @param onProblem Called once per trip if location cannot be read
 */
export function useTripLocationSync(
  activeTrip: Trip | null,
  onProblem?: (problem: TripLocationProblem) => void
) {
  const { uid } = useAuthedUser();
  const tripId = activeTrip?.id ?? null;
  const locationKey = activeTrip?.locationKey ?? null;
  const onProblemRef = useRef(onProblem);
  // True until the trip has a start point (there may have been no GPS fix when it began)
  const needsStartRef = useRef(false);
  useEffect(() => {
    onProblemRef.current = onProblem;
    needsStartRef.current = !!activeTrip && !activeTrip.startLocation;
  });

  useEffect(() => {
    if (!uid || !tripId) return;

    const isNative = Capacitor.isNativePlatform();
    let lastSent: SentFix | null = null;
    let latest: LocationFix | null = null;
    let problemReported = false;
    let stopped = false;

    const reportProblem = (problem: TripLocationProblem) => {
      if (problemReported) return;
      problemReported = true;
      onProblemRef.current?.(problem);
    };

    const offer = async (fix: LocationFix) => {
      if (stopped) return;
      latest = fix;
      const now = Date.now();
      if (!shouldSendFix(lastSent, fix, now, distance)) return;

      const previous = lastSent;
      lastSent = { ...fix, at: now };
      try {
        if (isNative && locationKey) {
          await writeViaNativeHttp(uid, tripId, locationKey, fix);
        } else {
          await writeViaFirestore(uid, tripId, fix, needsStartRef.current);
        }
      } catch (error) {
        // Let the next fix retry instead of waiting out the throttle
        lastSent = previous;
        console.error('Error syncing trip location:', error);
      }
    };

    // ---- Native: background-capable watcher --------------------------------
    if (isNative) {
      let watcherId: string | null = null;

      BackgroundGeolocation.addWatcher(
        {
          backgroundTitle: 'Safe Trip active',
          backgroundMessage: 'Sharing your location with your trusted contacts.',
          requestPermissions: true,
          stale: false,
          // No distance filter: fixes while stationary provide the heartbeat
          distanceFilter: 0,
        },
        (position, error) => {
          if (error) {
            reportProblem(error.code === 'NOT_AUTHORIZED' ? 'permission_denied' : 'unavailable');
            return;
          }
          if (position) {
            offer({ lat: position.latitude, lng: position.longitude, accuracy: position.accuracy });
          }
        }
      )
        .then((id) => {
          watcherId = id;
          // The trip ended while the watcher was still being created
          if (stopped) BackgroundGeolocation.removeWatcher({ id });
        })
        .catch((error) => {
          console.error('Could not start background location:', error);
          reportProblem('unavailable');
        });

      return () => {
        stopped = true;
        if (watcherId) BackgroundGeolocation.removeWatcher({ id: watcherId });
      };
    }

    // ---- Browser: foreground only -----------------------------------------
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reportProblem('unavailable');
      return;
    }

    const fromPosition = (p: GeolocationPosition) =>
      offer({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy });

    const watchId = navigator.geolocation.watchPosition(
      fromPosition,
      (error) => {
        console.warn('Trip location unavailable:', error.message);
        if (error.code === error.PERMISSION_DENIED) reportProblem('permission_denied');
      },
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 30000 }
    );

    // watchPosition only fires on movement, so re-offer the latest fix for the heartbeat
    const heartbeat = setInterval(() => {
      if (latest) offer(latest);
    }, HEARTBEAT_MS / 2);

    return () => {
      stopped = true;
      navigator.geolocation.clearWatch(watchId);
      clearInterval(heartbeat);
    };
  }, [uid, tripId, locationKey]);
}
