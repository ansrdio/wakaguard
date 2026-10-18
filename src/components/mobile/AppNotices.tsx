'use client';

/**
 * The cards at the top of the Trip and Profile screens that come from the
 * server's config/app: "please update" and a notice for everyone
 * (src/lib/appConfig.ts). Not on the Nearby map, whose buttons float at fixed
 * places under the top bar.
 */

import { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { AlertTriangle, Info, X } from 'lucide-react';
import { APP_BUILD } from '@/lib/appVersion';
import { noticeToShow, updateNeed } from '@/lib/appConfig';
import { useAppConfig } from '@/hooks/useAppConfig';

const DISMISSED_NOTICE_KEY = 'wakaguard_dismissed_notice';

function readDismissed(): string | null {
  try {
    return window.localStorage.getItem(DISMISSED_NOTICE_KEY);
  } catch {
    return null;
  }
}

export function AppNotices() {
  const config = useAppConfig();
  const isPhoneApp = Capacitor.isNativePlatform();
  const [dismissedNotice, setDismissedNotice] = useState<string | null>(() => readDismissed());
  const [updateHidden, setUpdateHidden] = useState(false);

  const need = updateNeed(APP_BUILD, config, isPhoneApp);
  const notice = noticeToShow(config, dismissedNotice);
  const updateUrl = Capacitor.getPlatform() === 'ios' ? config?.updateUrlIos : config?.updateUrlAndroid;

  const dismissNotice = (id: string) => {
    setDismissedNotice(id);
    try {
      window.localStorage.setItem(DISMISSED_NOTICE_KEY, id);
    } catch {
      // Not remembered: it shows again next launch
    }
  };

  const showUpdate = need === 'required' || (need === 'available' && !updateHidden);
  if (!showUpdate && !notice) return null;

  return (
    <div className="space-y-2">
      {showUpdate && (
        <div
          role="status"
          className={`flex items-start gap-3 rounded-2xl p-3 text-sm ${
            need === 'required'
              ? 'bg-red-600 text-white'
              : 'bg-blue-50 text-blue-950 border border-blue-200 dark:bg-blue-950 dark:text-blue-50 dark:border-blue-800'
          }`}
        >
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="flex-1">
            <p className="font-semibold">
              {need === 'required' ? 'Please update WakaGuard now' : 'A new version of WakaGuard is ready'}
            </p>
            <p className="mt-0.5">
              {need === 'required'
                ? 'This version is out of date, and trips and alerts may not work properly until you update.'
                : 'Update to get the latest fixes.'}
            </p>
            {updateUrl && (
              <button
                type="button"
                onClick={() => window.open(updateUrl, '_blank')}
                className={`mt-2 px-3 py-1.5 rounded-xl font-semibold ${
                  need === 'required' ? 'bg-white text-red-700' : 'bg-blue-700 text-white'
                }`}
              >
                Update now
              </button>
            )}
          </div>
          {need === 'available' && (
            <button type="button" aria-label="Hide" onClick={() => setUpdateHidden(true)} className="p-1 -m-1">
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
        </div>
      )}
      {notice && (
        <div
          role="status"
          className={`flex items-start gap-3 rounded-2xl p-3 text-sm border ${
            notice.level === 'warning'
              ? 'bg-amber-50 text-amber-950 border-amber-300 dark:bg-amber-950 dark:text-amber-50 dark:border-amber-700'
              : 'bg-white text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700'
          }`}
        >
          {notice.level === 'warning'
            ? <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
            : <Info className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />}
          <p className="flex-1">{notice.text}</p>
          <button type="button" aria-label="Dismiss" onClick={() => dismissNotice(notice.id)} className="p-1 -m-1">
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
