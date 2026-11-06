/**
 * @fileoverview Asking our server for Google's place suggestions and the spot
 * of the one chosen (functions/src/placeSearch.ts). The checks and words are in
 * lib/placeSearchRules.ts. Every failure is quiet: no suggestions, and the box
 * works as it always did.
 *
 * @module placeSearch
 */

import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebaseFunctions';
import { FoundPlace, PlaceSuggestion, readFoundPlace, readSuggestions, searchable } from '@/lib/placeSearchRules';

export * from '@/lib/placeSearchRules';

const call = () => httpsCallable(functions, 'placeSearch', { timeout: 10000 });

export async function suggestPlaces(
  text: string,
  session: string,
  near: { lat: number; lng: number } | null
): Promise<PlaceSuggestion[]> {
  if (!searchable(text)) return [];
  try {
    const answer = await call()({ kind: 'suggest', text: text.trim(), session, near });
    return readSuggestions(answer.data);
  } catch {
    return [];
  }
}

export async function findPlace(suggestion: PlaceSuggestion, session: string): Promise<FoundPlace | null> {
  try {
    const answer = await call()({ kind: 'place', placeId: suggestion.placeId, session, name: suggestion.name });
    return readFoundPlace(answer.data);
  } catch {
    return null;
  }
}
