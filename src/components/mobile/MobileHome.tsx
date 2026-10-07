'use client';

import { useState, useMemo, useCallback } from 'react';
import { Plus, Search, ThumbsUp, ThumbsDown, Clock, MapPin, ChevronRight, AlertTriangle, X, List, Map as MapIcon, Info } from 'lucide-react';
import { Report } from '@/lib/types';
import { ReportFilters } from '@/lib/filters';
import { NigerianState, PILOT_STATES } from '@/lib/nigerianStates';
import { MobileTopBar } from './MobileTopBar';
import { MobileBottomNav, MobileTab } from './MobileBottomNav';
import { ReportsBottomSheet, SheetState } from './ReportsBottomSheet';
import { FilterSheet } from './FilterSheet';
import { ReportDetailsSheet } from './ReportDetailsSheet';
import { SafetyScreen } from './screens/SafetyScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import MapView from '@/components/MapView';
import { CreateReportModal } from '@/components/CreateReportModal';
import NigerianStateSelector from '@/components/NigerianStateSelector';
import { auth } from '@/lib/firebase';
import { useSafety } from '@/hooks/useSafety';
import { useTripLocationSync } from '@/hooks/useTripLocationSync';
import { useEffect } from 'react';

interface MobileHomeProps {
  rawReports: Report[];
  loading: boolean;
  selectedState: NigerianState | null;
  effectiveState: NigerianState;
  onStateChange: (state: NigerianState | null) => void;
  userLocation: { lat: number; lng: number } | null;
  onLocate: () => void;
  locating: boolean;
}

export function MobileHome({
  rawReports,
  loading,
  selectedState,
  effectiveState,
  onStateChange,
  userLocation,
  onLocate,
  locating,
}: MobileHomeProps) {
  // Signed-in users land on the trip screen; guests can only browse, so they
  // start on the map. Auth has already settled by the time this screen mounts.
  const [activeTab, setActiveTab] = useState<MobileTab>(() =>
    auth?.currentUser && !auth.currentUser.isAnonymous ? 'safety' : 'map'
  );
  const [filters, setFilters] = useState<ReportFilters>({});
  const [sortBy, setSortBy] = useState<'recent' | 'upvoted' | 'nearest'>('recent');
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [sheetState, setSheetState] = useState<SheetState>('collapsed');
  // Nearby shows the reports on the map or as a list
  const [nearbyView, setNearbyView] = useState<'map' | 'list'>('map');
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [showStateSelector, setShowStateSelector] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  // Safety status for badge
  const { activeTrip, activeTimer } = useSafety();
  const hasSafetyActivity = !!(activeTrip || activeTimer);
  // Runs here because MobileHome stays mounted across tabs
  useTripLocationSync(activeTrip, (problem) => {
    setToast({
      message: problem === 'permission_denied'
        ? 'Location permission is off. Your contacts cannot see where you are. Turn it on in Settings.'
        : 'Location is unavailable. Your contacts cannot see where you are.',
      type: 'error',
    });
    // The trip card keeps showing the location state, so this only needs to be noticed once
    setTimeout(() => setToast(null), 6000);
  });
  
  // First-time user hint
  const [showWelcomeHint, setShowWelcomeHint] = useState(() => {
    if (typeof window !== 'undefined') {
      return !localStorage.getItem('wakaguard_nearby_note_seen');
    }
    return true;
  });
  
  const dismissWelcomeHint = () => {
    setShowWelcomeHint(false);
    localStorage.setItem('wakaguard_nearby_note_seen', 'true');
  };

  // Filter and sort reports
  const reports = useMemo(() => {
    let filtered = [...rawReports];

    // Expire old reports
    const now = Date.now();
    filtered = filtered.filter((report) => {
      const expiryTime = report.expiresAt?.toMillis?.() || 0;
      return expiryTime > now;
    });

    // Type filter
    if (filters.type) {
      filtered = filtered.filter((report) => report.type === filters.type);
    }

    // Severity filter
    if (filters.severity) {
      filtered = filtered.filter((report) => report.severity === filters.severity);
    }

    // Verification filter
    if (filters.verification) {
      filtered = filtered.filter((report) => report.verification === filters.verification);
    }

    // Recency filter
    if (filters.recency && filters.recency > 0) {
      const cutoffTime = now - filters.recency * 24 * 60 * 60 * 1000;
      filtered = filtered.filter((report) => {
        const createdTime = report.createdAt?.toMillis?.() || 0;
        return createdTime >= cutoffTime;
      });
    }

    // Search filter
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter((report) =>
        report.description.toLowerCase().includes(query) ||
        report.type.toLowerCase().includes(query) ||
        report.location.address?.toLowerCase().includes(query)
      );
    }

    // Radius filter
    if (filters.radiusKm && filters.radiusKm > 0 && userLocation) {
      filtered = filtered.filter((report) => {
        const distance = getDistance(
          userLocation.lat,
          userLocation.lng,
          report.location.lat,
          report.location.lng
        );
        return distance <= filters.radiusKm!;
      });
    }

    // Sort
    if (sortBy === 'upvoted') {
      filtered.sort((a, b) => (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes));
    } else if (sortBy === 'nearest' && userLocation) {
      filtered.sort((a, b) => {
        const distA = getDistance(userLocation.lat, userLocation.lng, a.location.lat, a.location.lng);
        const distB = getDistance(userLocation.lat, userLocation.lng, b.location.lat, b.location.lng);
        return distA - distB;
      });
    }
    // 'recent' is already sorted by Firestore

    return filtered.slice(0, 200); // Limit for performance
  }, [rawReports, filters, sortBy, userLocation]);

  const selectedReport = selectedReportId
    ? reports.find(r => r.id === selectedReportId) || null
    : null;

  const activeFilterCount = Object.values(filters).filter(v => v !== undefined && v !== '' && v !== 0).length;

  const handleReportClick = useCallback((reportId: string) => {
    setSelectedReportId(reportId);
    setActiveTab('map'); // Switch to map to show marker
    setNearbyView('map');
  }, []);

  const handleShowToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const handleTabChange = (tab: MobileTab) => {
    setActiveTab(tab);
    setSheetState('collapsed');
  };

  // Helper: Format time ago
  const formatTimeAgo = (timestamp: any) => {
    if (!timestamp?.toMillis) return '';
    const seconds = Math.floor((Date.now() - timestamp.toMillis()) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  // Helper: Format distance
  const formatDistance = (report: Report) => {
    if (!userLocation) return null;
    const dist = getDistance(userLocation.lat, userLocation.lng, report.location.lat, report.location.lng);
    if (dist < 1) return `${Math.round(dist * 1000)}m`;
    return `${dist.toFixed(1)}km`;
  };

  // Severity colors
  const severityColors: Record<string, string> = {
    critical: 'bg-red-100 text-red-700 border-red-200',
    high: 'bg-orange-100 text-orange-700 border-orange-200',
    medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    low: 'bg-green-100 text-green-700 border-green-200',
  };

  // Mobile Reports Screen Component
  function MobileReportsScreen({
    reports,
    selectedReportId,
    onReportClick,
    userLocation,
  }: {
    reports: Report[];
    selectedReportId: string | null;
    onReportClick: (id: string) => void;
    userLocation: { lat: number; lng: number } | null;
  }) {
    return (
      <div className="absolute inset-0 overflow-y-auto bg-slate-50 dark:bg-slate-900">
        <div className="px-4 pt-4 pb-24 space-y-3" style={{ marginTop: 'calc(env(safe-area-inset-top, 0px) + 56px)' }}>
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Reports near you</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {reports.length === 0 ? 'No active reports' : `${reports.length} active report${reports.length === 1 ? '' : 's'}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setNearbyView('map')}
                className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl text-sm font-medium"
              >
                <MapIcon className="w-4 h-4" />
                Map
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-brand-600 text-white rounded-xl text-sm font-medium hover:bg-brand-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Report
              </button>
            </div>
          </div>

          {/* Sort Options */}
          <div className="flex gap-2">
            {(['recent', 'nearest', 'upvoted'] as const).map((option) => (
              <button
                key={option}
                onClick={() => setSortBy(option)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  sortBy === option
                    ? 'bg-brand-600 text-white'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                }`}
              >
                {option === 'recent' ? 'Recent' : option === 'nearest' ? 'Nearest' : 'Top Voted'}
              </button>
            ))}
          </div>

          {/* Reports List */}
          {reports.length === 0 ? (
            <div className="mt-8 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 p-8 text-center">
              <AlertTriangle className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-slate-600 dark:text-slate-400 font-medium mb-1">No reports yet</p>
              <p className="text-sm text-slate-500 dark:text-slate-500 mb-4">
                Nobody has reported anything here lately. That does not mean the roads are clear.
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-brand-600 text-white rounded-xl text-sm font-medium hover:bg-brand-700 transition-colors"
              >
                Report something
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((r) => {
                const isSelected = r.id === selectedReportId;
                const distance = formatDistance(r);
                const timeAgo = formatTimeAgo(r.createdAt);
                
                return (
                  <button
                    key={r.id}
                    onClick={() => onReportClick(r.id)}
                    className={`w-full text-left rounded-2xl border-2 p-4 transition-all active:scale-[0.98] ${
                      isSelected
                        ? 'border-brand-400 bg-brand-50 dark:bg-brand-900/20 shadow-md'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    {/* Top Row */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${severityColors[r.severity] || severityColors.medium}`}>
                          {r.severity}
                        </span>
                        <span className="text-sm font-bold text-slate-900 dark:text-white capitalize">{r.type}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    </div>
                    
                    {/* Description */}
                    <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2 mb-3">{r.description}</p>
                    
                    {/* Bottom Row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                        {distance && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {distance}
                          </span>
                        )}
                        {timeAgo && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {timeAgo}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1 text-xs text-green-600">
                          <ThumbsUp className="w-3 h-3" />
                          {r.upvotes || 0}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-red-500">
                          <ThumbsDown className="w-3 h-3" />
                          {r.downvotes || 0}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Render tab content
  const renderContent = () => {
    if (activeTab === 'safety') {
      return <SafetyScreen />;
    }

    if (activeTab === 'profile') {
      return <ProfileScreen />;
    }

    if (activeTab === 'map' && nearbyView === 'list') {
      return (
        <>
          <MobileReportsScreen
            reports={reports}
            selectedReportId={selectedReportId}
            onReportClick={handleReportClick}
            userLocation={userLocation}
          />
        </>
      );
    }

    // MAP TAB (default)
    return (
      <>
        {/* Map Stage */}
        <div className="absolute inset-0 bottom-20">
          <MapView
            reports={reports}
            selectedReportId={selectedReportId}
            onMarkerClick={handleReportClick}
            selectedState={selectedState}
            userLocation={userLocation}
            onLocate={onLocate}
            locating={locating}
          />
        </div>

        {/* What this map is, shown until dismissed */}
        {showWelcomeHint && (
          <div className="fixed left-4 right-4 z-30" style={{ top: 'calc(env(safe-area-inset-top, 0px) + 126px)' }}>
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-lg p-3 flex items-start gap-3">
              <Info className="w-5 h-5 text-brand-600 dark:text-brand-300 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <p className="flex-1 text-sm text-slate-700 dark:text-slate-200">
                Reports here come from other travellers. No report does not mean a road is safe.
              </p>
              <button
                onClick={dismissWelcomeHint}
                className="p-1 -m-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Report button: sits above the reports sheet, and steps aside when the sheet is opened */}
        {sheetState === 'collapsed' && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="fixed bottom-48 right-4 z-30 h-14 pl-4 pr-5 bg-brand-600 text-white rounded-full shadow-xl hover:bg-brand-700 transition-colors flex items-center gap-2 font-semibold"
            aria-label="Report something on the road"
          >
            <Plus className="w-6 h-6" />
            Report
          </button>
        )}

        {/* Search, and the same reports as a list */}
        <div className="fixed left-4 right-4 z-20 flex gap-2" style={{ top: 'calc(env(safe-area-inset-top, 0px) + 70px)' }}>
          <button
            onClick={() => setShowFilterSheet(true)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full shadow-md transition-colors"
          >
            <Search className="w-4 h-4 text-slate-700 dark:text-slate-200" />
            <span className="text-sm font-medium text-slate-900 dark:text-white">Search and filters</span>
            {activeFilterCount > 0 && (
              <span className="ml-1 w-5 h-5 bg-brand-600 text-white text-xs rounded-full flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setNearbyView('list')}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full shadow-md text-sm font-medium text-slate-900 dark:text-white"
          >
            <List className="w-4 h-4" />
            List
          </button>
        </div>

        {/* Reports Bottom Sheet */}
        <ReportsBottomSheet
          reports={reports}
          selectedReportId={selectedReportId}
          onReportClick={handleReportClick}
          userLocation={userLocation}
          reportCount={reports.length}
          state={sheetState}
          onStateChange={setSheetState}
        />
      </>
    );
  };

  return (
    <div className="fixed inset-0 bg-slate-50 flex flex-col">
      {/* Top Bar */}
      <MobileTopBar
        title={activeTab === 'safety' ? 'Safe Trip' : activeTab === 'map' ? 'Nearby' : 'Profile'}
        showAreaControls={activeTab === 'map'}
        selectedState={selectedState}
        onStateClick={() => setShowStateSelector(true)}
        onLocate={onLocate}
        locating={locating}
      />

      {/* Main Content Area */}
      <div className="flex-1 relative">
        {renderContent()}
      </div>

      {/* Bottom Navigation */}
      <MobileBottomNav 
        activeTab={activeTab} 
        onTabChange={handleTabChange}
        safetyBadge={hasSafetyActivity}
      />

      {/* Modals & Sheets */}
      <FilterSheet
        isOpen={showFilterSheet}
        onClose={() => setShowFilterSheet(false)}
        filters={filters}
        onFiltersChange={setFilters}
        userLocation={userLocation}
      />

      <ReportDetailsSheet
        report={selectedReport}
        onClose={() => setSelectedReportId(null)}
        onShowToast={handleShowToast}
      />

      <CreateReportModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        defaultState={effectiveState}
        initialLocation={userLocation}
      />

      {/* State Selector Sheet */}
      {showStateSelector && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowStateSelector(false)}
          />
          <div className="fixed inset-x-0 bottom-0 z-50 bg-white dark:bg-slate-800 rounded-t-3xl shadow-2xl max-h-[70vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Select State</h2>
              <button 
                onClick={() => setShowStateSelector(false)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 pb-20 touch-pan-y" style={{ WebkitOverflowScrolling: 'touch' }}>
              <div className="grid grid-cols-2 gap-2 pb-4">
                {PILOT_STATES.map((state) => (
                  <button
                    key={state}
                    onClick={() => {
                      onStateChange(state);
                      setShowStateSelector(false);
                    }}
                    className={`p-3 rounded-xl text-left text-sm font-medium transition-colors ${
                      selectedState === state
                        ? 'bg-brand-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-600'
                    }`}
                  >
                    {state}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-20 left-4 right-4 z-50 animate-in slide-in-from-top duration-300">
          <div className={`p-4 rounded-xl shadow-lg ${
            toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
          } text-white text-sm font-medium text-center`}>
            {toast.message}
          </div>
        </div>
      )}
    </div>
  );
}

// Helper function for distance calculation
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
