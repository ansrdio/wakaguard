/**
 * @fileoverview Where the trip length on the start form came from
 *
 * When a place is chosen and the road time to it is known, the length is set
 * from it, so nobody has to guess (a tester, 17 November 2026: "we just input
 * where we are headed to and it brings it"). A length the person picked
 * themselves is never changed.
 *
 * @module tripLength
 */

/** default: nobody has chosen yet; route: set from the road time; chosen: picked by the person */
export type LengthSource = 'default' | 'route' | 'chosen';

/**
 * What the trip length should become when the road time changes, or null to
 * leave it as it is.
 *
 * @param routeMinutes the length suggested from the road time (with its
 *   traffic margin), or null when there is no route that can be trusted
 */
export function lengthForRoute(
  routeMinutes: number | null,
  source: LengthSource,
  currentMinutes: number,
  defaultMinutes: number,
): { minutes: number; source: LengthSource } | null {
  if (source === 'chosen') return null;
  if (routeMinutes !== null) {
    if (source === 'route' && routeMinutes === currentMinutes) return null;
    return { minutes: routeMinutes, source: 'route' };
  }
  // The place was cleared or its route cannot be trusted: back to the usual length
  if (source === 'route') return { minutes: defaultMinutes, source: 'default' };
  return null;
}
