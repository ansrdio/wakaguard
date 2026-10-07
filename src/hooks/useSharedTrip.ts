'use client';

import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { SharedTrip } from '@/lib/types';

interface Loaded {
  /** The trip this result belongs to, so a result for an earlier id is never shown for a new one */
  id: string;
  shared: SharedTrip | null;
  failed: boolean;
}

/**
 * Follows the public share document of a trip: the same data a contact sees
 * when they open the trip link.
 *
 * `shared` is null when the document does not exist or the id is empty.
 * `failed` means it could not be read, which is also what a trip that has
 * ended or expired looks like to someone who is not its owner.
 */
export function useSharedTrip(tripId: string | null) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    if (!tripId) return;
    return onSnapshot(
      doc(db, 'sharedTrips', tripId),
      (snapshot) => {
        setLoaded({ id: tripId, shared: snapshot.exists() ? (snapshot.data() as SharedTrip) : null, failed: false });
      },
      (error) => {
        console.warn('Could not read the shared trip:', error.code);
        setLoaded({ id: tripId, shared: null, failed: true });
      }
    );
  }, [tripId]);

  const current = loaded && loaded.id === tripId ? loaded : null;
  return {
    shared: current?.shared ?? null,
    loading: !!tripId && !current,
    failed: current?.failed ?? false,
  };
}
