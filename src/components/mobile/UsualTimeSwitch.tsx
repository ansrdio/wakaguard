'use client';

/**
 * Settings: the reminder at the person's usual travel times
 * (functions/src/usualTimes.ts, build 27), on unless switched off. Its own
 * switch, so nobody turns off every notification (and the trip reminders with
 * them) to stop it.
 */

import { useEffect, useState } from 'react';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { AlarmClock } from 'lucide-react';
import { db } from '@/lib/firebase';

export function UsualTimeSwitch({ uid }: { uid: string }) {
  const [on, setOn] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => onSnapshot(
    doc(db, 'users', uid),
    (snap) => setOn(snap.get('usualTimeReminder') !== false),
    () => setOn(null)
  ), [uid]);

  const toggle = async () => {
    if (on === null) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', uid), { usualTimeReminder: !on });
    } catch (error) {
      console.warn('Could not change the usual time reminder:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 p-4 bg-slate-50 rounded-xl">
      <div className="flex items-start gap-3">
        <AlarmClock className="w-5 h-5 text-slate-600 mt-0.5 flex-shrink-0" aria-hidden="true" />
        <div>
          <span className="font-medium text-slate-900 block">Reminder at my usual times</span>
          <span className="text-xs text-slate-500">
            &quot;Heading out?&quot; shortly before the time you usually set off, if no trip is running. Once a day at most.
          </span>
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on === true}
        aria-label="Reminder at my usual times"
        onClick={() => void toggle()}
        disabled={on === null || saving}
        className={`flex-shrink-0 w-12 h-7 rounded-full transition-colors disabled:opacity-50 ${on ? 'bg-blue-600' : 'bg-slate-300'}`}
      >
        <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${on ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  );
}
