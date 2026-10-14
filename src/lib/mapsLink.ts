/**
 * @fileoverview The link that opens the phone's maps app at a road report
 *
 * It shows the spot and asks for no route. Directions failed for a tester
 * (13 October 2026): Google Maps uses whichever way of travelling was last
 * chosen in it, and a walking or bus route is often not found in Nigeria.
 * Someone looking at a pothole wants to see where it is, not to go to it.
 *
 * No Firebase or DOM access (functions/test/mapsLink.test.ts).
 *
 * @module mapsLink
 */

/** Apple Maps on an iPhone or iPad; Google Maps everywhere else (its app on Android, its website on a computer) */
export function showInMapsUrl(lat: number, lng: number, userAgent: string): string {
  const spot = `${lat},${lng}`;
  if (/iPad|iPhone|iPod/.test(userAgent)) return `maps://maps.apple.com/?q=${spot}`;
  return `https://www.google.com/maps/search/?api=1&query=${spot}`;
}
