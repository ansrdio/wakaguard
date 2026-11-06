'use client';

/**
 * Google's place suggestions under "Where are you going?" (lib/placeSearch.ts).
 * Asks after a short pause in typing, shows at most five, and says "Google
 * Maps" under them, as Google's attribution rules ask. Choosing one looks up
 * its spot; the form then fills in the name and moves the pin there.
 */

import { useEffect, useRef, useState } from 'react';
import { Loader2, MapPin } from 'lucide-react';
import {
  findPlace, FoundPlace, newSearchSession, PLACE_SEARCH_CREDIT, PlaceSuggestion, searchable, SEARCH_PAUSE_MS,
  suggestPlaces,
} from '@/lib/placeSearch';

export function PlaceSuggestions({ text, near, onChoose }: {
  /** What is in the box now; nothing is asked for while it is the name already chosen */
  text: string | null;
  /** Where to look first: the middle of the traveller's chosen state */
  near: { lat: number; lng: number } | null;
  onChoose: (place: FoundPlace) => void;
}) {
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [looking, setLooking] = useState<string | null>(null);
  const [failedFor, setFailedFor] = useState<string | null>(null);
  // The words being asked about, while no answer has come back: the first
  // search after a quiet spell can take several seconds while our server
  // wakes up (the owner's Moto test, 6 November 2026), so it says so
  const [pendingFor, setPendingFor] = useState<string | null>(null);
  // One Google session from the first letter to the place chosen
  const session = useRef<string>(newSearchSession());
  // Only the latest answer counts
  const askedFor = useRef<string>('');

  const wanted = text !== null && searchable(text) ? text.trim() : '';
  useEffect(() => {
    askedFor.current = wanted;
    if (!wanted) {
      setPendingFor(null);
      return;
    }
    const timer = window.setTimeout(() => {
      setPendingFor(wanted);
      void suggestPlaces(wanted, session.current, near).then((found) => {
        if (askedFor.current !== wanted) return;
        setSuggestions(found);
        setPendingFor(null);
      });
    }, SEARCH_PAUSE_MS);
    return () => window.clearTimeout(timer);
    // near is the state's middle, which only changes with the state; the words are what matter
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wanted]);

  const choose = async (suggestion: PlaceSuggestion) => {
    setLooking(suggestion.placeId);
    setFailedFor(null);
    const place = await findPlace(suggestion, session.current);
    setLooking(null);
    if (!place) {
      setFailedFor(suggestion.placeId);
      return;
    }
    session.current = newSearchSession();
    setSuggestions([]);
    onChoose(place);
  };

  if (!wanted) return null;
  // Still waiting, with nothing yet from earlier letters to show
  if (suggestions.length === 0) {
    if (pendingFor !== wanted) return null;
    return (
      <p role="status" className="mt-2 flex items-center gap-2 px-1 text-sm text-slate-600 dark:text-slate-300">
        <Loader2 className="w-4 h-4 flex-shrink-0 text-brand-700 dark:text-brand-300 animate-spin" aria-hidden="true" />
        Looking for places…
      </p>
    );
  }
  return (
    <div className="mt-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
      <ul aria-label="Places that match">
        {suggestions.map((s) => (
          <li key={s.placeId} className="border-b last:border-b-0 border-slate-100 dark:border-slate-700">
            <button
              type="button"
              onClick={() => void choose(s)}
              disabled={looking !== null}
              className="w-full min-h-12 px-3 py-2.5 flex items-start gap-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-60"
            >
              {looking === s.placeId ? (
                <Loader2 className="w-4 h-4 mt-0.5 flex-shrink-0 text-brand-700 animate-spin" aria-hidden="true" />
              ) : (
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-slate-400" aria-hidden="true" />
              )}
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-slate-900 dark:text-white truncate">{s.name}</span>
                {s.detail && <span className="block text-xs text-slate-500 dark:text-slate-400 truncate">{s.detail}</span>}
                {failedFor === s.placeId && (
                  <span role="alert" className="block text-xs text-red-700 dark:text-red-300">
                    Could not find that place just now. Try again, or set it on the map.
                  </span>
                )}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {/* Google's attribution for its content shown without a Google map: the words "Google Maps" */}
      <p className="px-3 py-1.5 text-right text-xs text-[#5E5E5E] dark:text-slate-300" style={{ fontFamily: 'Roboto, system-ui, sans-serif' }}>
        {PLACE_SEARCH_CREDIT}
      </p>
    </div>
  );
}
