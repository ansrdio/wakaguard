import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RESTART_LIMIT_MS, reachedServer, setConnectionRestart } from '../../src/lib/firestoreWrites';

const after = <T>(ms: number, value: T) => new Promise<T>((resolve) => setTimeout(() => resolve(value), ms));

/** Counts restarts; `onRestart` lets a test make the stuck save go through */
function restarts(onRestart: () => void = () => {}) {
  const count = { n: 0 };
  setConnectionRestart(async () => {
    count.n++;
    onRestart();
  });
  return count;
}

test('a save that arrives in time needs no restart', async () => {
  const count = restarts();
  assert.equal(await reachedServer(after(5, 'ok'), 50, 50), true);
  assert.equal(count.n, 0);
});

test('a stuck save restarts the connection once and is waited for again', async () => {
  let release: () => void = () => {};
  const write = new Promise<void>((resolve) => (release = resolve));
  const count = restarts(() => setTimeout(release, 10));
  assert.equal(await reachedServer(write, 20, 100), true);
  assert.equal(count.n, 1);
});

test('a save that still has not arrived after the restart is left queued', async () => {
  const count = restarts();
  const started = Date.now();
  assert.equal(await reachedServer(new Promise(() => {}), 20, 30), false);
  assert.equal(count.n, 1);
  assert.ok(Date.now() - started < 500);
});

test('a save the server refuses is still reported as refused', async () => {
  restarts();
  await assert.rejects(reachedServer(Promise.reject(new Error('permission-denied')), 50, 50), /permission-denied/);
});

test('a refusal that comes after the restart is reported too', async () => {
  restarts();
  await assert.rejects(
    reachedServer(after(40, null).then(() => { throw new Error('permission-denied'); }), 20, 100),
    /permission-denied/
  );
});

test('a restart that never finishes does not hold the screen', async () => {
  setConnectionRestart(() => new Promise(() => {}));
  const started = Date.now();
  assert.equal(await reachedServer(new Promise(() => {}), 10, 10), false);
  const took = Date.now() - started;
  assert.ok(took >= RESTART_LIMIT_MS && took < RESTART_LIMIT_MS + 1000, `took ${took} ms`);
});
