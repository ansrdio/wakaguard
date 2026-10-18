import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAX_TRIES_PER_HOUR, nextTry, numberOnTrip, readOptOutRequest } from '../src/textOptOutPlan';
import { allowedOrigin } from '../src/webOrigins';
import { readOptOutAnswer } from '../../src/lib/textOptOut';

const NUMBER = '+2340000000001';

test('a stop request needs a link code and a full number; stopping is the default', () => {
  assert.deepEqual(readOptOutRequest({ token: 'trip_1', phoneE164: NUMBER }), { token: 'trip_1', phoneE164: NUMBER, action: 'stop' });
  assert.equal(readOptOutRequest({ token: 'trip_1', phoneE164: NUMBER, action: 'resume' })?.action, 'resume');
  for (const bad of [
    {},
    { token: 'trip_1' },
    { token: 'a/b', phoneE164: NUMBER },
    { token: 'trip_1', phoneE164: '08000000001' },
    { token: 'trip_1', phoneE164: NUMBER, action: 'delete' },
    null,
  ]) {
    assert.equal(readOptOutRequest(bad), null, JSON.stringify(bad));
  }
});

test('the number must be one of the contacts the trip texted', () => {
  const contacts = [{ id: 'a', phoneE164: NUMBER }, { id: 'b', phoneE164: '+2340000000002' }];
  assert.equal(numberOnTrip(NUMBER, contacts, ['a']), true);
  assert.equal(numberOnTrip(NUMBER, contacts, ['b']), false, 'a contact the trip did not text');
  assert.equal(numberOnTrip(NUMBER, contacts, []), true, 'a trip listing nobody texted everyone');
  assert.equal(numberOnTrip(NUMBER, contacts, undefined), true);
  assert.equal(numberOnTrip('+2340000000009', contacts, null), false);
});

test('ten tries an hour from one link, then a fresh hour', () => {
  let state: { startMs: number; count: number } | null = null;
  for (let i = 1; i <= MAX_TRIES_PER_HOUR; i++) {
    const next = nextTry(state, 1000 + i);
    assert.equal(next.allowed, true);
    state = next;
  }
  assert.equal(nextTry(state, 2000).allowed, false);
  const later = nextTry(state, 1000 + 60 * 60 * 1000 + 1);
  assert.deepEqual(later, { startMs: 1000 + 60 * 60 * 1000 + 1, count: 1, allowed: true });
});

test('only our own sites may call from a browser, and local pages only in the emulator', () => {
  assert.equal(allowedOrigin('https://wakaguard.com', false), 'https://wakaguard.com');
  assert.equal(allowedOrigin('https://routepulse-5701f.web.app', false), 'https://routepulse-5701f.web.app');
  assert.equal(allowedOrigin('https://wakaguard.com.example', false), null);
  assert.equal(allowedOrigin('http://wakaguard.com', false), null);
  assert.equal(allowedOrigin('http://localhost:3000', false), null);
  assert.equal(allowedOrigin('http://localhost:3000', true), 'http://localhost:3000');
  assert.equal(allowedOrigin(undefined, true), null);
});

test('the page reads the server answer plainly', () => {
  assert.equal(readOptOutAnswer(200, { ok: true, done: 'stopped' }), 'stopped');
  assert.equal(readOptOutAnswer(200, { ok: true, done: 'resumed' }), 'resumed');
  assert.equal(readOptOutAnswer(200, null), 'failed');
  assert.equal(readOptOutAnswer(403, { error: 'not_matched' }), 'not_matched');
  assert.equal(readOptOutAnswer(429, null), 'too_many');
  assert.equal(readOptOutAnswer(500, null), 'failed');
});
