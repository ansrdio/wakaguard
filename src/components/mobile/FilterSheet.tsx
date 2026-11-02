'use client';

import { reportTypeWord } from '@/lib/reportWords';
import { X, Search } from 'lucide-react';
import { ReportType } from '@/lib/types';
import { ReportFilters } from '@/lib/filters';
import { BOTTOM_NAV_HEIGHT } from '@/lib/mobileLayout';
import { useState } from 'react';
import { ReportPicture } from '@/components/pictures/Pictures';

interface FilterSheetProps {
  isOpen: boolean;
  onClose: () => void;
  filters: ReportFilters;
  onFiltersChange: (filters: ReportFilters) => void;
}

export function FilterSheet({ isOpen, onClose, filters, onFiltersChange }: FilterSheetProps) {
  const [localFilters, setLocalFilters] = useState<ReportFilters>(filters);

  if (!isOpen) return null;

  const reportTypes = [
    { value: '', label: 'All Types' },
    ...[
      ReportType.CHECKPOINT, ReportType.POTHOLE, ReportType.ACCIDENT, ReportType.ROADWORK,
      ReportType.HAZARD, ReportType.CLOSURE, ReportType.TRAFFIC, ReportType.OTHER,
    ].map((value) => ({ value, label: reportTypeWord(value) })),
  ];

  const recencyOptions = [
    { value: 0, label: 'All Time' },
    { value: 1, label: 'Last 24 hours' },
    { value: 7, label: 'Last 7 days' },
    { value: 30, label: 'Last 30 days' },
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
      {/* Above the tab bar, which is drawn over everything and would hide Apply Filters */}
      <div
        className="fixed inset-x-0 z-50 bg-white rounded-t-3xl shadow-2xl flex flex-col animate-in slide-in-from-bottom duration-300"
        style={{ bottom: BOTTOM_NAV_HEIGHT, maxHeight: `calc(90vh - ${BOTTOM_NAV_HEIGHT})` }}
      >
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
            {/* Each kind with its own picture, as on the map and the report form */}
            <div className="grid grid-cols-3 gap-2" role="group" aria-label="Report type">
              {reportTypes.map((type) => {
                const selected = (localFilters.type || '') === type.value;
                return (
                  <button
                    key={type.value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setLocalFilters({ ...localFilters, type: (type.value || undefined) as ReportType | undefined })}
                    className={`flex flex-col items-center gap-1 rounded-xl px-1 py-2 border-2 text-xs font-medium transition-colors ${
                      selected
                        ? 'border-blue-500 bg-blue-50 text-blue-900'
                        : 'border-transparent bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {type.value
                      ? <ReportPicture type={type.value} size={28} />
                      : <span className="w-7 h-7 rounded-lg bg-slate-300 flex items-center justify-center text-[10px] font-bold text-slate-700" aria-hidden="true">All</span>}
                    {type.value ? type.label : 'All types'}
                  </button>
                );
              })}
            </div>
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
