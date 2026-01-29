'use client';

import { useState } from 'react';
import { Info, X } from 'lucide-react';

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
    { level: 'Low', color: 'bg-blue-500', description: 'Minor issue' },
  ];

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="absolute bottom-4 left-4 z-[400] bg-white dark:bg-slate-800 rounded-lg shadow-md px-3 py-2 flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700"
        aria-label="Show map legend"
      >
        <Info className="w-4 h-4 text-slate-500 dark:text-slate-400" />
        <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Legend</span>
      </button>
    );
  }

  return (
    <div className="absolute bottom-4 left-4 z-[400] bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-3 min-w-[160px]">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Severity</h4>
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
        <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
          <div className="w-3 h-3 rounded-full bg-blue-500 ring-2 ring-blue-200 dark:ring-blue-400/30" />
          <span>Your location</span>
        </div>
      </div>
    </div>
  );
}
