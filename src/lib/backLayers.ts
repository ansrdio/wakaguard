/**
 * @fileoverview What the phone's Back button closes
 *
 * Everything that opens over a screen (a sheet, a pop-up, a tab other than the
 * first) registers here as a layer, and each layer puts one step of its own on
 * the browser history. Back takes the newest step off, and the layer it stood
 * for closes. The Android app goes back through the web history before it
 * leaves (MainActivity), so this is all it needs.
 *
 * A step is only ever added when a layer opens, which follows a tap. Android
 * skips history steps that a page adds without one (so that pages cannot trap
 * the Back button), and a step added from inside the Back handler was being
 * skipped on a real phone: the second Back in a row left the app.
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
  // Steps we have asked the history to take off, which it has not done yet
  let undoing = 0;
  let listening = false;

  const onPop = () => {
    if (undoing > 0) {
      undoing--;
      return;
    }
    // Back was pressed and took the newest step with it: close its layer
    stack.pop()?.close();
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
    const state = win.history.state && typeof win.history.state === 'object' ? win.history.state : {};
    win.history.pushState({ ...state, [STEP_KEY]: true }, '');

    return () => {
      const index = stack.indexOf(layer);
      if (index === -1) return; // Back already closed it, and its step went with it
      stack.splice(index, 1);
      // Closed from the screen: take its step off, or a later Back would do nothing
      undoing++;
      win.history.back();
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
