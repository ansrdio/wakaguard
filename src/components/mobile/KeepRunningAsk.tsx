'use client';

import { useState } from 'react';
import { BatteryCharging } from 'lucide-react';
import { askToKeepRunning, rememberAsked } from '@/lib/keepRunningPermission';
import { BOTTOM_NAV_HEIGHT } from '@/lib/mobileLayout';

/**
 * Once, after the first trip on an Android phone starts: why WakaGuard must
 * keep running, then Android's own question (lib/keepRunningPermission.ts).
 * Asked after the trip has started, never before it, so the trip is not held
 * up and the reason is plain.
 */
export function KeepRunningAsk({ onDone }: { onDone: () => void }) {
  const [asking, setAsking] = useState(false);

  const finish = () => {
    rememberAsked();
    onDone();
  };

  const allow = async () => {
    setAsking(true);
    await askToKeepRunning();
    finish();
  };

  return (
    <div className="fixed inset-0 z-[65] flex items-end sm:items-center justify-center bg-black/50" role="dialog" aria-modal="true" aria-labelledby="keep-running-ask-title">
      <div
        className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-t-3xl sm:rounded-2xl p-6"
        style={{ paddingBottom: `calc(1.5rem + ${BOTTOM_NAV_HEIGHT})` }}
      >
        <BatteryCharging className="w-8 h-8 text-brand-700 dark:text-brand-300" aria-hidden="true" />
        <h2 id="keep-running-ask-title" className="mt-3 text-xl font-bold text-slate-900 dark:text-white">Keep your trip running</h2>
        <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">
          To save battery, many phones close apps you are not looking at. That would stop your location reaching
          your contacts. Your phone will now ask whether WakaGuard may run in the background. Please choose Allow.
        </p>
        <button
          type="button"
          disabled={asking}
          onClick={() => void allow()}
          className="mt-5 w-full py-3 bg-brand-600 text-white rounded-2xl font-bold hover:bg-brand-700 disabled:opacity-60"
        >
          Continue
        </button>
        <button
          type="button"
          disabled={asking}
          onClick={finish}
          className="mt-2 w-full py-3 text-slate-600 dark:text-slate-300 rounded-2xl font-semibold hover:bg-slate-100 dark:hover:bg-slate-700"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
