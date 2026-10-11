'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { Report } from '@/lib/types';
import { ReportList } from '@/components/ReportList';
import { BOTTOM_NAV_HEIGHT, SHEET_PEEK_HEIGHT, TOP_BAR_HEIGHT } from '@/lib/mobileLayout';

type SheetState = 'collapsed' | 'half' | 'full';

interface ReportsBottomSheetProps {
  reports: Report[];
  selectedReportId: string | null;
  onReportClick: (reportId: string) => void;
  userLocation: { lat: number; lng: number } | null;
  reportCount: number;
  state: SheetState;
  onStateChange: (state: SheetState) => void;
}

export function ReportsBottomSheet({
  reports,
  selectedReportId,
  onReportClick,
  userLocation,
  reportCount,
  state,
  onStateChange,
}: ReportsBottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // The sheet stands on the bottom bar. Opened fully it stops under the top bar.
  const heights: Record<SheetState, string> = {
    collapsed: SHEET_PEEK_HEIGHT,
    half: '50vh',
    full: `calc(100vh - ${BOTTOM_NAV_HEIGHT} - ${TOP_BAR_HEIGHT})`,
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartY(e.touches[0].clientY);
    // Until the finger moves it has gone nowhere. Left at zero, a plain tap
    // counted as a long swipe up as well as a tap, and opened the sheet twice over.
    setCurrentY(e.touches[0].clientY);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    setCurrentY(e.touches[0].clientY);
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    
    const deltaY = currentY - startY;
    
    if (Math.abs(deltaY) > 50) {
      if (deltaY > 0) {
        // Swipe down
        if (state === 'full') onStateChange('half');
        else if (state === 'half') onStateChange('collapsed');
      } else {
        // Swipe up
        if (state === 'collapsed') onStateChange('half');
        else if (state === 'half') onStateChange('full');
      }
    }
    
    setIsDragging(false);
    setStartY(0);
    setCurrentY(0);
  };

  const handleHeaderClick = () => {
    if (state === 'collapsed') onStateChange('half');
    else if (state === 'half') onStateChange('full');
    else onStateChange('collapsed');
  };

  return (
    <div
      ref={sheetRef}
      className="fixed left-0 right-0 z-20 flex flex-col bg-white dark:bg-slate-900 rounded-t-3xl shadow-2xl border-t border-slate-200 dark:border-slate-700 transition-all duration-300"
      style={{ bottom: BOTTOM_NAV_HEIGHT, height: heights[state] }}
    >
      {/* Drag Handle & Header */}
      <div
        className="px-4 py-3 cursor-pointer select-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleHeaderClick}
      >
        {/* Drag Handle */}
        <div className="flex justify-center mb-2">
          <div className="w-12 h-1 bg-slate-300 dark:bg-slate-600 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">Reports</h3>
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {reportCount}
            </span>
          </div>
          {state === 'collapsed' ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </div>
      </div>

      {/* Content */}
      {state !== 'collapsed' && (
        <div className="flex-1 min-h-0 overflow-y-auto pb-4 touch-pan-y" style={{ WebkitOverflowScrolling: 'touch' }}>
          {reports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">No reports found</p>
            </div>
          ) : (
            <ReportList
              reports={reports}
              selectedReportId={selectedReportId}
              onReportClick={onReportClick}
              userLocation={userLocation}
            />
          )}
        </div>
      )}
    </div>
  );
}

export type { SheetState };
