'use client';

import { useState, useMemo } from 'react';
import { Plus, MapPin, List, Crosshair, ArrowUpDown, AlertCircle, X, Shield, User, Settings, FileText, HelpCircle, LogOut, ChevronDown, Bell, Moon, Sun, Grid, LayoutList } from 'lucide-react';
import { ReportListSkeleton, MapSkeleton } from '@/components/LoadingSkeletons';
import { Report, ReportStatus } from '@/lib/types';
import { ReportFilters } from '@/lib/filters';
import { calculateDistance } from '@/lib/geo';
import NigerianStateSelector from '@/components/NigerianStateSelector';
import { FilterBar } from '@/components/FilterBar';
import { ReportList } from '@/components/ReportList';
import { ReportThumbnailGrid } from '@/components/ReportThumbnailGrid';
import { ReportDetailsCard } from '@/components/ReportDetailsCard';
import { CreateReportModal } from '@/components/CreateReportModal';
import { LocationPermissionPrompt } from '@/components/LocationPermissionPrompt';
import { SafetyModal } from '@/components/SafetyModal';
import { AppShell } from '@/components/layout/AppShell';
import { NigerianState } from '@/lib/nigerianStates';
import MapView from '@/components/MapView';
import { useAuthedUser } from '@/hooks/useAuthedUser';
import { useRequireAccount } from '@/hooks/useRequireAccount';
import { useMyReports } from '@/hooks/useMyReports';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useTheme } from '@/contexts/ThemeContext';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { AuthModal } from '@/components/AuthModal';

interface DesktopHomeProps {
  rawReports: Report[];
  loading: boolean;
  error: string | null;
  selectedState: NigerianState | null;
  effectiveState: NigerianState;
  onStateChange: (state: NigerianState | null) => void;
  userLocation: { lat: number; lng: number } | null;
  onLocate: () => void;
  locating: boolean;
  showLocationPrompt: boolean;
  onDismissLocationPrompt: () => void;
  locationError: string | null;
  onClearLocationError: () => void;
}

export function DesktopHome({
  rawReports,
  loading,
  error,
  selectedState,
  effectiveState,
  onStateChange,
  userLocation,
  onLocate,
  locating,
  showLocationPrompt,
  onDismissLocationPrompt,
  locationError,
  onClearLocationError,
}: DesktopHomeProps) {
  const [filters, setFilters] = useState<ReportFilters>({});
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'recent' | 'upvoted' | 'nearest'>('recent');
  const [isSafetyModalOpen, setIsSafetyModalOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMyReportsModal, setShowMyReportsModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const { uid, isAnonymous } = useAuthedUser();
  const { requireAccount, showAuthModal, openAuthModal, closeAuthModal } = useRequireAccount({ uid, isAnonymous });
  const { reports: myReports, loading: myReportsLoading, count: reportCount } = useMyReports();
  const { isSupported: pushSupported, isSubscribed, permission, subscribe, unsubscribe, loading: pushLoading } = usePushNotifications();
  const { isDark, toggleTheme } = useTheme();
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const handleSignOut = async () => {
    try {
      setShowUserMenu(false);
      await signOut(auth);
      // Clear local storage and reload to reset app state
      localStorage.removeItem('wakaguard_onboarding_complete');
      window.location.reload();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const getStatusColor = (status: ReportStatus) => {
    switch (status) {
      case ReportStatus.ACTIVE: return 'bg-emerald-100 text-emerald-700';
      case ReportStatus.RESOLVED: return 'bg-slate-100 text-slate-600';
      case ReportStatus.EXPIRED: return 'bg-amber-100 text-amber-700';
      case ReportStatus.FLAGGED: return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  // Filter and sort reports
  const reports = useMemo(() => {
    let filtered = [...rawReports];

    const now = Date.now();
    filtered = filtered.filter((report) => {
      if (!report.expiresAt) return true;
      const expiryTime = report.expiresAt.toMillis ? report.expiresAt.toMillis() : 0;
      return expiryTime > now;
    });

    if (filters.type) {
      filtered = filtered.filter((report) => report.type === filters.type);
    }

    if (filters.severity) {
      filtered = filtered.filter((report) => report.severity === filters.severity);
    }

    if (filters.verification) {
      filtered = filtered.filter((report) => {
        const v = (report as any).verification ?? (report as any).verificationStatus;
        return v === filters.verification;
      });
    }

    if (filters.recency) {
      const cutoffTime = Date.now() - filters.recency;
      filtered = filtered.filter((report) => {
        const reportTime = report.createdAt?.toMillis() || 0;
        return reportTime >= cutoffTime;
      });
    }

    if (filters.searchQuery && filters.searchQuery.trim() !== '') {
      const query = filters.searchQuery.toLowerCase().trim();
      filtered = filtered.filter((report) => {
        const descriptionMatch = report.description?.toLowerCase().includes(query);
        const addressMatch = report.location?.address?.toLowerCase().includes(query);
        const typeMatch = report.type?.toLowerCase().includes(query);
        return descriptionMatch || addressMatch || typeMatch;
      });
    }

    if (filters.radiusKm && filters.radiusKm > 0 && userLocation) {
      filtered = filtered.filter((report) => {
        const distance = calculateDistance(
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
        const distA = calculateDistance(userLocation.lat, userLocation.lng, a.location.lat, a.location.lng);
        const distB = calculateDistance(userLocation.lat, userLocation.lng, b.location.lat, b.location.lng);
        return distA - distB;
      });
    }

    return filtered;
  }, [rawReports, sortBy, userLocation, filters]);

  const selectedReport = selectedReportId 
    ? reports.find(r => r.id === selectedReportId) || null 
    : null;

  const hasActiveFilters = !!(filters.type || filters.severity || filters.recency || filters.verification || filters.radiusKm || filters.searchQuery);

  const handleReportSelect = (reportId: string) => {
    const newId = reportId === selectedReportId ? null : reportId;
    setSelectedReportId(newId);
  };

  // Header content
  const headerContent = (
    <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
      <div className="max-w-screen-2xl mx-auto px-4 lg:px-6 2xl:px-8 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <MapPin className="w-6 h-6 text-blue-600" />
            <div className="flex flex-col">
              <h1 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">WakaGuard</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-none">Report road issues</p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <NigerianStateSelector 
              value={selectedState} 
              onChange={onStateChange} 
            />
            <button
              onClick={onLocate}
              disabled={locating}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
              title="Use my location"
              aria-label="Use my location"
            >
              {locating ? (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent" />
              ) : (
                <Crosshair className="w-5 h-5 text-slate-700 dark:text-slate-300" />
              )}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSafetyModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all font-medium shadow-md hover:shadow-lg"
              title="Safety features"
            >
              <Shield className="w-5 h-5" />
              <span className="hidden sm:inline">Safety</span>
            </button>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-medium shadow-md hover:shadow-lg"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">Report</span>
            </button>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 px-3 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
              >
                <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-600 dark:text-slate-300 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
              </button>

              {showUserMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                  <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                      <p className="font-semibold text-slate-900 dark:text-white">{uid ? 'Road Guardian' : 'Guest'}</p>
                      <p className="text-xs text-slate-500">{uid ? `ID: ${uid.substring(0, 12)}...` : 'Sign in to save reports'}</p>
                    </div>
                    {!uid && (
                      <div className="p-3 border-b border-slate-100 dark:border-slate-700">
                        <button
                          onClick={() => { openAuthModal(); setShowUserMenu(false); }}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                        >
                          <LogOut className="w-4 h-4 rotate-180" />
                          Sign In / Create Account
                        </button>
                      </div>
                    )}
                    <div className="py-2">
                      {uid && (
                      <button
                        onClick={() => { setShowMyReportsModal(true); setShowUserMenu(false); }}
                        className="w-full px-4 py-2.5 text-left hover:bg-slate-50 flex items-center gap-3 transition-colors"
                      >
                        <FileText className="w-4 h-4 text-slate-500" />
                        <span className="text-sm text-slate-700">My Reports</span>
                        <span className="ml-auto text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">{reportCount}</span>
                      </button>
                      )}
                      <button
                        onClick={() => { setShowSettingsModal(true); setShowUserMenu(false); }}
                        className="w-full px-4 py-2.5 text-left hover:bg-slate-50 flex items-center gap-3 transition-colors"
                      >
                        <Settings className="w-4 h-4 text-slate-500" />
                        <span className="text-sm text-slate-700">Settings</span>
                      </button>
                      <a
                        href="/support"
                        className="w-full px-4 py-2.5 text-left hover:bg-slate-50 flex items-center gap-3 transition-colors"
                      >
                        <HelpCircle className="w-4 h-4 text-slate-500" />
                        <span className="text-sm text-slate-700">Help & Support</span>
                      </a>
                    </div>
                    {uid && (
                      <div className="border-t border-slate-100 py-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSignOut();
                          }}
                          className="w-full px-4 py-2.5 text-left hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-3 transition-colors"
                        >
                          <LogOut className="w-4 h-4 text-red-500" />
                          <span className="text-sm text-red-600">Sign Out</span>
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>
  );

  // Filters content
  const filtersContent = (
    <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
      <div className="max-w-screen-2xl mx-auto px-4 lg:px-6 2xl:px-8">
        {showLocationPrompt && (
          <LocationPermissionPrompt 
            onAllow={onLocate} 
            onDismiss={onDismissLocationPrompt}
          />
        )}

        {locationError && (
          <div className="py-2">
            <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <p className="text-sm text-amber-800 flex-1">{locationError}</p>
              <button
                onClick={onClearLocationError}
                className="p-1 hover:bg-amber-100 rounded transition-colors"
              >
                <X className="w-4 h-4 text-amber-600" />
              </button>
            </div>
          </div>
        )}
        
        <div className="py-2">
          <FilterBar 
            filters={filters} 
            onFiltersChange={setFilters} 
            userLocation={userLocation} 
          />
        </div>
      </div>
    </div>
  );

  return (
    <>
      <AppShell header={headerContent} filters={filtersContent}>
        <div className="max-w-screen-2xl mx-auto px-4 lg:px-6 2xl:px-8 h-full flex flex-col">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full min-h-0">
            <div className="lg:col-span-8 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col lg:h-full">
              <div className="flex-1 relative">
                {loading ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <MapSkeleton />
                  </div>
                ) : (
                  <>
                    <MapView 
                      reports={reports}
                      selectedReportId={selectedReportId}
                      onMarkerClick={handleReportSelect}
                      selectedState={selectedState}
                      userLocation={userLocation}
                      onLocate={onLocate}
                      locating={locating}
                    />
                    
                    {!loading && reports.length === 0 && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-200 dark:border-slate-700 shadow-lg p-8 max-w-sm mx-4 pointer-events-auto">
                          <div className="text-center">
                            <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                              No reports in {selectedState || effectiveState}
                            </h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                              {hasActiveFilters 
                                ? 'Try adjusting your filters or search terms'
                                : 'Be the first to report a road issue in this area'
                              }
                            </p>
                            <div className="flex flex-col gap-2">
                              <button
                                onClick={() => setIsCreateModalOpen(true)}
                                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
                              >
                                <Plus className="w-4 h-4" />
                                Report an Issue
                              </button>
                              {hasActiveFilters && (
                                <button
                                  onClick={() => setFilters({})}
                                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
                                >
                                  Clear all filters
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
                <ReportDetailsCard 
                  report={selectedReport}
                  onClose={() => setSelectedReportId(null)}
                />
              </div>
            </div>

            <div className="lg:col-span-4 bg-white dark:bg-dark-card rounded-2xl border border-slate-200 dark:border-dark-border shadow-sm overflow-hidden flex flex-col lg:h-full">
              <div className="px-4 py-2 border-b border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card flex items-center justify-between">
                <h3 className="font-semibold text-slate-900 dark:text-white">Reports</h3>
                <div className="flex items-center gap-2">
                  {/* View Toggle */}
                  <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 shadow-sm' : 'hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                      title="List view"
                    >
                      <LayoutList className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                    </button>
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white dark:bg-slate-700 shadow-sm' : 'hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                      title="Grid view"
                    >
                      <Grid className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg px-2 py-1.5">
                    <ArrowUpDown className="w-4 h-4 text-slate-400" />
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as 'recent' | 'upvoted' | 'nearest')}
                      className="text-sm border-0 bg-transparent text-slate-600 dark:text-slate-300 font-medium focus:outline-none focus:ring-0 cursor-pointer"
                      title={!userLocation ? 'Enable location to sort by distance' : ''}
                    >
                      <option value="recent">Most recent</option>
                      <option value="upvoted">Most upvoted</option>
                      <option value="nearest" disabled={!userLocation}>Nearest</option>
                    </select>
                  </div>
                </div>
              </div>

              {error && (
                <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <div className="flex-1 min-h-0 overflow-y-auto">
                {loading ? (
                  <div className="p-4">
                    <ReportListSkeleton />
                  </div>
                ) : reports.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center px-6 py-8">
                    <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                      <MapPin className="w-10 h-10 text-blue-600" />
                    </div>
                    {rawReports.length > 0 ? (
                      <>
                        <h3 className="text-lg font-semibold text-slate-900 mb-2">
                          No reports match your filters
                        </h3>
                        <p className="text-sm text-slate-500 mb-6 max-w-xs">
                          Try adjusting your search criteria or clearing filters to see all reports.
                        </p>
                        <button
                          onClick={() => setFilters({})}
                          className="px-5 py-2.5 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-all font-medium shadow-sm hover:shadow-md"
                        >
                          Clear all filters
                        </button>
                      </>
                    ) : (
                      <>
                        <h3 className="text-lg font-semibold text-slate-900 mb-2">
                          No reports yet for {selectedState}
                        </h3>
                        <p className="text-sm text-slate-500 mb-6 max-w-xs">
                          Be the first to report a road issue and help improve safety in your community.
                        </p>
                        
                        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
                          <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-colors font-medium"
                          >
                            <Plus className="w-5 h-5" />
                            Report Issue
                          </button>
                          <button
                            onClick={onLocate}
                            disabled={locating}
                            className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-slate-100 text-slate-700 rounded-2xl hover:bg-slate-200 transition-colors font-medium disabled:opacity-50"
                          >
                            <Crosshair className="w-5 h-5" />
                            {locating ? 'Locating...' : 'Use my location'}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <>
                    {viewMode === 'list' ? (
                      <ReportList 
                        reports={reports}
                        selectedReportId={selectedReportId}
                        onReportClick={handleReportSelect}
                        userLocation={userLocation}
                      />
                    ) : (
                      <ReportThumbnailGrid
                        reports={reports}
                        selectedReportId={selectedReportId}
                        onSelectReport={handleReportSelect}
                      />
                    )}
                    
                    <div className="px-4 py-3 border-t border-slate-100 dark:border-dark-border bg-slate-50 dark:bg-dark-card space-y-2">
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>Last updated: {new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
                        <span>{reports.length} of {rawReports.length} shown</span>
                      </div>
                      <div className="text-xs text-slate-600 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                        <strong className="text-blue-700">💡 Tip:</strong> Reports with photos get verified faster by the community
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </AppShell>

      <CreateReportModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        defaultState={effectiveState}
        initialLocation={userLocation}
      />

      <SafetyModal
        isOpen={isSafetyModalOpen}
        onClose={() => setIsSafetyModalOpen(false)}
      />

      {/* My Reports Modal */}
      {showMyReportsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div>
                <h2 className="text-xl font-bold text-slate-900">My Reports</h2>
                <p className="text-sm text-slate-500">{reportCount} reports submitted</p>
              </div>
              <button
                onClick={() => setShowMyReportsModal(false)}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {myReportsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
                </div>
              ) : myReports.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                  <p className="text-slate-500 text-lg">No reports yet</p>
                  <p className="text-sm text-slate-400 mt-1">Your submitted reports will appear here</p>
                  <button
                    onClick={() => { setShowMyReportsModal(false); setIsCreateModalOpen(true); }}
                    className="mt-4 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    Create Your First Report
                  </button>
                </div>
              ) : (
                <div className="grid gap-4">
                  {myReports.map((report) => (
                    <div key={report.id} className="bg-slate-50 rounded-xl p-4 hover:bg-slate-100 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-slate-900 capitalize">{report.type}</p>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(report.status)}`}>
                              {report.status}
                            </span>
                          </div>
                          <p className="text-sm text-slate-600 line-clamp-2">{report.description}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {report.location.address?.substring(0, 30) || 'Unknown'}...
                            </span>
                            <span>👍 {report.upvotes || 0}</span>
                            <span>💬 {report.commentCount || 0}</span>
                          </div>
                        </div>
                        <p className="text-xs text-slate-400">
                          {report.createdAt?.toDate?.()?.toLocaleDateString() || 'Recently'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">Settings</h2>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <User className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">Account</p>
                    <p className="text-xs text-slate-500">{uid ? `ID: ${uid.substring(0, 8)}...` : 'Guest'}</p>
                  </div>
                </div>
              </div>

              {/* Dark Mode */}
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDark ? 'bg-amber-100' : 'bg-indigo-100'}`}>
                    {isDark ? <Sun className="w-5 h-5 text-amber-600" /> : <Moon className="w-5 h-5 text-indigo-600" />}
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">Dark Mode</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{isDark ? 'On' : 'Off'}</p>
                  </div>
                </div>
                <button
                  onClick={toggleTheme}
                  className={`w-12 h-7 rounded-full transition-colors ${isDark ? 'bg-blue-600' : 'bg-slate-300'}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${isDark ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              {/* Push Notifications */}
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                    <Bell className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">Push Notifications</p>
                    {!pushSupported && (
                      <p className="text-xs text-slate-500">Not supported in this browser</p>
                    )}
                    {pushSupported && permission === 'denied' && (
                      <p className="text-xs text-red-500">Blocked - enable in browser settings</p>
                    )}
                    {pushSupported && permission !== 'denied' && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">{isSubscribed ? 'Enabled' : 'Disabled'}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (!requireAccount('push notifications')) return;
                    if (isSubscribed) {
                      unsubscribe();
                    } else {
                      subscribe();
                    }
                  }}
                  disabled={!pushSupported || permission === 'denied' || pushLoading}
                  className={`w-12 h-7 rounded-full transition-colors disabled:opacity-50 ${isSubscribed ? 'bg-blue-600' : 'bg-slate-300'}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${isSubscribed ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              <div className="space-y-2">
                <a
                  href="/guidelines"
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <span className="font-medium text-slate-700">Community Guidelines</span>
                  <ChevronDown className="w-4 h-4 text-slate-400 -rotate-90" />
                </a>
                <a
                  href="/privacy"
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <span className="font-medium text-slate-700">Privacy Policy</span>
                  <ChevronDown className="w-4 h-4 text-slate-400 -rotate-90" />
                </a>
                <a
                  href="/support"
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <span className="font-medium text-slate-700">Contact Support</span>
                  <ChevronDown className="w-4 h-4 text-slate-400 -rotate-90" />
                </a>
              </div>

              <div className="pt-4 border-t border-slate-200">
                <p className="text-xs text-slate-500 text-center">WakaGuard v1.0.0</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      <AuthModal isOpen={showAuthModal} onClose={closeAuthModal} />
    </>
  );
}
