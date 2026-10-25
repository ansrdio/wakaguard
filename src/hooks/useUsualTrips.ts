'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { readPoint } from '@/lib/destinationPoint';
import { isTravelMode } from '@/lib/travelMode';
import { PastTrip, UsualTrip, usualTrips } from '@/lib/usualTrips';

/** Enough trips to find a few usual places; trips are kept 90 days */
const TRIPS_READ = 40;

/**
 * The traveller's usual trips for the start form (build 25), read again each
 * time the form shows, so a trip just ended counts. Empty while signed out or
 * if the trips cannot be read: the form simply shows no list.
 */
export function useUsualTrips(uid: string | null, enabled: boolean): UsualTrip[] {
  const [found, setFound] = useState<{ uid: string; trips: UsualTrip[] } | null>(null);

  useEffect(() => {
    if (!uid || !enabled) return;
    let live = true;
    void getDocs(query(collection(db, 'users', uid, 'trips'), orderBy('createdAt', 'desc'), limit(TRIPS_READ)))
      .then((snap) => {
        const past: PastTrip[] = snap.docs.map((d) => {
          const t = d.data();
          const startMs = t.startTime?.toMillis?.() ?? t.createdAt?.toMillis?.() ?? 0;
          return {
            destination: typeof t.destination === 'string' ? t.destination : '',
            point: readPoint(t.destinationPoint),
            // Ended with "I've arrived"; the server's closing of a forgotten trip is "cancelled"
            arrived: t.status === 'completed',
            isTest: t.isTest === true,
            startMs,
            endMs: t.endTime?.toMillis?.() ?? null,
            plannedMinutes: (Number(t.expectedDurationMinutes) || 30) + (Number(t.extendedMinutes) || 0),
            travelMode: isTravelMode(t.travelMode) ? t.travelMode : null,
          };
        });
        if (live) setFound({ uid, trips: usualTrips(past, Date.now()) });
      })
      .catch(() => {
        // No list rather than an error: the form works without it
      });
    return () => {
      live = false;
    };
  }, [uid, enabled]);

  return uid && enabled && found?.uid === uid ? found.trips : [];
}
