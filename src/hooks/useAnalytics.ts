'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ReportType, ReportStatus, Severity } from '@/lib/types';
import { NigerianState } from '@/lib/nigerianStates';

export interface AnalyticsData {
  totalReports: number;
  activeReports: number;
  resolvedReports: number;
  resolutionRate: number;
  reportsByType: Record<string, number>;
  reportsBySeverity: Record<string, number>;
  reportsByState: Record<string, number>;
  reportsOverTime: { date: string; count: number }[];
  topStates: { state: string; count: number }[];
  averageResolutionTime: number; // in hours
  reportsLast24h: number;
  reportsLast7d: number;
  reportsLast30d: number;
}

const initialAnalytics: AnalyticsData = {
  totalReports: 0,
  activeReports: 0,
  resolvedReports: 0,
  resolutionRate: 0,
  reportsByType: {},
  reportsBySeverity: {},
  reportsByState: {},
  reportsOverTime: [],
  topStates: [],
  averageResolutionTime: 0,
  reportsLast24h: 0,
  reportsLast7d: 0,
  reportsLast30d: 0,
};

export function useAnalytics(state?: NigerianState | null) {
  const [analytics, setAnalytics] = useState<AnalyticsData>(initialAnalytics);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnalytics() {
      if (typeof window === 'undefined') return;
      
      setLoading(true);
      setError(null);

      try {
        const reportsRef = collection(db, 'reports');
        let q = query(reportsRef);
        
        if (state) {
          q = query(reportsRef, where('state', '==', state));
        }

        const snapshot = await getDocs(q);
        const reports = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as any[];

        const now = Date.now();
        const day = 24 * 60 * 60 * 1000;

        // Calculate metrics
        const totalReports = reports.length;
        const activeReports = reports.filter(r => r.status === ReportStatus.ACTIVE).length;
        const resolvedReports = reports.filter(r => r.status === ReportStatus.RESOLVED).length;
        const resolutionRate = totalReports > 0 ? (resolvedReports / totalReports) * 100 : 0;

        // Reports by type
        const reportsByType: Record<string, number> = {};
        Object.values(ReportType).forEach(type => {
          reportsByType[type] = reports.filter(r => r.type === type).length;
        });

        // Reports by severity
        const reportsBySeverity: Record<string, number> = {};
        Object.values(Severity).forEach(sev => {
          reportsBySeverity[sev] = reports.filter(r => r.severity === sev).length;
        });

        // Reports by state
        const reportsByState: Record<string, number> = {};
        reports.forEach(r => {
          if (r.state) {
            reportsByState[r.state] = (reportsByState[r.state] || 0) + 1;
          }
        });

        // Top states
        const topStates = Object.entries(reportsByState)
          .map(([state, count]) => ({ state, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        // Reports over time (last 7 days)
        const reportsOverTime: { date: string; count: number }[] = [];
        for (let i = 6; i >= 0; i--) {
          const dayStart = new Date(now - i * day);
          dayStart.setHours(0, 0, 0, 0);
          const dayEnd = new Date(dayStart.getTime() + day);
          
          const count = reports.filter(r => {
            const createdAt = r.createdAt?.toMillis?.() || 0;
            return createdAt >= dayStart.getTime() && createdAt < dayEnd.getTime();
          }).length;

          reportsOverTime.push({
            date: dayStart.toLocaleDateString('en-US', { weekday: 'short' }),
            count
          });
        }

        // Time-based counts
        const reportsLast24h = reports.filter(r => {
          const createdAt = r.createdAt?.toMillis?.() || 0;
          return createdAt >= now - day;
        }).length;

        const reportsLast7d = reports.filter(r => {
          const createdAt = r.createdAt?.toMillis?.() || 0;
          return createdAt >= now - 7 * day;
        }).length;

        const reportsLast30d = reports.filter(r => {
          const createdAt = r.createdAt?.toMillis?.() || 0;
          return createdAt >= now - 30 * day;
        }).length;

        // Average resolution time
        const resolvedWithTime = reports.filter(r => 
          r.status === ReportStatus.RESOLVED && r.resolvedAt && r.createdAt
        );
        let averageResolutionTime = 0;
        if (resolvedWithTime.length > 0) {
          const totalTime = resolvedWithTime.reduce((sum, r) => {
            const created = r.createdAt?.toMillis?.() || 0;
            const resolved = r.resolvedAt?.toMillis?.() || 0;
            return sum + (resolved - created);
          }, 0);
          averageResolutionTime = (totalTime / resolvedWithTime.length) / (60 * 60 * 1000); // Convert to hours
        }

        setAnalytics({
          totalReports,
          activeReports,
          resolvedReports,
          resolutionRate,
          reportsByType,
          reportsBySeverity,
          reportsByState,
          reportsOverTime,
          topStates,
          averageResolutionTime,
          reportsLast24h,
          reportsLast7d,
          reportsLast30d,
        });
      } catch (err) {
        console.error('Error fetching analytics:', err);
        setError('Failed to load analytics data');
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, [state]);

  return { analytics, loading, error };
}
