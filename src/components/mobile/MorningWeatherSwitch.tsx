'use client';

/**
 * Settings: the morning weather notification (functions/src/morningWeather.ts),
 * on unless switched off. Switching it off also has the server forget the
 * rough area it keeps for it.
 */

import { useEffect, useState } from 'react';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { CloudSun } from 'lucide-react';
import { db } from '@/lib/firebase';

export function MorningWeatherSwitch({ uid }: { uid: string }) {
  const [on, setOn] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => onSnapshot(
    doc(db, 'users', uid),
    (snap) => setOn(snap.get('morningWeather') !== false),
    () => setOn(null)
  ), [uid]);

  const toggle = async () => {
    if (on === null) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', uid), { morningWeather: !on });
    } catch (error) {
      console.warn('Could not change the morning weather setting:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 p-4 bg-slate-50 rounded-xl">
      <div className="flex items-start gap-3">
        <CloudSun className="w-5 h-5 text-slate-600 mt-0.5 flex-shrink-0" aria-hidden="true" />
        <div>
          <span className="font-medium text-slate-900 block">Morning weather</span>
          <span className="text-xs text-slate-500">
            A notification at 6:30 am on days with rain, storms, fog or great heat where you are.
          </span>
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on === true}
        aria-label="Morning weather"
        onClick={() => void toggle()}
        disabled={on === null || saving}
        className={`flex-shrink-0 w-12 h-7 rounded-full transition-colors disabled:opacity-50 ${on ? 'bg-blue-600' : 'bg-slate-300'}`}
      >
        <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${on ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  );
}
