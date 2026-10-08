import { test } from 'node:test';
import assert from 'node:assert/strict';
import { settleWithin } from '../../src/lib/timeLimit';

const after = <T>(ms: number, value: T) => new Promise<T>((resolve) => setTimeout(() => resolve(value), ms));

test('settleWithin: gives the result when the work finishes in time', async () => {
  assert.equal(await settleWithin(after(5, 'done'), 200, 'late'), 'done');
});

test('settleWithin: gives the fallback when the work takes too long', async () => {
  const started = Date.now();
  assert.equal(await settleWithin(after(500, 'done'), 30, 'late'), 'late');
  assert.ok(Date.now() - started < 400, 'did not wait for the slow work');
});

test('settleWithin: gives the fallback when the work never answers', async () => {
  assert.equal(await settleWithin(new Promise(() => {}), 30, null), null);
});

test('settleWithin: gives the fallback when the work fails, and never rejects', async () => {
  assert.equal(await settleWithin(Promise.reject(new Error('no GPS')), 200, 'late'), 'late');
});

test('settleWithin: a failure after the limit is ignored', async () => {
  const slowFailure = new Promise<string>((_, reject) => setTimeout(() => reject(new Error('too late')), 60));
  assert.equal(await settleWithin(slowFailure, 20, 'late'), 'late');
  // Give the late rejection time to arrive; it must not surface as an unhandled error
  await after(80, null);
});
