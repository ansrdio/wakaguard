'use client';

import { useState } from 'react';
import { Info, X } from 'lucide-react';
import { ReportPicture } from '@/components/pictures/Pictures';

// A little above the map's bottom edge, and clear of anything lying over it (see lib/mobileLayout.ts)
const ABOVE_MAP_EDGE = { bottom: 'calc(1rem + var(--map-bottom-clear, 0px))' };

/**
 * MapLegend Component
 * 
 * Displays a collapsible legend showing severity color codes
 * and report type indicators for the map view.
 */
export function MapLegend() {
  const [isOpen, setIsOpen] = useState(false);

  const severityColors = [
    { level: 'Critical', color: 'bg-red-500', description: 'Immediate danger' },
    { level: 'High', color: 'bg-orange-500', description: 'Major hazard' },
    { level: 'Medium', color: 'bg-amber-400', description: 'Moderate issue' },
    // Green, as the ring round a pin on the map is (MapView's severityColors)
    { level: 'Low', color: 'bg-green-600', description: 'Minor issue' },
  ];

  const kinds = [
    { type: 'checkpoint', label: 'Checkpoint' },
    { type: 'pothole', label: 'Pothole' },
    { type: 'accident', label: 'Accident' },
    { type: 'traffic', label: 'Heavy traffic' },
    { type: 'roadwork', label: 'Construction' },
    { type: 'closure', label: 'Roadblock' },
    { type: 'hazard', label: 'Hazard' },
    { type: 'other', label: 'Other' },
  ];

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="absolute left-4 z-[400] bg-white dark:bg-slate-800 rounded-lg shadow-md px-3 py-2 flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700"
        style={ABOVE_MAP_EDGE}
        aria-label="Show map legend"
      >
        <Info className="w-4 h-4 text-slate-500 dark:text-slate-400" />
        <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Legend</span>
      </button>
    );
  }

  return (
    <div
      className="absolute left-4 z-[400] bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-3 min-w-[160px]"
      style={ABOVE_MAP_EDGE}
    >
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">The ring round a pin</h4>
        <button
          onClick={() => setIsOpen(false)}
          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
          aria-label="Close legend"
        >
          <X className="w-3.5 h-3.5 text-slate-400" />
        </button>
      </div>
      
      <div className="space-y-1.5">
        {severityColors.map((item) => (
          <div key={item.level} className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${item.color} flex-shrink-0`} />
            <div className="flex-1 min-w-0">
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{item.level}</span>
              <span className="text-[10px] text-slate-400 ml-1 hidden sm:inline">
                — {item.description}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-700">
        <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-2">The picture on a pin</h4>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
          {kinds.map((kind) => (
            <div key={kind.type} className="flex items-center gap-2">
              <ReportPicture type={kind.type} size={20} />
              <span className="text-xs text-slate-700 dark:text-slate-300">{kind.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-700">
        <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
          <div className="w-3 h-3 rounded-full bg-blue-500 ring-2 ring-blue-200 dark:ring-blue-400/30" />
          <span>Your location</span>
        </div>
      </div>
    </div>
  );
}
