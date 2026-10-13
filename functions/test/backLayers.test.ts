import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBackLayers } from '../../src/lib/backLayers';

/**
 * A browser history that behaves as a phone's does: a move asked for by the
 * page happens a moment later, to the place worked out when it was asked for,
 * and adding a step throws away anything ahead of the current one.
 */
function fakeWindow() {
  let entries: unknown[] = [null];
  let index = 0;
  let pushes = 0;
  let listener: (() => void) | null = null;
  const moves: (() => void)[] = [];
  const timers: (() => void)[] = [];
  const moveTo = (target: number) => {
    if (target < 0 || target >= entries.length || target === index) return;
    index = target;
    listener?.();
  };
  return {
    win: {
      history: {
        get state() { return entries[index]; },
        pushState(state: unknown) {
          entries = [...entries.slice(0, index + 1), state];
          index++;
          pushes++;
        },
        go(delta: number) {
          const target = index + delta;
          moves.push(() => moveTo(target));
        },
      },
      addEventListener(_type: 'popstate', fn: () => void) { listener = fn; },
      setTimeout(run: () => void) { timers.push(run); return run; },
      clearTimeout() {},
    },
    /** How many Back presses the app would take before it is left. */
    stepsLeft: () => index,
    pushes: () => pushes,
    /** The user presses Back. False when there was nothing to go back to: the app is left. */
    pressBack() {
      if (index === 0) return false;
      moveTo(index - 1);
      return true;
    },
    /** Time passes: timers fire and the history gets round to what it was asked. */
    settle() {
      for (let round = 0; round < 5; round++) {
        while (timers.length) timers.shift()!();
        while (moves.length) moves.shift()!();
      }
    },
  };
}

test('Back closes what is open instead of leaving the app', () => {
  const { win, pressBack, settle } = fakeWindow();
  const open = createBackLayers(win);
  let sheetOpen = true;
  open(() => { sheetOpen = false; });

  assert.equal(pressBack(), true);
  assert.equal(sheetOpen, false);
  settle();
  assert.equal(pressBack(), false, 'with nothing open, Back leaves the app');
});

test('Back closes the newest layer first, one at a time', () => {
  const { win, pressBack } = fakeWindow();
  const open = createBackLayers(win);
  const closed: string[] = [];
  open(() => closed.push('tab'));
  open(() => closed.push('sheet'));
  open(() => closed.push('pop-up'));

  pressBack();
  assert.deepEqual(closed, ['pop-up']);
  pressBack();
  pressBack();
  assert.deepEqual(closed, ['pop-up', 'sheet', 'tab']);
  assert.equal(pressBack(), false);
});

test('pressing Back never adds a step', () => {
  // Android skips steps a page adds without a tap, so a step added while
  // handling Back would be lost and the next Back would leave the app
  const { win, pressBack, pushes, settle } = fakeWindow();
  const open = createBackLayers(win);
  open(() => {});
  open(() => {});
  assert.equal(pushes(), 2);

  pressBack();
  settle();
  assert.equal(pushes(), 2);
});

test('closing the last thing from the screen leaves no dead Back press behind', () => {
  const { win, pressBack, settle } = fakeWindow();
  const open = createBackLayers(win);
  let backCalls = 0;
  const closedFromScreen = open(() => { backCalls++; });

  closedFromScreen();
  settle();
  assert.equal(pressBack(), false, 'the next Back should leave the app at once');
  assert.equal(backCalls, 0, 'closing from the screen must not call close again');
});

test('a layer that opens as another closes takes over its step', () => {
  // Tapping a report in the list: the list closes and the report opens together
  const { win, pressBack, settle, pushes, stepsLeft } = fakeWindow();
  const open = createBackLayers(win);
  const closed: string[] = [];
  open(() => closed.push('tab'));
  const closeList = open(() => closed.push('list'));

  closeList();
  open(() => closed.push('report'));
  settle();

  assert.equal(pushes(), 2, 'no third step is needed');
  assert.equal(stepsLeft(), 2, 'one step each for the tab and the report');
  pressBack();
  assert.deepEqual(closed, ['report']);
  pressBack();
  assert.deepEqual(closed, ['report', 'tab']);
  settle();
  assert.equal(pressBack(), false);
});

test('a spare step never makes Back do nothing', () => {
  const { win, pressBack, settle } = fakeWindow();
  const open = createBackLayers(win);
  let tabOpen = true;
  open(() => { tabOpen = false; });
  open(() => {})();   // a sheet, opened and closed from the screen
  settle();

  assert.equal(pressBack(), true);
  assert.equal(tabOpen, false, 'Back should have gone straight to the first tab');
  settle();
  assert.equal(pressBack(), false, 'and the next Back leaves the app');
});

test('closing a lower layer from the screen leaves the upper one working', () => {
  const { win, pressBack, settle } = fakeWindow();
  const open = createBackLayers(win);
  const closeTab = open(() => {});
  let sheetOpen = true;
  const closeSheet = open(() => { sheetOpen = false; });

  closeTab();
  settle();
  pressBack();
  assert.equal(sheetOpen, false);
  closeSheet();   // React's cleanup after Back: nothing more to do
  settle();
  assert.equal(pressBack(), false);
});

test('other state on the history is kept', () => {
  const { win } = fakeWindow();
  win.history.pushState({ router: 'tree' });
  createBackLayers(win)(() => {});
  assert.deepEqual(win.history.state, { router: 'tree', wakaguardBack: 1 });
});
