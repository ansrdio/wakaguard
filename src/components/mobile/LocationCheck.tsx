'use client';

import { useCallback, useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Check, Loader2, Minus, RefreshCw, Settings, X } from 'lucide-react';
import { askForLocation, FixResult, openPhoneSettings, readPhoneLocation, PhoneLocation, tryForPosition } from '@/lib/locationCheck';
import { versionLabel } from '@/lib/appVersion';

const PERMISSION_WORDS: Record<PhoneLocation['permission'], { text: string; good: boolean | null }> = {
  granted: { text: 'Allowed', good: true },
  approximate: { text: 'Allowed, but only roughly', good: false },
  denied: { text: 'Not allowed', good: false },
  ask: { text: 'Not asked yet', good: false },
  unknown: { text: 'Could not be read', good: null },
};

function describeFix(result: FixResult | null): { text: string; good: boolean | null } {
  if (!result) return { text: 'Looking…', good: null };
  if (!result.found) return { text: result.seconds < 1 ? 'Not found' : `Not found after ${result.seconds} seconds`, good: false };
  const within = result.accuracy != null ? `, to within ${result.accuracy.toLocaleString()} m` : '';
  return { text: `Found in ${result.seconds} seconds${within}`, good: true };
}

function Row({ label, value, good, waiting = false }: { label: string; value: string; good: boolean | null; waiting?: boolean }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-slate-100 last:border-b-0">
      <span
        className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
          good === true ? 'bg-brand-100 text-brand-700' : good === false ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-500'
        }`}
        aria-hidden="true"
      >
        {good === true ? <Check className="w-3.5 h-3.5" /> : good === false ? <X className="w-3.5 h-3.5" /> : waiting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Minus className="w-3.5 h-3.5" />}
      </span>
      <div className="min-w-0">
        <p className="text-sm text-slate-600">{label}</p>
        <p className="font-semibold text-slate-900">{value}</p>
      </div>
    </div>
  );
}

/**
 * What this phone says about finding itself: the location switch, the
 * permission, and one try at a precise and a rough position. It shows how the
 * tries went and never where the phone is, so a tester can send a screenshot.
 */
export function LocationCheck({ tripStatus, onClose }: { tripStatus?: string; onClose: () => void }) {
  const inPhoneApp = Capacitor.isNativePlatform();
  const [phone, setPhone] = useState<PhoneLocation | null>(null);
  const [precise, setPrecise] = useState<FixResult | null>(null);
  const [rough, setRough] = useState<FixResult | null>(null);
  const [run, setRun] = useState(0);

  useEffect(() => {
    let current = true;
    void readPhoneLocation().then((state) => current && setPhone(state));
    void tryForPosition(true).then((result) => current && setPrecise(result));
    void tryForPosition(false).then((result) => current && setRough(result));
    return () => {
      current = false;
    };
  }, [run]);

  const checkAgain = useCallback(() => {
    setPhone(null);
    setPrecise(null);
    setRough(null);
    setRun((count) => count + 1);
  }, []);

  const switchWords = phone == null
    ? { text: 'Checking…', good: null }
    : phone.switchedOn === false
      ? { text: 'Switched off', good: false }
      : phone.switchedOn === true
        ? { text: 'On', good: true }
        : { text: 'Cannot be told from a browser', good: null };
  const permissionWords = phone ? PERMISSION_WORDS[phone.permission] : { text: 'Checking…', good: null };
  const preciseWords = describeFix(precise);
  const roughWords = describeFix(rough);
  const busy = !phone || !precise || !rough;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50" role="dialog" aria-modal="true" aria-labelledby="location-check-title">
      <div className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 id="location-check-title" className="text-xl font-bold text-slate-900">Check my location</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="p-2 text-slate-600 hover:bg-slate-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-2">
          <Row label="Location on this phone" value={switchWords.text} good={switchWords.good} waiting={!phone} />
          <Row label={inPhoneApp ? 'WakaGuard allowed to use it' : 'This browser allowed to use it'} value={permissionWords.text} good={permissionWords.good} waiting={!phone} />
          <Row label="Exact position" value={preciseWords.text} good={preciseWords.good} waiting={!precise} />
          <Row label="Rough position" value={roughWords.text} good={roughWords.good} waiting={!rough} />
          {tripStatus && <Row label="This trip" value={tripStatus} good={null} />}
        </div>

        <div className="mt-4 space-y-2">
          {phone?.permission === 'ask' && (
            <button
              type="button"
              onClick={() => void askForLocation().then(checkAgain)}
              className="w-full py-3 bg-brand-600 text-white rounded-2xl font-bold hover:bg-brand-700"
            >
              Allow location
            </button>
          )}
          {inPhoneApp && phone && (phone.permission === 'denied' || phone.permission === 'approximate') && (
            <button
              type="button"
              onClick={() => void openPhoneSettings()}
              className="w-full py-3 bg-brand-600 text-white rounded-2xl font-bold hover:bg-brand-700 flex items-center justify-center gap-2"
            >
              <Settings className="w-5 h-5" aria-hidden="true" />
              Open settings
            </button>
          )}
          <button
            type="button"
            onClick={checkAgain}
            disabled={busy}
            className="w-full py-3 bg-blue-50 text-blue-800 rounded-2xl font-semibold hover:bg-blue-100 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            <RefreshCw className={`w-5 h-5 ${busy ? 'animate-spin' : ''}`} aria-hidden="true" />
            {busy ? 'Checking…' : 'Check again'}
          </button>
        </div>

        <p className="mt-4 text-sm text-slate-600">
          This shows whether your phone can be found, never where you are. If location is not working, send us a
          screenshot of this screen.
        </p>
        <p className="mt-2 text-xs text-slate-500">
          {versionLabel(inPhoneApp)} · {inPhoneApp ? (Capacitor.getPlatform() === 'ios' ? 'iPhone app' : 'Android app') : 'Website'}
        </p>
      </div>
    </div>
  );
}
