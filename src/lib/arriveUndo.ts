/**
 * @fileoverview A few seconds to take back "I've arrived"
 *
 * A tester ended a trip by mistake when he meant to add time (lordelijah,
 * problem report of 16 October 2026): "I've arrived" sits right above the
 * add-time buttons and ended the trip at one tap. An ended trip is not
 * watched, so a mistaken tap can leave someone unwatched for the rest of the
 * journey. The trip card now waits this long, with an Undo, before ending.
 *
 * The wait must never leave a trip running that the traveller meant to end:
 * if the app is put away or the phone locked during it, the trip ends at
 * once (SafetyScreen.tsx). The "I've arrived" button on a reminder ends at
 * once too: that press already takes opening the notification and unlocking.
 *
 * @module arriveUndo
 */

export const ARRIVE_UNDO_MS = 5000;

/** Whole seconds left to undo, counting down 5, 4, 3, 2, 1 */
export function undoSecondsLeft(startedMs: number, nowMs: number, waitMs = ARRIVE_UNDO_MS): number {
  return Math.max(0, Math.ceil((startedMs + waitMs - nowMs) / 1000));
}
