/**
 * What a backup "I've arrived" or "add time" does to a trip (tripAction.ts).
 *
 * The app saves both through the database as before. When that save has not
 * reached the server in a few seconds, it also posts here by the native route
 * the positions take. Either may land first, or both: ending a trip that has
 * ended changes nothing, and extra time carries the id of the press, so the
 * same press is never added twice.
 *
 * No Firebase calls here (functions/test/tripAction.test.ts).
 */

export const MAX_EXTEND_MINUTES = 12 * 60;
const REQUEST_ID = /^[A-Za-z0-9_-]{8,64}$/;
const HOUR_MS = 60 * 60 * 1000;

export type TripActionRequest =
  | { action: 'end' }
  | { action: 'extend'; minutes: number; requestId: string };

export interface TripState {
  status?: unknown;
  startMs?: number | null;
  endsAtMs?: number | null;
  expiresAtMs?: number | null;
  lastExtendRequestId?: unknown;
}

export type TripActionPlan =
  | { kind: 'end' }
  | { kind: 'extend'; endsAtMs: number; expiresAtMs: number; minutes: number; requestId: string }
  | { kind: 'already' }
  | { kind: 'ended' };

/** The request's action, checked. Null for anything else. */
export function readTripAction(body: Record<string, unknown>): TripActionRequest | null {
  if (body.action === 'end') return { action: 'end' };
  if (body.action !== 'extend') return null;
  const { minutes, requestId } = body;
  if (typeof minutes !== 'number' || !Number.isInteger(minutes) || minutes < 1 || minutes > MAX_EXTEND_MINUTES) return null;
  if (typeof requestId !== 'string' || !REQUEST_ID.test(requestId)) return null;
  return { action: 'extend', minutes, requestId };
}

/** How long a trip's link stays readable; the same rule as the app's tripExpiryMs (src/lib/tripPlanning.ts) */
export function expiryFor(startMs: number, endsAtMs: number): number {
  return Math.max(startMs + 24 * HOUR_MS, endsAtMs + 12 * HOUR_MS);
}

export function planTripAction(trip: TripState, request: TripActionRequest, nowMs: number): TripActionPlan {
  const running = trip.status === 'active' || trip.status === 'emergency';
  if (request.action === 'end') return running ? { kind: 'end' } : { kind: 'already' };

  if (trip.lastExtendRequestId === request.requestId) return { kind: 'already' };
  if (!running) return { kind: 'ended' };
  // As the app does: from now if the time has passed, otherwise from the arrival time
  const baseMs = Math.max(nowMs, trip.endsAtMs ?? 0);
  const endsAtMs = baseMs + request.minutes * 60 * 1000;
  const expiresAtMs = Math.max(trip.expiresAtMs ?? 0, expiryFor(trip.startMs ?? nowMs, endsAtMs));
  return { kind: 'extend', endsAtMs, expiresAtMs, minutes: request.minutes, requestId: request.requestId };
}
