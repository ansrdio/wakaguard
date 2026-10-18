import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ARRIVE_UNDO_MS, undoSecondsLeft } from '../../src/lib/arriveUndo';

test('"I\'ve arrived" waits five seconds, counting down 5 to 1, then nothing is left', () => {
  assert.equal(ARRIVE_UNDO_MS, 5000);
  const start = 1_000_000;
  assert.equal(undoSecondsLeft(start, start), 5);
  assert.equal(undoSecondsLeft(start, start + 1), 5);
  assert.equal(undoSecondsLeft(start, start + 1000), 4);
  assert.equal(undoSecondsLeft(start, start + 4001), 1);
  assert.equal(undoSecondsLeft(start, start + 5000), 0);
  assert.equal(undoSecondsLeft(start, start + 9000), 0);
});
