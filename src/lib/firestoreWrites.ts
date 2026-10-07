/**
 * @fileoverview Waiting on Firestore writes without freezing the screen
 *
 * Firestore keeps a write queued while there is no connection, and its
 * promise only settles once the server has it. Awaiting that promise directly
 * leaves a spinner on screen for as long as the phone has no signal.
 *
 * @module firestoreWrites
 */

/** Longest a save waits for the server before the screen moves on */
export const SAVE_WAIT_MS = 8000;

/**
 * Wait a limited time for a write to reach the server.
 * Resolves true if the server has it, false if it is still queued (it will be
 * sent when the connection returns). Rejects if the server refuses the write.
 */
export function reachedServer(write: Promise<unknown>, waitMs: number = SAVE_WAIT_MS): Promise<boolean> {
  return Promise.race([
    write.then(() => true),
    new Promise<boolean>((resolve) => setTimeout(() => resolve(false), waitMs)),
  ]);
}
