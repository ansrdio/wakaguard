/**
 * @fileoverview What the phone's Back button closes
 *
 * Everything that opens over a screen (a sheet, a pop-up, a tab other than the
 * first) registers here as a layer. While any layer is open, one extra step
 * sits on the browser history, so Back lands on that step instead of leaving
 * the app, and the newest layer closes. The Android app goes back through the
 * web history first (MainActivity), so this is all it needs.
 *
 * @module backLayers
 */

const STEP_KEY = 'wakaguardBack';

interface Layer {
  close: () => void;
}

/** The parts of `window` this needs, so the logic can be run without a browser. */
export interface BackWindow {
  history: {
    state: unknown;
    pushState(state: unknown, unused: string): void;
    back(): void;
  };
  addEventListener(type: 'popstate', listener: () => void): void;
}

export function createBackLayers(win: BackWindow) {
  const stack: Layer[] = [];
  // Our step is on the history
  let armed = false;
  // We asked the history to drop our step, and it has not answered yet
  let undoing = false;
  let listening = false;

  const arm = () => {
    if (armed) return;
    const state = win.history.state && typeof win.history.state === 'object' ? win.history.state : {};
    win.history.pushState({ ...state, [STEP_KEY]: true }, '');
    armed = true;
  };

  const onPop = () => {
    armed = false;
    if (undoing) {
      undoing = false;
    } else {
      // Back was pressed: close the newest layer
      stack.pop()?.close();
    }
    if (stack.length > 0) arm();
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
    // While a step is being dropped, onPop adds the new one when that finishes
    if (!undoing) arm();

    return () => {
      const index = stack.indexOf(layer);
      if (index === -1) return; // Back already closed it
      stack.splice(index, 1);
      // Nothing left open: take our step off, or the next Back would do nothing
      if (stack.length === 0 && armed && !undoing) {
        undoing = true;
        win.history.back();
      }
    };
  };
}

let shared: ReturnType<typeof createBackLayers> | null = null;

/** Registers an open layer with the page's own history. See createBackLayers. */
export function openBackLayer(close: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  shared ??= createBackLayers(window);
  return shared(close);
}
