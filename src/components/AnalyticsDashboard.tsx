'use client';

import { TrendingUp, TrendingDown, MapPin, Clock, CheckCircle, AlertTriangle, BarChart3, Activity } from 'lucide-react';
import { useAnalytics } from '@/hooks/useAnalytics';
import { NigerianState } from '@/lib/nigerianStates';

interface AnalyticsDashboardProps {
  state?: NigerianState | null;
}

export function AnalyticsDashboard({ state }: AnalyticsDashboardProps) {
  const { analytics, loading, error } = useAnalytics(state);

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-slate-200 dark:bg-slate-700 rounded-xl" />
            ))}
          </div>
          <div className="h-48 bg-slate-200 dark:bg-slate-700 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      label: 'Total Reports',
      value: analytics.totalReports,
      icon: MapPin,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900/50',
    },
    {
      label: 'Active',
      value: analytics.activeReports,
      icon: AlertTriangle,
      color: 'text-amber-600',
      bgColor: 'bg-amber-100 dark:bg-amber-900/50',
    },
    {
      label: 'Resolved',
      value: analytics.resolvedReports,
      icon: CheckCircle,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100 dark:bg-emerald-900/50',
    },
    {
      label: 'Resolution Rate',
      value: `${analytics.resolutionRate.toFixed(1)}%`,
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100 dark:bg-purple-900/50',
    },
  ];

  const maxBarHeight = Math.max(...analytics.reportsOverTime.map(d => d.count), 1);

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            Analytics Dashboard
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {state ? `Showing data for ${state}` : 'All regions'}
          </p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700"
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Time-based Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 text-center">
          <p className="text-2xl font-bold text-blue-600">{analytics.reportsLast24h}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Last 24 hours</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 text-center">
          <p className="text-2xl font-bold text-blue-600">{analytics.reportsLast7d}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Last 7 days</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 text-center">
          <p className="text-2xl font-bold text-blue-600">{analytics.reportsLast30d}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Last 30 days</p>
        </div>
      </div>

      {/* Reports Over Time Chart */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
        <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-600" />
          Reports This Week
        </h3>
        <div className="flex items-end justify-between gap-2 h-32">
          {analytics.reportsOverTime.map((day, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex items-end justify-center" style={{ height: '100px' }}>
                <div
                  className="w-full max-w-8 bg-blue-500 dark:bg-blue-600 rounded-t transition-all"
                  style={{ height: `${(day.count / maxBarHeight) * 100}%`, minHeight: day.count > 0 ? '4px' : '0' }}
                />
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">{day.date}</span>
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{day.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Reports by Type */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
        <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Reports by Type</h3>
        <div className="space-y-3">
          {Object.entries(analytics.reportsByType)
            .filter(([_, count]) => count > 0)
            .sort((a, b) => b[1] - a[1])
            .map(([type, count]) => (
              <div key={type} className="flex items-center gap-3">
                <span className="text-sm text-slate-600 dark:text-slate-300 capitalize w-24">{type}</span>
                <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{ width: `${(count / analytics.totalReports) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 w-8 text-right">{count}</span>
              </div>
            ))}
        </div>
      </div>

      {/* Top States */}
      {analytics.topStates.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Top States</h3>
          <div className="space-y-2">
            {analytics.topStates.map((item, i) => (
              <div key={item.state} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700 last:border-0">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 text-xs font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <span className="text-sm text-slate-700 dark:text-slate-300">{item.state}</span>
                </div>
                <span className="text-sm font-medium text-slate-900 dark:text-white">{item.count} reports</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Average Resolution Time */}
      {analytics.averageResolutionTime > 0 && (
        <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl p-4 text-white">
          <div className="flex items-center gap-3">
            <Clock className="w-8 h-8" />
            <div>
              <p className="text-2xl font-bold">{analytics.averageResolutionTime.toFixed(1)} hours</p>
              <p className="text-sm opacity-90">Average Resolution Time</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
