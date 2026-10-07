'use client';

import { MapPin, Navigation, User } from 'lucide-react';
import { useKeyboardOpen } from '@/hooks/useKeyboardOpen';

type MobileTab = 'safety' | 'map' | 'profile';

interface MobileBottomNavProps {
  activeTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
  /** A trip is running */
  safetyBadge?: boolean;
}

export function MobileBottomNav({ activeTab, onTabChange, safetyBadge }: MobileBottomNavProps) {
  // The trip comes first: it is what the app is for. The ids are older than
  // the labels: 'safety' is the Trip tab and 'map' is Nearby.
  const tabs = [
    { id: 'safety' as MobileTab, label: 'Trip', icon: Navigation, badge: !!safetyBadge },
    { id: 'map' as MobileTab, label: 'Nearby', icon: MapPin, badge: false },
    { id: 'profile' as MobileTab, label: 'Profile', icon: User, badge: false },
  ];

  // With the keyboard up the bar would sit on top of it, over the form being
  // filled in and its buttons
  const keyboardOpen = useKeyboardOpen();
  if (keyboardOpen) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[9999] pointer-events-auto bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div className="grid grid-cols-3 h-16">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`relative flex flex-col items-center justify-center gap-1 transition-colors active:scale-95 ${
                isActive
                  ? 'text-brand-600 dark:text-brand-300'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
              aria-label={tab.badge ? `${tab.label}, trip in progress` : tab.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className="relative">
                <Icon className="w-6 h-6" strokeWidth={isActive ? 2.4 : 2} />
                {tab.badge && (
                  <span className="absolute -top-0.5 -right-1 w-2.5 h-2.5 rounded-full bg-brand-500 ring-2 ring-white dark:ring-slate-900" />
                )}
              </div>
              <span className={`text-xs ${isActive ? 'font-semibold' : 'font-medium'}`}>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export type { MobileTab };
