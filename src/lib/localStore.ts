/**
 * @fileoverview Noticing when the copy of the data kept on the phone has stopped working
 *
 * Firestore keeps a copy of the person's data in the phone's own database
 * (IndexedDB), so a trip can be seen and ended with no signal. On an iPhone
 * that database refuses work while the app is in the background. During a
 * trip the page is woken there every two minutes to send a position;
 * Firestore touches the database in that moment, meets an error it cannot
 * recover from, and from then on every read and write fails until the page
 * is loaded again. The screen keeps showing what it knew before the phone was
 * locked, and "I've arrived" fails.
 *
 * Seen on an iPhone 16 (iOS 26.5) on 8 October 2026. The line in the log,
 * 6 ms after a position was sent from the background, was:
 *   Firestore (12.8.0): INTERNAL UNHANDLED ERROR: Attempt to get a record
 *   from database without an in-progress transaction
 *
 * Loading the page again loses nothing: what was saved is in the database,
 * which works once the app is in front.
 *
 * @module localStore
 */

/** How long after one restart before another is allowed, so a fault that stays cannot loop */
export const RESTART_GAP_MS = 10 * 1000;

const RESTARTED_AT_KEY = 'wakaguard_restarted_at';

/** An error as one line of text; an error object reaches the phone's log as "{}" */
export function errorText(err: unknown): string {
  const e = err as { name?: unknown; code?: unknown; message?: unknown } | null;
  return [e?.name, e?.code, e?.message].filter((part) => typeof part === 'string').join(' | ') || String(err);
}

/**
 * True when an error means the on-phone database has stopped working, as
 * opposed to an ordinary failure such as no signal or a refused write.
 */
export function isLocalStoreFailure(err: unknown): boolean {
  const message = String((err as { message?: unknown } | null)?.message ?? err ?? '');
  return /INTERNAL ASSERTION FAILED|INTERNAL UNHANDLED ERROR|in-progress transaction|IndexedDB|Indexed Database/i.test(message);
}

/** Whether enough time has passed since the last restart to try another */
export function mayRestart(lastRestartMs: number | null, nowMs: number): boolean {
  return lastRestartMs == null || !(lastRestartMs > 0) || nowMs - lastRestartMs >= RESTART_GAP_MS;
}

/**
 * Load the page again to get a working database back.
 * Returns false, and does nothing, if it was restarted moments ago.
 */
export function restartPage(reason: string): boolean {
  if (typeof window === 'undefined') return false;
  let last: number | null = null;
  try {
    last = Number(window.sessionStorage.getItem(RESTARTED_AT_KEY)) || null;
  } catch {
    // No session storage: restart anyway
  }
  if (!mayRestart(last, Date.now())) {
    console.error(`Not loading the page again so soon after the last time (${reason})`);
    return false;
  }
  try {
    window.sessionStorage.setItem(RESTARTED_AT_KEY, String(Date.now()));
  } catch {
    // The restart matters more than remembering it
  }
  console.warn(`Loading the page again: ${reason}`);
  window.location.reload();
  return true;
}
