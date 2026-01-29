'use client';

import { MapIcon, List, Shield, User } from 'lucide-react';

type MobileTab = 'map' | 'reports' | 'safety' | 'profile';

interface MobileBottomNavProps {
  activeTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
  safetyBadge?: boolean;
  reportCount?: number;
}

export function MobileBottomNav({ activeTab, onTabChange, safetyBadge, reportCount }: MobileBottomNavProps) {
  const tabs = [
    { id: 'map' as MobileTab, label: 'Map', icon: MapIcon, badge: null },
    { id: 'reports' as MobileTab, label: 'Reports', icon: List, badge: reportCount && reportCount > 0 ? reportCount : null },
    { id: 'safety' as MobileTab, label: 'Safety', icon: Shield, badge: safetyBadge ? '!' : null },
    { id: 'profile' as MobileTab, label: 'Profile', icon: User, badge: null },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[9999] pointer-events-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur border-t border-slate-200 dark:border-slate-700 shadow-lg supports-[backdrop-filter]:bg-white/80 dark:supports-[backdrop-filter]:bg-slate-900/80" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div className="grid grid-cols-4 h-16">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`relative flex flex-col items-center justify-center gap-1 transition-all active:scale-95 ${
                isActive
                  ? 'text-blue-600'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                {tab.badge && (
                  <span className={`absolute -top-1.5 -right-1.5 min-w-[16px] h-4 flex items-center justify-center text-[10px] font-bold rounded-full px-1 ${
                    tab.id === 'safety' 
                      ? 'bg-red-500 text-white animate-pulse' 
                      : 'bg-blue-600 text-white'
                  }`}>
                    {typeof tab.badge === 'number' && tab.badge > 99 ? '99+' : tab.badge}
                  </span>
                )}
              </div>
              <span className={`text-xs font-medium ${isActive ? 'font-semibold' : ''}`}>{tab.label}</span>
              {isActive && (
                <div className="absolute bottom-1 w-1 h-1 bg-blue-600 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export type { MobileTab };
