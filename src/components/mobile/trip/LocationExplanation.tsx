'use client';

import { Bell, MapPin, StopCircle, Users } from 'lucide-react';

const POINTS = [
  {
    icon: MapPin,
    text: 'While a trip is running, WakaGuard collects your location and sends it to our server, even when the app is closed or your screen is off.',
  },
  {
    icon: Users,
    text: 'It is used to show the people you chose where you last were if you do not arrive, and anyone you send the trip link to.',
  },
  {
    icon: Bell,
    text: 'Your phone shows a "Safe Trip active" notification for as long as your location is being shared.',
  },
  {
    icon: StopCircle,
    text: 'Sharing stops when you end the trip. Your location is not collected between trips.',
  },
] as const;

/**
 * Says how a trip uses the phone's location, before the first trip and before
 * the phone's own permission question. The trip starts only on "Continue".
 */
export function LocationExplanation({ onContinue, onCancel }: { onContinue: () => void; onCancel: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[60] bg-white overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="location-explanation-title"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="min-h-full max-w-sm mx-auto flex flex-col p-6">
        <span className="w-14 h-14 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center" aria-hidden="true">
          <MapPin className="w-7 h-7" />
        </span>
        <h2 id="location-explanation-title" className="mt-4 text-2xl font-bold text-slate-900">
          WakaGuard shares your location during a trip
        </h2>

        <ul className="mt-5 space-y-4">
          {POINTS.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-start gap-3">
              <Icon className="w-5 h-5 mt-0.5 text-brand-700 flex-shrink-0" aria-hidden="true" />
              <span className="text-slate-700">{text}</span>
            </li>
          ))}
        </ul>

        <p className="mt-5 text-sm text-slate-600">
          Next, your phone will ask you to allow location. More in our{' '}
          <a href="/privacy" className="font-semibold text-blue-700 underline">Privacy Policy</a>.
        </p>

        <div className="mt-auto pt-6 space-y-2">
          <button
            type="button"
            onClick={onContinue}
            className="w-full py-3.5 bg-brand-600 text-white rounded-2xl font-bold hover:bg-brand-700"
          >
            Continue
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="w-full py-3 text-slate-700 font-semibold hover:text-slate-900"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
