'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Report } from '@/lib/types';

export function useReport(reportId: string | null) {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!reportId) {
      setLoading(false);
      return;
    }

    const fetchReport = async () => {
      try {
        setLoading(true);
        setError(null);

        const reportDoc = await getDoc(doc(db, 'reports', reportId));

        if (!reportDoc.exists()) {
          setError('Report not found');
          setReport(null);
        } else {
          setReport({
            id: reportDoc.id,
            ...reportDoc.data(),
          } as Report);
        }
      } catch (err) {
        console.error('Error fetching report:', err);
        setError('Failed to load report');
        setReport(null);
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [reportId]);

  return { report, loading, error };
}
