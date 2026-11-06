/**
 * @fileoverview Reading our server's answer about a spot (functions/src/placeName.ts),
 * apart from the call itself (lib/placeName.ts) so it can be tested on its own.
 *
 * @module placeNameRead
 */

/** The state Google gives for a spot, as it names it ("Lagos"), and its country ("NG"); null if none */
export function readSpotState(answer: unknown): { state: string; country: string | null } | null {
  const a = (answer && typeof answer === 'object' ? answer : null) as { state?: unknown; country?: unknown } | null;
  const state = typeof a?.state === 'string' ? a.state.trim() : '';
  if (state.length < 2) return null;
  return { state, country: typeof a?.country === 'string' ? a.country : null };
}
