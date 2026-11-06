/**
 * @fileoverview The name of a spot, and its state, asked of our server
 *
 * The server asks Google's address look-up (functions/src/placeName.ts; it was
 * OpenStreetMap until build 27), so Google is sent the spot and never who
 * asked. Null whenever no answer can be had: the box is then left for the
 * traveller to fill, and the state for them to choose.
 *
 * @module placeName
 */

import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebaseFunctions';
import { Point, readPlaceName } from '@/lib/destinationPoint';
import { readSpotState } from '@/lib/placeNameRead';

/** Which state a spot is in, for "Use my location" when choosing a state */
export async function askSpotState(point: Point): Promise<{ state: string; country: string | null } | null> {
  try {
    const answer = await httpsCallable(functions, 'placeName', { timeout: 12000 })({ lat: point.lat, lng: point.lng });
    return readSpotState(answer.data);
  } catch {
    return null;
  }
}

export async function askPlaceName(point: Point): Promise<string | null> {
  try {
    const answer = await httpsCallable(functions, 'placeName', { timeout: 12000 })({ lat: point.lat, lng: point.lng });
    return readPlaceName(answer.data);
  } catch {
    return null;
  }
}
