'use client';

import { useState } from 'react';
import { User, LogOut, Settings, HelpCircle, Shield, FileText, ChevronRight, MapPin, ThumbsUp, MessageCircle, Loader2, ExternalLink, Bell, Moon, X, Sun, LogIn } from 'lucide-react';
import { useAuthedUser } from '@/hooks/useAuthedUser';
import { useRequireAccount } from '@/hooks/useRequireAccount';
import { useMyReports } from '@/hooks/useMyReports';
import { useUserStats } from '@/hooks/useUserStats';
import { USER_LEVELS, BADGES } from '@/lib/types';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useTheme } from '@/contexts/ThemeContext';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Report, ReportStatus } from '@/lib/types';
import { AuthModal } from '@/components/AuthModal';
import Link from 'next/link';
import { COMPANY_NAME } from '@/lib/company';

type ModalType = 'myReports' | 'settings' | 'help' | null;

export function ProfileScreen() {
  const { uid, isAnonymous, email, displayName, username } = useAuthedUser();
  const { requireAccount, showAuthModal, openAuthModal, closeAuthModal } = useRequireAccount({ uid, isAnonymous });
  const { reports: myReports, loading: reportsLoading, count: reportCount } = useMyReports();
  const { stats, getLevelTitle } = useUserStats(uid);
  const { isSupported: pushSupported, isSubscribed, permission, subscribe, unsubscribe, loading: pushLoading } = usePushNotifications();
  const { theme, toggleTheme, isDark } = useTheme();
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  
  const handleSignOut = async () => {
    try {
      await signOut(auth);
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

  // Calculate stats
  const activeReports = myReports.filter(r => r.status === ReportStatus.ACTIVE).length;
  const totalUpvotes = myReports.reduce((sum, r) => sum + (r.upvotes || 0), 0);

  return (
    <div className="absolute inset-0 overflow-y-auto px-4 pt-20 pb-28 space-y-5 bg-slate-50 dark:bg-slate-900 touch-pan-y" style={{ marginTop: 'calc(env(safe-area-inset-top, 0px) + 56px)', WebkitOverflowScrolling: 'touch' }}>
      {/* Profile Header */}
      <div className="text-center">
        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full mx-auto mb-4 flex items-center justify-center shadow-lg">
          <User className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
          {!uid || isAnonymous ? 'Guest User' : (username || displayName || 'Road Guardian')}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {!uid || isAnonymous ? 'Sign in to save your reports' : (username ? `@${username}` : email || 'Set up your username')}
        </p>
        
        {/* Sign In Button for Guests */}
        {(!uid || isAnonymous) && (
          <button
            onClick={openAuthModal}
            className="mt-4 flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium mx-auto"
          >
            <LogIn className="w-4 h-4" />
            Sign In / Create Account
          </button>
        )}
      </div>

      {/* Level & Points Card */}
      {uid && !isAnonymous && stats && (
        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-4 text-white">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm opacity-80">Level {stats.level}</p>
              <p className="text-lg font-bold">{getLevelTitle(stats.level)}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">{stats.points}</p>
              <p className="text-sm opacity-80">points</p>
            </div>
          </div>
          {/* Progress to next level */}
          {stats.level < 6 && (
            <div>
              <div className="flex justify-between text-xs opacity-80 mb-1">
                <span>Progress to Level {stats.level + 1}</span>
                <span>{USER_LEVELS[stats.level]?.points - stats.points} pts needed</span>
              </div>
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-white rounded-full transition-all"
                  style={{ 
                    width: `${Math.min(100, ((stats.points - USER_LEVELS[stats.level - 1].points) / (USER_LEVELS[stats.level].points - USER_LEVELS[stats.level - 1].points)) * 100)}%` 
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stats Cards */}
      {uid && !isAnonymous && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 text-center border border-slate-200 dark:border-slate-700">
            <p className="text-2xl font-bold text-blue-600">{reportCount}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Reports</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 text-center border border-slate-200 dark:border-slate-700">
            <p className="text-2xl font-bold text-emerald-600">{activeReports}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Active</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 text-center border border-slate-200 dark:border-slate-700">
            <p className="text-2xl font-bold text-amber-600">{totalUpvotes}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Upvotes</p>
          </div>
        </div>
      )}

      {/* Menu Items */}
      <div className="space-y-2">
        {uid && (
          <button
            onClick={() => setActiveModal('myReports')}
            className="w-full p-4 bg-white border border-slate-200 rounded-xl text-left hover:bg-slate-50 transition-colors flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <span className="text-slate-900 font-medium block">My Reports</span>
                <span className="text-xs text-slate-500">{reportCount} reports submitted</span>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </button>
        )}

        <button
          onClick={() => setActiveModal('settings')}
          className="w-full p-4 bg-white border border-slate-200 rounded-xl text-left hover:bg-slate-50 transition-colors flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
              <Settings className="w-5 h-5 text-slate-600" />
            </div>
            <span className="text-slate-900 font-medium">Settings</span>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400" />
        </button>

        <button
          onClick={() => setActiveModal('help')}
          className="w-full p-4 bg-white border border-slate-200 rounded-xl text-left hover:bg-slate-50 transition-colors flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
              <HelpCircle className="w-5 h-5 text-amber-600" />
            </div>
            <span className="text-slate-900 font-medium">Help & Support</span>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400" />
        </button>

        {uid && (
          <button
            onClick={handleSignOut}
            className="w-full p-4 bg-white border border-red-200 rounded-xl text-left hover:bg-red-50 transition-colors flex items-center gap-3"
          >
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
              <LogOut className="w-5 h-5 text-red-600" />
            </div>
            <span className="text-red-600 font-medium">Sign Out</span>
          </button>
        )}
      </div>

      {/* Info Section */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-slate-900">About WakaGuard</h3>
        </div>
        <p className="text-sm text-slate-600">
          Start a trip and say when you should arrive. If you don&apos;t, the people you chose are texted your last location. Reports from other travellers show what is happening near you.
        </p>
        <p className="text-xs text-slate-500">WakaGuard is a product of {COMPANY_NAME}.</p>
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <span className="text-xs text-slate-500">Version 1.0.0</span>
          <Link href="/privacy" className="text-xs text-blue-600 hover:underline">Privacy Policy</Link>
        </div>
      </div>

      {/* My Reports Modal */}
      {activeModal === 'myReports' && (
        <div className="fixed inset-0 z-50 bg-black/50">
          <div className="absolute inset-x-0 bottom-0 top-20 bg-white rounded-t-3xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-900">My Reports</h2>
              <button onClick={() => setActiveModal(null)} className="p-2 hover:bg-slate-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 touch-pan-y" style={{ WebkitOverflowScrolling: 'touch' }}>
              {reportsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                </div>
              ) : myReports.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">No reports yet</p>
                  <p className="text-sm text-slate-400">Your submitted reports will appear here</p>
                </div>
              ) : (
                myReports.map((report) => (
                  <ReportCard key={report.id} report={report} getStatusColor={getStatusColor} />
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {activeModal === 'settings' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Settings</h2>
              <button onClick={() => setActiveModal(null)} className="p-2 hover:bg-slate-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-slate-600" />
                  <div>
                    <span className="font-medium text-slate-900 block">Push Notifications</span>
                    {!pushSupported && (
                      <span className="text-xs text-slate-500">Not supported in this browser</span>
                    )}
                    {pushSupported && permission === 'denied' && (
                      <span className="text-xs text-red-500">Blocked - enable in browser settings</span>
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

              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                <div className="flex items-center gap-3">
                  {isDark ? <Sun className="w-5 h-5 text-amber-500" /> : <Moon className="w-5 h-5 text-slate-600" />}
                  <span className="font-medium text-slate-900 dark:text-white">Dark Mode</span>
                </div>
                <button
                  onClick={toggleTheme}
                  className={`w-12 h-7 rounded-full transition-colors ${isDark ? 'bg-blue-600' : 'bg-slate-300'}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${isDark ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Help Modal */}
      {activeModal === 'help' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Help & Support</h2>
              <button onClick={() => setActiveModal(null)} className="p-2 hover:bg-slate-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-3">
              <Link
                href="/guidelines"
                className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <span className="font-medium text-slate-900">Community Guidelines</span>
                <ExternalLink className="w-4 h-4 text-slate-400" />
              </Link>

              <Link
                href="/support"
                className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <span className="font-medium text-slate-900">Contact Support</span>
                <ExternalLink className="w-4 h-4 text-slate-400" />
              </Link>

              <Link
                href="/privacy"
                className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <span className="font-medium text-slate-900">Privacy Policy</span>
                <ExternalLink className="w-4 h-4 text-slate-400" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      <AuthModal isOpen={showAuthModal} onClose={closeAuthModal} />
    </div>
  );
}

// Report Card Component
function ReportCard({ report, getStatusColor }: { report: Report; getStatusColor: (status: ReportStatus) => string }) {
  return (
    <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold text-slate-900 capitalize">{report.type}</p>
          <p className="text-sm text-slate-500 line-clamp-2">{report.description}</p>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(report.status)}`}>
          {report.status}
        </span>
      </div>
      <div className="flex items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          {report.location.address?.substring(0, 25) || 'Unknown location'}...
        </span>
        <span className="flex items-center gap-1">
          <ThumbsUp className="w-3 h-3" />
          {report.upvotes || 0}
        </span>
        <span className="flex items-center gap-1">
          <MessageCircle className="w-3 h-3" />
          {report.commentCount || 0}
        </span>
      </div>
      <p className="text-xs text-slate-400">
        {report.createdAt?.toDate?.()?.toLocaleDateString() || 'Recently'}
      </p>
    </div>
  );
}
