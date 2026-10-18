'use client';

/**
 * "More time…": any amount of extra time, in hours and minutes, for when
 * none of the trip card's buttons fits. Opened from the card's "Other amount"
 * and from the "More time…" button on a trip reminder.
 */

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useBackToClose } from '@/hooks/useBackToClose';
import { EXTRA_TIME_STEP, formatClock, formatDuration, MAX_EXTRA_MINUTES, readExtraMinutes } from '@/lib/tripPlanning';

const HOURS = Array.from({ length: MAX_EXTRA_MINUTES / 60 + 1 }, (_, h) => h);
const MINUTES = Array.from({ length: 60 / EXTRA_TIME_STEP }, (_, step) => step * EXTRA_TIME_STEP);

const selectClass =
  'w-full px-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500';

export function AddTimeSheet({
  endsAtMs,
  processing,
  onAdd,
  onClose,
}: {
  /** The trip's arrival time now, if it has one */
  endsAtMs: number | null;
  processing: boolean;
  onAdd: (minutes: number) => void;
  onClose: () => void;
}) {
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(20);
  const [nowMs, setNowMs] = useState(() => Date.now());
  useBackToClose(true, onClose);

  useEffect(() => {
    const interval = setInterval(() => setNowMs(Date.now()), 30 * 1000);
    return () => clearInterval(interval);
  }, []);

  const extra = readExtraMinutes(hours, minutes);
  // Added to the arrival time, or to now once that has passed (as extendSafeTrip does)
  const newArrivalMs = extra === null ? null : Math.max(nowMs, endsAtMs ?? 0) + extra * 60 * 1000;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" role="dialog" aria-modal="true" aria-labelledby="add-time-title">
      <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 id="add-time-title" className="text-xl font-bold text-slate-900 dark:text-white">Add more time</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="p-2 rounded-full bg-slate-100 dark:bg-slate-700">
            <X className="w-5 h-5 text-slate-700 dark:text-slate-200" aria-hidden="true" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="extra-hours">Hours</label>
          <select id="extra-hours" value={hours} onChange={(e) => setHours(Number(e.target.value))} className={selectClass}>
            {HOURS.map((h) => <option key={h} value={h}>{h} h</option>)}
          </select>
          <label className="sr-only" htmlFor="extra-minutes">Minutes</label>
          <select id="extra-minutes" value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} className={selectClass}>
            {MINUTES.map((m) => <option key={m} value={m}>{m} min</option>)}
          </select>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-300" aria-live="polite">
          {newArrivalMs === null
            ? hours * 60 + minutes > MAX_EXTRA_MINUTES
              ? `You can add up to ${formatDuration(MAX_EXTRA_MINUTES)} at a time.`
              : `Choose at least ${EXTRA_TIME_STEP} minutes.`
            : <>New arrival time: <span className="font-semibold text-slate-900 dark:text-white">{formatClock(newArrivalMs, nowMs)}</span></>}
        </p>
        <button
          type="button"
          disabled={extra === null || processing}
          onClick={() => extra !== null && onAdd(extra)}
          className="w-full py-3.5 rounded-2xl font-bold bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {extra === null ? 'Add time' : `Add ${formatDuration(extra)}`}
        </button>
      </div>
    </div>
  );
}
