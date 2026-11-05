'use client';

/**
 * A first trip on day one (build 27; lib/firstTrip.ts): straight after
 * sign-up, add one contact, then try a 2-minute test trip. Each step can be
 * skipped; skipping the test closes the guide for good.
 */

import { createPortal } from 'react-dom';
import { Loader2, UserPlus } from 'lucide-react';
import { useBackToClose } from '@/hooks/useBackToClose';
import { FirstTripStep, testTripOutcome } from '@/lib/firstTrip';
import { TEST_TRIP_MINUTES } from '@/lib/tripPlanning';

const input = 'w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl text-base text-slate-900 dark:text-white bg-white dark:bg-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-500 focus:border-brand-500';
const primary = 'w-full py-3.5 rounded-2xl font-bold bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50 flex items-center justify-center gap-2';
const quiet = 'w-full py-3 rounded-2xl font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50';

export function FirstTripGuide({
  step,
  numbered,
  processing,
  contactName,
  contactPhone,
  onContactName,
  onContactPhone,
  onPickFromPhone,
  onAddContact,
  onSkipContact,
  contactNames,
  canStart,
  onStartTest,
  onSkipTest,
}: {
  step: FirstTripStep;
  /** Both steps are shown, so they are numbered */
  numbered: boolean;
  processing: boolean;
  contactName: string;
  contactPhone: string;
  onContactName: (value: string) => void;
  onContactPhone: (value: string) => void;
  onPickFromPhone: () => void;
  onAddContact: () => void;
  onSkipContact: () => void;
  contactNames: string[];
  /** False for the moment the alert name is still loading */
  canStart: boolean;
  onStartTest: () => void;
  onSkipTest: () => void;
}) {
  // Back leaves the guide as "Not now" does
  useBackToClose(true, step === 'contact' ? onSkipContact : onSkipTest);

  return createPortal(
    <div className="fixed inset-0 z-[10001] flex items-end sm:items-center justify-center bg-black/50" role="dialog" aria-modal="true" aria-labelledby="first-trip-title">
      <div className="bg-white dark:bg-slate-800 rounded-t-3xl sm:rounded-3xl w-full max-w-md p-6 space-y-4 max-h-[92vh] overflow-y-auto">
        {numbered && (
          <p className="text-sm font-semibold text-brand-700 dark:text-brand-300">Step {step === 'contact' ? 1 : 2} of 2</p>
        )}

        {step === 'contact' ? (
          <>
            <h2 id="first-trip-title" className="text-2xl font-bold text-slate-900 dark:text-white">
              Who should know you got there safe?
            </h2>
            <p className="text-base text-slate-600 dark:text-slate-300">
              Add one person. If you don&apos;t arrive on time, WakaGuard texts them where your phone was last.
            </p>
            <button type="button" onClick={onPickFromPhone} disabled={processing} className={primary}>
              <UserPlus className="w-5 h-5" aria-hidden="true" />
              Pick from my contacts
            </button>
            <div className="flex items-center gap-2" aria-hidden="true">
              <div className="flex-1 border-t border-slate-200 dark:border-slate-700" />
              <span className="text-sm text-slate-500 dark:text-slate-400">or type them in</span>
              <div className="flex-1 border-t border-slate-200 dark:border-slate-700" />
            </div>
            <label className="block">
              <span className="block text-sm font-semibold text-slate-800 dark:text-slate-100 mb-1.5">Their name</span>
              <input type="text" value={contactName} onChange={(e) => onContactName(e.target.value)} autoComplete="off" className={input} />
            </label>
            <label className="block">
              <span className="block text-sm font-semibold text-slate-800 dark:text-slate-100 mb-1.5">Their phone number</span>
              <input type="tel" value={contactPhone} onChange={(e) => onContactPhone(e.target.value)} autoComplete="off" className={input} />
            </label>
            <button
              type="button"
              onClick={onAddContact}
              disabled={processing || !contactName.trim() || !contactPhone.trim()}
              className={primary}
            >
              {processing && <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />}
              Add and continue
            </button>
            <button type="button" onClick={onSkipContact} disabled={processing} className={quiet}>
              Skip for now
            </button>
          </>
        ) : (
          <>
            <h2 id="first-trip-title" className="text-2xl font-bold text-slate-900 dark:text-white">
              Try it: a {TEST_TRIP_MINUTES}-minute test trip
            </h2>
            <p className="text-base text-slate-600 dark:text-slate-300">
              Nothing real happens. In {TEST_TRIP_MINUTES} minutes WakaGuard asks if you&apos;re okay. Tap
              &quot;I&apos;ve arrived&quot; to end it. {testTripOutcome(contactNames)}
            </p>
            <button type="button" onClick={onStartTest} disabled={processing || !canStart} className={primary}>
              {processing && <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />}
              Start the test trip
            </button>
            <button type="button" onClick={onSkipTest} disabled={processing} className={quiet}>
              Not now
            </button>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}

/** Shown on the trip screen while the guide's test trip runs */
export function FirstTripNote({ onDone }: { onDone: () => void }) {
  return (
    <div className="rounded-3xl bg-brand-50 dark:bg-brand-900/40 border border-brand-200 dark:border-brand-800 p-4 space-y-2" role="status">
      <p className="text-base font-bold text-slate-900 dark:text-white">That&apos;s how it works</p>
      <p className="text-sm text-slate-700 dark:text-slate-200">
        Every trip runs like this one. When your time is up, WakaGuard asks if you&apos;re okay, and texts your
        contacts only if you don&apos;t answer. Tap &quot;I&apos;ve arrived&quot; when you get there.
      </p>
      <button type="button" onClick={onDone} className="text-sm font-semibold text-brand-700 dark:text-brand-300 underline underline-offset-2">
        Got it
      </button>
    </div>
  );
}
