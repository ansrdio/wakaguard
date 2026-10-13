import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBackLayers } from '../../src/lib/backLayers';

/** A browser history that answers back() later, as real ones do. */
function fakeWindow() {
  const entries: unknown[] = [null];
  let listener: (() => void) | null = null;
  const pending: (() => void)[] = [];
  const pop = () => {
    if (entries.length > 1) entries.pop();
    listener?.();
  };
  return {
    win: {
      history: {
        get state() { return entries[entries.length - 1]; },
        pushState(state: unknown) { entries.push(state); },
        back() { pending.push(pop); },
      },
      addEventListener(_type: 'popstate', fn: () => void) { listener = fn; },
    },
    /** How many steps of ours are on the history. */
    steps: () => entries.length - 1,
    /** The user presses Back. */
    pressBack: pop,
    /** The history gets round to the back() calls made so far. */
    settle: () => { while (pending.length) pending.shift()!(); },
  };
}

test('Back closes what is open instead of leaving the app', () => {
  const { win, steps, pressBack } = fakeWindow();
  const open = createBackLayers(win);
  let sheetOpen = true;
  open(() => { sheetOpen = false; });

  assert.equal(steps(), 1);
  pressBack();
  assert.equal(sheetOpen, false);
  assert.equal(steps(), 0, 'the next Back leaves the app');
});

test('Back closes the newest layer first, one at a time', () => {
  const { win, steps, pressBack } = fakeWindow();
  const open = createBackLayers(win);
  const closed: string[] = [];
  open(() => closed.push('tab'));
  open(() => closed.push('sheet'));
  open(() => closed.push('pop-up'));

  pressBack();
  assert.deepEqual(closed, ['pop-up']);
  assert.equal(steps(), 1, 'still something open, so Back stays in the app');
  pressBack();
  pressBack();
  assert.deepEqual(closed, ['pop-up', 'sheet', 'tab']);
  assert.equal(steps(), 0);
});

test('closing from the screen leaves no dead Back press behind', () => {
  const { win, steps, settle } = fakeWindow();
  const open = createBackLayers(win);
  let backCalls = 0;
  const closedFromScreen = open(() => { backCalls++; });

  closedFromScreen();
  settle();
  assert.equal(steps(), 0);
  assert.equal(backCalls, 0, 'closing from the screen must not call close again');
});

test('a layer that opens while another is still closing keeps its Back', () => {
  const { win, steps, settle, pressBack } = fakeWindow();
  const open = createBackLayers(win);
  open(() => {})();          // opened, then closed from the screen
  let secondOpen = true;
  open(() => { secondOpen = false; });   // opened before the history answered
  settle();

  assert.equal(secondOpen, true, 'the second layer was closed by the first one going away');
  assert.equal(steps(), 1);
  pressBack();
  assert.equal(secondOpen, false);
});

test('closing a lower layer from the screen leaves the upper one working', () => {
  const { win, steps, settle, pressBack } = fakeWindow();
  const open = createBackLayers(win);
  const closeTab = open(() => {});
  let sheetOpen = true;
  const closeSheet = open(() => { sheetOpen = false; });

  closeTab();
  settle();
  assert.equal(steps(), 1);
  pressBack();
  assert.equal(sheetOpen, false);
  closeSheet();   // React's cleanup after Back: nothing more to do
  settle();
  assert.equal(steps(), 0);
});

test('other state on the history is kept', () => {
  const { win } = fakeWindow();
  win.history.pushState({ router: 'tree' });
  createBackLayers(win)(() => {});
  assert.deepEqual(win.history.state, { router: 'tree', wakaguardBack: true });
});
