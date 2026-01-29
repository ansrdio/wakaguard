/**
 * @fileoverview Reports fetching hook for WakaGuard
 * 
 * Provides real-time subscription to road hazard reports filtered by Nigerian state.
 * Automatically filters out reports from blocked users.
 * 
 * @module useReports
 */

'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Report } from '@/lib/types';
import { NigerianState } from '@/lib/nigerianStates';
import { useBlockedUsers } from '@/hooks/useBlockedUsers';

/**
 * Hook to fetch and subscribe to road hazard reports.
 * 
 * Features:
 * - Real-time updates via Firestore onSnapshot
 * - State-based filtering (Nigerian states)
 * - Automatic blocked user filtering
 * - Limited to 200 most recent active reports
 * 
 * @param selectedState - Nigerian state to filter reports by
 * @returns Object containing reports array, loading state, and error
 * @example
 * const { reports, loading, error } = useReports('Lagos');
 * if (loading) return <Skeleton />;
 * return reports.map(r => <ReportCard key={r.id} report={r} />);
 */
export function useReports(selectedState: NigerianState) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { blockedUids } = useBlockedUsers();

  // Subscribe to Firestore only when state changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    setLoading(true);
    setError(null);

    try {
      const reportsRef = collection(db, 'reports');
      const q = query(
        reportsRef,
        where('state', '==', selectedState),
        where('status', '==', 'active'),
        orderBy('createdAt', 'desc'),
        limit(200)
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const fetchedReports: Report[] = [];
          snapshot.forEach((doc) => {
            fetchedReports.push({
              id: doc.id,
              ...doc.data(),
            } as Report);
          });

          // Filter out blocked users only
          const unblocked = fetchedReports.filter(report => !blockedUids.includes(report.uid));
          setReports(unblocked);
          setLoading(false);
        },
        (err) => {
          console.error('Error fetching reports:', err);
          setError(err.message);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.error('Error setting up reports query:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setLoading(false);
    }
  }, [selectedState, blockedUids]); // Only resubscribe when state or blocked list changes

  return { reports, loading, error };
}
