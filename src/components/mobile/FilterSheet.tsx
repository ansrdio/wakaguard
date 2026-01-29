'use client';

import { X, Search } from 'lucide-react';
import { ReportType, Severity } from '@/lib/types';
import { ReportFilters } from '@/lib/filters';
import { useState } from 'react';

interface FilterSheetProps {
  isOpen: boolean;
  onClose: () => void;
  filters: ReportFilters;
  onFiltersChange: (filters: ReportFilters) => void;
  userLocation: { lat: number; lng: number } | null;
}

export function FilterSheet({ isOpen, onClose, filters, onFiltersChange, userLocation }: FilterSheetProps) {
  const [localFilters, setLocalFilters] = useState<ReportFilters>(filters);

  if (!isOpen) return null;

  const reportTypes = [
    { value: '', label: 'All Types' },
    { value: ReportType.POTHOLE, label: 'Pothole' },
    { value: ReportType.ACCIDENT, label: 'Accident' },
    { value: ReportType.ROADWORK, label: 'Roadwork' },
    { value: ReportType.HAZARD, label: 'Hazard' },
    { value: ReportType.CLOSURE, label: 'Closure' },
    { value: ReportType.TRAFFIC, label: 'Traffic' },
    { value: ReportType.OTHER, label: 'Other' },
  ];

  const severities = [
    { value: '', label: 'All Severities' },
    { value: Severity.LOW, label: 'Low' },
    { value: Severity.MEDIUM, label: 'Medium' },
    { value: Severity.HIGH, label: 'High' },
    { value: Severity.CRITICAL, label: 'Critical' },
  ];

  const recencyOptions = [
    { value: 0, label: 'All Time' },
    { value: 1, label: 'Last 24 hours' },
    { value: 7, label: 'Last 7 days' },
    { value: 30, label: 'Last 30 days' },
  ];

  const verificationStatuses = [
    { value: '', label: 'All Reports' },
    { value: 'verified', label: 'Verified Only' },
    { value: 'unverified', label: 'Unverified Only' },
  ];

  const handleApply = () => {
    onFiltersChange(localFilters);
    onClose();
  };

  const handleReset = () => {
    const resetFilters = {};
    setLocalFilters(resetFilters);
    onFiltersChange(resetFilters);
    onClose();
  };

  const activeCount = Object.values(localFilters).filter(v => v !== undefined && v !== '' && v !== 0).length;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">
            Filters {activeCount > 0 && <span className="text-blue-600">({activeCount})</span>}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            aria-label="Close filters"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                value={localFilters.searchQuery || ''}
                onChange={(e) => setLocalFilters({ ...localFilters, searchQuery: e.target.value })}
                placeholder="Search reports..."
                className="w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
              />
            </div>
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Type</label>
            <select
              value={localFilters.type || ''}
              onChange={(e) => setLocalFilters({ ...localFilters, type: e.target.value as ReportType | undefined })}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
            >
              {reportTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Severity */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Severity</label>
            <select
              value={localFilters.severity || ''}
              onChange={(e) => setLocalFilters({ ...localFilters, severity: e.target.value as Severity | undefined })}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
            >
              {severities.map((severity) => (
                <option key={severity.value} value={severity.value}>
                  {severity.label}
                </option>
              ))}
            </select>
          </div>

          {/* Recency */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Recency</label>
            <select
              value={localFilters.recency || 0}
              onChange={(e) => setLocalFilters({ ...localFilters, recency: parseInt(e.target.value) })}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
            >
              {recencyOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Verification */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Verification</label>
            <select
              value={localFilters.verification || ''}
              onChange={(e) => setLocalFilters({ ...localFilters, verification: e.target.value as any })}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
            >
              {verificationStatuses.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>

          {/* Radius */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Near Me {!userLocation && <span className="text-xs text-slate-400">(Enable location)</span>}
            </label>
            <select
              value={localFilters.radiusKm || 0}
              onChange={(e) => setLocalFilters({ ...localFilters, radiusKm: parseInt(e.target.value), userLocation: userLocation || undefined })}
              disabled={!userLocation}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm disabled:bg-slate-50 disabled:text-slate-400"
            >
              <option value="0">All distances</option>
              <option value="2">Within 2km</option>
              <option value="5">Within 5km</option>
              <option value="10">Within 10km</option>
            </select>
          </div>
        </div>

        {/* Actions */}
        <div className="px-4 py-4 border-t border-slate-200 space-y-2">
          <button
            onClick={handleApply}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
          >
            Apply Filters
          </button>
          {activeCount > 0 && (
            <button
              onClick={handleReset}
              className="w-full py-3 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors"
            >
              Clear All
            </button>
          )}
        </div>
      </div>
    </>
  );
}
