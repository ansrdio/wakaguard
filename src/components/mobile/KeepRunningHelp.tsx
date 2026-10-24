'use client';

import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Check, Settings, X } from 'lucide-react';
import { keepRunningHelp } from '@/lib/keepRunning';
import { askToKeepRunning, keepRunningAllowed } from '@/lib/keepRunningPermission';
import { openPhoneSettings } from '@/lib/locationCheck';
import { BOTTOM_NAV_HEIGHT } from '@/lib/mobileLayout';

/**
 * How to stop a phone closing WakaGuard during a trip. Opened from Profile and
 * from "Check my location", which is where someone whose trip went quiet ends up.
 */
export function KeepRunningHelp({ onClose }: { onClose: () => void }) {
  const help = keepRunningHelp(Capacitor.getPlatform());
  // From build 25 on Android, the first step is one question Android asks itself;
  // null on an iPhone, the website and older builds, which keep the steps alone
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [asking, setAsking] = useState(false);
  useEffect(() => {
    let live = true;
    void keepRunningAllowed().then((answer) => { if (live) setAllowed(answer); });
    return () => { live = false; };
  }, []);

  const ask = async () => {
    setAsking(true);
    setAllowed(await askToKeepRunning());
    setAsking(false);
  };

  return (
    <div className="fixed inset-0 z-[65] flex items-end sm:items-center justify-center bg-black/50" role="dialog" aria-modal="true" aria-labelledby="keep-running-title">
      {/* The tab bar lies over the bottom of the screen, so the last lines are kept clear of it */}
      <div
        className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
        style={{ paddingBottom: `calc(1.5rem + ${BOTTOM_NAV_HEIGHT})` }}
      >
        <div className="flex items-center justify-between">
          <h2 id="keep-running-title" className="text-xl font-bold text-slate-900">Keep WakaGuard running</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="p-2 text-slate-600 hover:bg-slate-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="mt-2 text-sm text-slate-700">{help.intro}</p>

        {allowed === true && (
          <p className="mt-4 flex items-center gap-2 rounded-2xl bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-800">
            <Check className="w-5 h-5" aria-hidden="true" />
            WakaGuard may run in the background
          </p>
        )}
        {allowed === false && (
          <button
            type="button"
            disabled={asking}
            onClick={() => void ask()}
            className="mt-4 w-full py-3 bg-brand-600 text-white rounded-2xl font-bold hover:bg-brand-700 disabled:opacity-60"
          >
            Allow WakaGuard to run in the background
          </button>
        )}

        <ol className="mt-4 space-y-3">
          {help.steps.map((step, index) => (
            <li key={step.title} className="flex gap-3">
              <span className="w-7 h-7 rounded-full bg-brand-100 text-brand-800 text-sm font-bold flex items-center justify-center flex-shrink-0" aria-hidden="true">
                {index + 1}
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-slate-900">{step.title}</p>
                <p className="text-sm text-slate-600 mt-0.5">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>

        {help.offersSettings && (
          <button
            type="button"
            onClick={() => void openPhoneSettings()}
            className="mt-5 w-full py-3 bg-brand-600 text-white rounded-2xl font-bold hover:bg-brand-700 flex items-center justify-center gap-2"
          >
            <Settings className="w-5 h-5" aria-hidden="true" />
            Open WakaGuard&apos;s settings
          </button>
        )}
      </div>
    </div>
  );
}
