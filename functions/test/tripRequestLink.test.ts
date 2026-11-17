import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { askAppHref, askBrowserHref, askIdFrom, askLink, askMessage, createProblemWords, forgetAsk, pendingAsk, readProblemWords, rememberAsk } from '../../src/lib/tripRequestLink';
import { newRequestId } from '../src/tripRequests';

const ID = newRequestId();
const DAY = 24 * 60 * 60 * 1000;

function withStorage() {
  const store = new Map<string, string>();
  (globalThis as unknown as { window: unknown }).window = {
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    },
    dispatchEvent: () => true,
  };
}

afterEach(() => {
  delete (globalThis as unknown as { window?: unknown }).window;
});

test('the link is the address the phone apps claim, with the request id', () => {
  assert.equal(askLink(ID), `https://wakaguard.com/open?ask=${ID}`);
  assert.equal(askIdFrom(askLink(ID)), ID);
  assert.equal(askIdFrom(`wakaguard://open?ask=${ID}`), ID, "the app's own scheme too");
  assert.equal(askIdFrom(`?ask=${ID}`), ID, 'or just the query');
});

test('the website page opens the app, or the web app, with the same request', () => {
  assert.equal(askIdFrom(askAppHref(ID)), ID);
  assert.ok(askAppHref(ID).startsWith('wakaguard://open?'));
  assert.equal(askIdFrom(askBrowserHref(ID)), ID);
  assert.ok(new URLSearchParams(askBrowserHref(ID).split('?')[1]).has('app'), 'goes straight into the app, not the landing page');
});

test('anything that is not one of our ids is ignored', () => {
  assert.equal(askIdFrom('https://wakaguard.com/open?after=verify'), null);
  assert.equal(askIdFrom('https://wakaguard.com/open?ask=short'), null);
  assert.equal(askIdFrom('https://wakaguard.com/open?ask=../../users/abcdefghij'), null);
  assert.equal(askIdFrom('https://wakaguard.com/'), null);
});

test('the message is in the asker’s own words and ends with the link', () => {
  const message = askMessage(askLink(ID));
  assert.match(message, /^Please let me know when you get there/);
  assert.ok(message.endsWith(askLink(ID)));
});

test('an id from a link is kept on the phone for as long as a link works', () => {
  withStorage();
  const now = 1_800_000_000_000;
  assert.equal(pendingAsk(now), null);
  rememberAsk(ID, now);
  assert.equal(pendingAsk(now + DAY), ID);
  assert.equal(pendingAsk(now + 8 * DAY), null, 'not after the link has expired');
  forgetAsk();
  assert.equal(pendingAsk(now), null);
});

test('a request already answered is not asked again when the same link reopens the app', () => {
  withStorage();
  rememberAsk(ID);
  forgetAsk(ID);
  rememberAsk(ID);
  assert.equal(pendingAsk(), null);
  const other = newRequestId();
  rememberAsk(other);
  assert.equal(pendingAsk(), other, 'a new link still is');
});

test('with no storage nothing breaks', () => {
  assert.doesNotThrow(() => rememberAsk(ID));
  assert.equal(pendingAsk(), null);
  assert.doesNotThrow(() => forgetAsk());
});

test('every problem has plain words', () => {
  for (const p of ['name', 'phone', 'too_many', 'not_confirmed'] as const) assert.ok(createProblemWords(p).length > 10);
  for (const p of ['not_found', 'expired', 'own'] as const) assert.ok(readProblemWords(p).length > 10);
});
