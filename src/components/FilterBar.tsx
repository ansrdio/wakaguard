'use client';

import { useState, useEffect } from 'react';
import { ReportType, Severity, VerificationStatus } from '@/lib/types';
import { ReportFilters } from '@/lib/filters';
import { Search, ChevronDown, ChevronUp, X } from 'lucide-react';

interface FilterBarProps {
  filters: ReportFilters;
  onFiltersChange: (filters: ReportFilters) => void;
  userLocation?: { lat: number; lng: number } | null;
}

const reportTypes = [
  { value: '', label: 'All Types' },
  { value: ReportType.POTHOLE, label: 'Pothole' },
  { value: ReportType.TRAFFIC, label: 'Traffic' },
  { value: ReportType.ACCIDENT, label: 'Accident' },
  { value: ReportType.ROADWORK, label: 'Roadwork' },
  { value: ReportType.HAZARD, label: 'Hazard' },
  { value: ReportType.CLOSURE, label: 'Closure' },
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
  { value: 60 * 60 * 1000, label: 'Last Hour' },
  { value: 24 * 60 * 60 * 1000, label: 'Last 24 Hours' },
  { value: 7 * 24 * 60 * 60 * 1000, label: 'Last Week' },
  { value: 30 * 24 * 60 * 60 * 1000, label: 'Last Month' },
];

const verificationStatuses = [
  { value: '', label: 'All Status' },
  { value: VerificationStatus.VERIFIED, label: 'Verified' },
  { value: VerificationStatus.PENDING, label: 'Pending' },
  { value: VerificationStatus.DISMISSED, label: 'Dismissed' },
];

export function FilterBar({ filters, onFiltersChange, userLocation }: FilterBarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // Load collapse state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('filterBarCollapsed');
    if (saved) setIsCollapsed(saved === 'true');
  }, []);
  
  // Save collapse state to localStorage
  const handleToggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('filterBarCollapsed', String(newState));
  };
  
  const hasActiveFilters = !!(filters.type || filters.severity || filters.recency || filters.verification || filters.radiusKm || filters.searchQuery);
  
  const handleReset = () => {
    onFiltersChange({});
  };
  
  const removeFilter = (key: keyof ReportFilters) => {
    const newFilters = { ...filters };
    delete newFilters[key];
    onFiltersChange(newFilters);
  };
  
  // Get active filter chips data
  const activeChips: Array<{ key: keyof ReportFilters; label: string }> = [];
  if (filters.type) {
    const typeLabel = reportTypes.find(t => t.value === filters.type)?.label;
    if (typeLabel) activeChips.push({ key: 'type', label: typeLabel });
  }
  if (filters.severity) {
    const sevLabel = severities.find(s => s.value === filters.severity)?.label;
    if (sevLabel) activeChips.push({ key: 'severity', label: sevLabel });
  }
  if (filters.recency) {
    const recLabel = recencyOptions.find(r => r.value === filters.recency)?.label;
    if (recLabel) activeChips.push({ key: 'recency', label: recLabel });
  }
  if (filters.verification) {
    const verLabel = verificationStatuses.find(v => v.value === filters.verification)?.label;
    if (verLabel) activeChips.push({ key: 'verification', label: verLabel });
  }
  if (filters.radiusKm) {
    activeChips.push({ key: 'radiusKm', label: `Within ${filters.radiusKm}km` });
  }
  if (filters.searchQuery) {
    activeChips.push({ key: 'searchQuery', label: `"${filters.searchQuery}"` });
  };
  const handleTypeChange = (value: string) => {
    onFiltersChange({
      ...filters,
      type: value ? (value as ReportType) : undefined,
    });
  };

  const handleSeverityChange = (value: string) => {
    onFiltersChange({
      ...filters,
      severity: value ? (value as Severity) : undefined,
    });
  };

  const handleRecencyChange = (value: string) => {
    const recency = parseInt(value);
    onFiltersChange({
      ...filters,
      recency: recency > 0 ? recency : undefined,
    });
  };

  const handleSearchChange = (value: string) => {
    onFiltersChange({
      ...filters,
      searchQuery: value,
    });
  };

  const handleVerificationChange = (value: string) => {
    onFiltersChange({
      ...filters,
      verification: value ? (value as VerificationStatus) : undefined,
    });
  };

  const handleRadiusChange = (value: string) => {
    const radius = parseInt(value);
    onFiltersChange({
      ...filters,
      radiusKm: radius > 0 ? radius : undefined,
      userLocation: radius > 0 ? userLocation || undefined : undefined,
    });
  };

  return (
    <div className="space-y-2">
      {/* Active Chips Row - Always visible, shows before controls */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap flex-1 min-h-[24px]">
          {activeChips.length > 0 ? (
            <>
              <span className="text-xs text-slate-500 font-medium mr-1">Active:</span>
              {activeChips.map((chip) => (
                <button
                  key={chip.key}
                  onClick={() => removeFilter(chip.key)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md text-xs font-medium hover:bg-blue-100 transition-colors"
                  aria-label={`Remove ${chip.label} filter`}
                >
                  {chip.label}
                  <X className="w-3 h-3" />
                </button>
              ))}
              {activeChips.length >= 2 && (
                <button
                  onClick={handleReset}
                  className="text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors ml-1"
                >
                  Clear all
                </button>
              )}
            </>
          ) : (
            <span className="text-xs text-slate-400">No filters applied</span>
          )}
        </div>
        
        {/* Collapse Toggle - Desktop only */}
        <button
          onClick={handleToggleCollapse}
          className="hidden lg:flex items-center gap-1 px-2 py-1 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          aria-label={isCollapsed ? 'Expand filters' : 'Collapse filters'}
        >
          {isCollapsed ? (
            <>
              <span>Show filters</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </>
          ) : (
            <>
              <span>Hide</span>
              <ChevronUp className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </div>

      {/* Collapsible Filter Controls */}
      <div 
        className={`overflow-hidden transition-all duration-200 ease-in-out ${
          isCollapsed ? 'max-h-0 opacity-0 lg:max-h-0' : 'max-h-96 opacity-100'
        }`}
      >
        <div className="flex flex-wrap lg:flex-nowrap items-end gap-3 lg:gap-4">
          {/* Group 1: Report Type Filters */}
          <div className="flex gap-2 flex-1 lg:flex-none">
            <div className="flex-1 lg:w-32">
              <label className="hidden lg:block text-[10px] uppercase tracking-wide text-slate-400 font-semibold mb-1">Type</label>
              <select
                value={filters.type || ''}
                onChange={(e) => handleTypeChange(e.target.value)}
                className="w-full h-9 px-2.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm dark:text-slate-200"
              >
                {reportTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1 lg:w-32">
              <label className="hidden lg:block text-[10px] uppercase tracking-wide text-slate-400 font-semibold mb-1">Severity</label>
              <select
                value={filters.severity || ''}
                onChange={(e) => handleSeverityChange(e.target.value)}
                className="w-full h-9 px-2.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm dark:text-slate-200"
              >
                {severities.map((severity) => (
                  <option key={severity.value} value={severity.value}>
                    {severity.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Divider - Desktop only */}
          <div className="hidden lg:block w-px h-9 bg-slate-200" />

          {/* Group 2: Time & Location Filters */}
          <div className="flex gap-2 flex-1 lg:flex-none">
            <div className="flex-1 lg:w-32">
              <label className="hidden lg:block text-[10px] uppercase tracking-wide text-slate-400 font-semibold mb-1">Time</label>
              <select
                value={filters.recency || 0}
                onChange={(e) => handleRecencyChange(e.target.value)}
                className="w-full h-9 px-2.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm dark:text-slate-200"
              >
                {recencyOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1 lg:w-28 group relative">
              <label className="hidden lg:block text-[10px] uppercase tracking-wide text-slate-400 font-semibold mb-1">Distance</label>
              <select
                value={filters.radiusKm || 0}
                onChange={(e) => handleRadiusChange(e.target.value)}
                disabled={!userLocation}
                className="w-full h-9 px-2.5 bg-white border border-slate-200 rounded-lg disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
              >
                <option value="0">Any</option>
                <option value="2">2km</option>
                <option value="5">5km</option>
                <option value="10">10km</option>
              </select>
              {/* Tooltip for disabled state */}
              {!userLocation && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                  Enable location to use this filter
                </div>
              )}
            </div>
          </div>

          {/* Divider - Desktop only */}
          <div className="hidden lg:block w-px h-9 bg-slate-200" />

          {/* Group 3: Search & Status */}
          <div className="flex gap-2 flex-1 lg:flex-none">
            <div className="flex-1 lg:w-28">
              <label className="hidden lg:block text-[10px] uppercase tracking-wide text-slate-400 font-semibold mb-1">Status</label>
              <select
                value={filters.verification || ''}
                onChange={(e) => handleVerificationChange(e.target.value)}
                className="w-full h-9 px-2.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm dark:text-slate-200"
              >
                {verificationStatuses.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1 lg:w-40">
              <label className="hidden lg:block text-[10px] uppercase tracking-wide text-slate-400 font-semibold mb-1">Search</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  value={filters.searchQuery || ''}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Search..."
                  className="w-full h-9 pl-8 pr-3 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm dark:text-slate-200 dark:placeholder-slate-400"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
