/**
 * @fileoverview Waiting on Firestore writes without freezing the screen
 *
 * Firestore keeps a write queued while there is no connection, and its
 * promise only settles once the server has it. Awaiting that promise directly
 * leaves a spinner on screen for as long as the phone has no signal.
 *
 * A write can also sit in the queue with signal. On 14 October 2026 a
 * tester's "I've arrived" on an iPhone reached the server 17 minutes after it
 * was pressed: the trip had ended on the phone, positions had stopped, and the
 * server, not knowing, warned and then marked the trip overdue. So a save that
 * has not arrived in a few seconds restarts the connection and waits again.
 *
 * @module firestoreWrites
 */

import { errorText, isLocalStoreFailure, restartPage } from './localStore';
import { settleWithin } from './timeLimit';

/** How long a save waits for the server before the connection is restarted */
export const SAVE_WAIT_MS = 5000;

/** How long it waits again after the restart, before the screen moves on */
export const SAVE_RETRY_WAIT_MS = 7000;

/** Longest the restart itself may take */
export const RESTART_LIMIT_MS = 3000;

let restartConnection: () => Promise<void> = async () => {};

/** Set once by firebase.ts: how to restart the connection when a save is stuck */
export function setConnectionRestart(restart: () => Promise<void>): void {
  restartConnection = restart;
}

/** Restart the connection now, for a save the person is waiting on */
export function retryStuckSaves(): Promise<void> {
  return settleWithin(restartConnection(), RESTART_LIMIT_MS, undefined);
}

/**
 * Wait a limited time for a write to reach the server, restarting the
 * connection once if it has not arrived.
 * Resolves true if the server has it, false if it is still queued (it will be
 * sent when the connection returns). Rejects if the server refuses the write.
 *
 * A save that matters enough can bring a backup: another way to give the
 * server the same change (for "I've arrived" and extra time, tripActionBackup.ts).
 * It is tried together with the restart, and its success counts as arrival.
 */
export async function reachedServer(
  write: Promise<unknown>,
  waitMs: number = SAVE_WAIT_MS,
  retryWaitMs: number = SAVE_RETRY_WAIT_MS,
  backup?: () => Promise<boolean>
): Promise<boolean> {
  const sent = write.then(() => true);
  const arrivesWithin = (ms: number) =>
    Promise.race([sent, new Promise<boolean>((resolve) => setTimeout(() => resolve(false), ms))]);
  if (await arrivesWithin(waitMs)) return true;
  const [, backedUp] = await Promise.all([
    retryStuckSaves(),
    backup ? settleWithin(backup(), retryWaitMs, false) : Promise.resolve(false),
  ]);
  if (backedUp) return true;
  return arrivesWithin(retryWaitMs);
}

/**
 * A failed save, as a message for the person and a line for the log.
 * The short code in brackets (for example "unavailable") is what tells one
 * cause from another when someone sends a screenshot.
 *
 * A save that failed because the on-phone database has stopped working is
 * followed by loading the page again, after which saving works.
 */
export function describeFailedSave(what: string, error: unknown): string {
  console.error(`${what}: ${errorText(error)}`);
  if (isLocalStoreFailure(error)) {
    restartPage(`${what.toLowerCase()} because the data kept on the phone stopped answering`);
    return `${what}. Please try again.`;
  }
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === 'string' ? `${what} (${code.replace(/^firestore\//, '')})` : what;
}
