/**
 * @fileoverview Putting a time limit on something the app is waiting for
 *
 * A phone can leave a question unanswered: a permission check that never
 * returns, a GPS fix that never comes. Anything a safety action waits on
 * needs a limit, or the action hangs with a spinner on screen.
 *
 * @module timeLimit
 */

/**
 * Wait for `work`, but no longer than `waitMs`.
 * Resolves with the work's result, or with `fallback` if the work has not
 * finished in time or has failed. Never rejects.
 */
export function settleWithin<T, F>(work: Promise<T>, waitMs: number, fallback: F): Promise<T | F> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(fallback), waitMs);
    work.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        clearTimeout(timer);
        resolve(fallback);
      }
    );
  });
}
