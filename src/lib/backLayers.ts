/**
 * @fileoverview What the phone's Back button closes
 *
 * Everything that opens over a screen (a sheet, a pop-up, a tab other than the
 * first) registers here as a layer, and the browser history is given one step
 * for each. Back takes a step off, and the newest layer closes. The Android
 * app goes back through the web history before it leaves (MainActivity), so
 * this is all it needs.
 *
 * Two things learned on a real phone shape how the steps are kept:
 *
 * - A step is only ever added when a layer opens, which follows a tap. Android
 *   skips history steps that a page adds without one (so that pages cannot
 *   trap the Back button), so nothing is added while handling Back.
 * - A step is not taken off the moment its layer is closed from the screen.
 *   Asking the history to go back takes a moment, and a layer that opened in
 *   that moment (tap a report in the list: the list closes as the report
 *   opens) lost its step to it. A spare step is kept for the next layer to
 *   use, and spares are only dropped once nothing at all is open.
 *
 * @module backLayers
 */

const STEP_KEY = 'wakaguardBack';

/** Long enough for a layer that opens as another closes to claim the spare step */
const TIDY_AFTER_MS = 150;

interface Layer {
  close: () => void;
}

/** The parts of `window` this needs, so the logic can be run without a browser. */
export interface BackWindow {
  history: {
    state: unknown;
    pushState(state: unknown, unused: string): void;
    go(delta: number): void;
  };
  addEventListener(type: 'popstate', listener: () => void): void;
  setTimeout(run: () => void, ms: number): unknown;
  clearTimeout(timer: never): void;
}

export function createBackLayers(win: BackWindow) {
  const stack: Layer[] = [];
  // How many of our steps lie behind the page, as far as we know
  let steps = 0;
  // Moves through the history that we asked for ourselves and are still to come
  let ignoring = 0;
  let tidyTimer: unknown = null;
  let listening = false;

  /** What the history itself says: each step is numbered when it is added. */
  const stepsBehind = () => {
    const state = win.history.state as Record<string, unknown> | null;
    const count = state && typeof state === 'object' ? state[STEP_KEY] : 0;
    return typeof count === 'number' ? count : 0;
  };

  /** Once nothing is open, drops any spare steps, so the next Back leaves the app. */
  const tidySoon = () => {
    if (tidyTimer != null) return;
    tidyTimer = win.setTimeout(() => {
      tidyTimer = null;
      if (stack.length > 0 || steps === 0) return;
      ignoring++;
      win.history.go(-steps);
      steps = 0;
    }, TIDY_AFTER_MS);
  };

  const onPop = () => {
    steps = stepsBehind();
    if (ignoring > 0) {
      ignoring--;
      return;
    }
    // Back was pressed: close the newest thing that is open
    stack.pop()?.close();
    tidySoon();
  };

  /**
   * Registers something that is now open. `close` is called when Back is
   * pressed while it is the newest layer. Call the returned function when it
   * is closed any other way.
   */
  return function openLayer(close: () => void): () => void {
    const layer: Layer = { close };
    stack.push(layer);
    if (!listening) {
      win.addEventListener('popstate', onPop);
      listening = true;
    }
    // A spare step left by a layer that has just closed serves this one
    if (steps < stack.length) {
      const state = win.history.state && typeof win.history.state === 'object' ? win.history.state : {};
      steps++;
      win.history.pushState({ ...state, [STEP_KEY]: steps }, '');
    }

    return () => {
      const index = stack.indexOf(layer);
      if (index === -1) return; // Back already closed it
      stack.splice(index, 1);
      tidySoon();
    };
  };
}

let shared: ReturnType<typeof createBackLayers> | null = null;

/** Registers an open layer with the page's own history. See createBackLayers. */
export function openBackLayer(close: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  shared ??= createBackLayers(window as unknown as BackWindow);
  return shared(close);
}
