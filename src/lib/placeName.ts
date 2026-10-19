/**
 * @fileoverview The name of a destination pin, asked of our server
 *
 * The server asks OpenStreetMap's look-up service (functions/src/placeName.ts),
 * so OpenStreetMap is sent the spot and never who asked. Null whenever no name
 * can be had: the box is then left for the traveller to fill.
 *
 * @module placeName
 */

import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebaseFunctions';
import { Point, readPlaceName } from '@/lib/destinationPoint';

export async function askPlaceName(point: Point): Promise<string | null> {
  try {
    const answer = await httpsCallable(functions, 'placeName', { timeout: 12000 })({ lat: point.lat, lng: point.lng });
    return readPlaceName(answer.data);
  } catch {
    return null;
  }
}
