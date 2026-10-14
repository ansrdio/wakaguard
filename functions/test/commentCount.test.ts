import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isShownComment } from '../src/commentCount';

test('a comment shows when it is active or has no status, as in the app', () => {
  for (const status of ['active', undefined, null, '']) assert.equal(isShownComment(status), true);
  for (const status of ['hidden', 'removed', 'deleted']) assert.equal(isShownComment(status), false);
});
