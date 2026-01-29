'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Report } from '@/lib/types';
import { useAuthedUser } from '@/hooks/useAuthedUser';

export function useMyReports() {
  const { uid } = useAuthedUser();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid || typeof window === 'undefined') {
      setLoading(false);
      return;
    }

    setLoading(true);

    const reportsRef = collection(db, 'reports');
    const q = query(
      reportsRef,
      where('uid', '==', uid),
      orderBy('createdAt', 'desc'),
      limit(50)
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
        setReports(fetchedReports);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching my reports:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [uid]);

  return { reports, loading, count: reports.length };
}
