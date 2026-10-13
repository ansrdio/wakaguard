'use client';

import { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { MapPin, MapPinOff } from 'lucide-react';
import { adviseOnLocation, askForLocation, openPhoneSettings } from '@/lib/locationCheck';
import { describeLocationStatus } from '@/lib/tripPlanning';
import { useBackToClose } from '@/hooks/useBackToClose';
import { usePhoneLocation } from '@/hooks/usePhoneLocation';
import { LocationCheck } from '@/components/mobile/LocationCheck';
import { Trip } from '@/lib/types';

const ACTION_WORDS = { settings: 'Open settings', ask: 'Allow location', check: 'Check my location' } as const;

/**
 * The line on a trip that says whether the traveller's location is reaching
 * their contacts and, when it is not, why and what to do about it.
 *
 * @param sendsHere False when another phone sends this trip's positions, so
 *   this phone's own settings are beside the point.
 */
export function TripLocationLine({ trip, nowMs, sendsHere, className = '', iconClassName = 'w-5 h-5' }: {
  trip: Trip;
  nowMs: number;
  sendsHere: boolean;
  className?: string;
  iconClassName?: string;
}) {
  const status = describeLocationStatus(trip.lastUpdate?.toMillis() ?? null, !!trip.lastLocation, nowMs);
  const { phone, recheck } = usePhoneLocation(sendsHere);
  const advice = adviseOnLocation(status, phone, Capacitor.isNativePlatform());
  const [checking, setChecking] = useState(false);
  useBackToClose(checking, () => setChecking(false));

  const Icon = advice.tone === 'fine' ? MapPin : MapPinOff;
  const act = () => {
    if (advice.action === 'settings') void openPhoneSettings();
    else if (advice.action === 'ask') void askForLocation().then(recheck);
    else setChecking(true);
  };

  return (
    <div
      className={`flex items-start gap-3 text-sm ${
        advice.tone === 'fine' ? 'text-slate-600 dark:text-slate-300' : 'text-amber-800 dark:text-amber-300 font-medium'
      } ${className}`}
    >
      <Icon
        className={`${iconClassName} flex-shrink-0 ${advice.tone === 'fine' ? 'text-brand-600 dark:text-brand-300' : ''}`}
        aria-hidden="true"
      />
      <div className="min-w-0">
        <p role={advice.tone === 'problem' ? 'status' : undefined}>{advice.text}</p>
        {advice.action && (
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={act}
              className="px-3 py-1.5 rounded-xl bg-amber-100 text-amber-900 font-semibold hover:bg-amber-200"
            >
              {ACTION_WORDS[advice.action]}
            </button>
            {advice.action !== 'check' && (
              <button
                type="button"
                onClick={() => setChecking(true)}
                className="px-3 py-1.5 rounded-xl text-blue-700 dark:text-blue-300 font-semibold hover:underline"
              >
                Check my location
              </button>
            )}
          </div>
        )}
      </div>
      {checking && <LocationCheck tripStatus={status.text} onClose={() => { setChecking(false); recheck(); }} />}
    </div>
  );
}
