import { test } from 'node:test';
import assert from 'node:assert/strict';
import { adviseOnLocation, describeFix, PhoneLocation } from '../../src/lib/locationCheck';
import { describeLocationStatus } from '../../src/lib/tripPlanning';

const NOW = Date.UTC(2026, 9, 12, 8, 0);
const MIN = 60 * 1000;
const none = describeLocationStatus(null, false, NOW);
const fresh = describeLocationStatus(NOW - MIN, true, NOW);
const stale = describeLocationStatus(NOW - 20 * MIN, true, NOW);
const phone = (over: Partial<PhoneLocation> = {}): PhoneLocation => ({ permission: 'granted', switchedOn: true, ...over });

test('before the phone has answered, the trip says what it always said', () => {
  assert.deepEqual(adviseOnLocation(none, null, true), { tone: 'problem', text: none.text, action: null });
  assert.deepEqual(adviseOnLocation(fresh, null, true), { tone: 'fine', text: fresh.text, action: null });
});

test('location switched off on the phone is named as that', () => {
  const advice = adviseOnLocation(none, phone({ permission: 'unknown', switchedOn: false }), true);
  assert.equal(advice.tone, 'problem');
  assert.match(advice.text, /switched off on this phone/);
  // The check screen is where they see it come back on
  assert.equal(advice.action, 'check');
});

test('a refused permission offers the phone settings in the app, and words for a browser', () => {
  const inApp = adviseOnLocation(none, phone({ permission: 'denied' }), true);
  assert.match(inApp.text, /not allowed to use your location/);
  assert.equal(inApp.action, 'settings');

  const inBrowser = adviseOnLocation(none, phone({ permission: 'denied', switchedOn: null }), false);
  assert.match(inBrowser.text, /browser/);
  assert.equal(inBrowser.action, 'check');
});

test('a permission never asked for offers the question', () => {
  assert.equal(adviseOnLocation(none, phone({ permission: 'ask' }), true).action, 'ask');
});

test('a switch that is off or a refusal outranks a position that is still recent', () => {
  assert.equal(adviseOnLocation(fresh, phone({ permission: 'denied' }), true).tone, 'problem');
  assert.equal(adviseOnLocation(fresh, phone({ switchedOn: false }), true).tone, 'problem');
});

test('allowed but no position yet says it is waiting, and offers the check', () => {
  const advice = adviseOnLocation(none, phone(), true);
  assert.match(advice.text, /Waiting for your phone to find where you are/);
  assert.equal(advice.action, 'check');
});

test('a position gone quiet keeps its wording and offers the check', () => {
  const advice = adviseOnLocation(stale, phone(), true);
  assert.equal(advice.text, stale.text);
  assert.equal(advice.action, 'check');
});

test('rough location only is pointed out even while positions arrive', () => {
  const advice = adviseOnLocation(fresh, phone({ permission: 'approximate' }), true);
  assert.match(advice.text, /only roughly where you are/);
  assert.equal(advice.action, 'settings');
});

test('all well says so and offers nothing', () => {
  assert.deepEqual(adviseOnLocation(fresh, phone(), true), { tone: 'fine', text: fresh.text, action: null });
});

// ---------------------------------------------------------------------------
// Finding the phone, to pin a road report
// ---------------------------------------------------------------------------

type Answer = { lat: number; lng: number; accuracy: number } | null;

// Node has a navigator of its own that cannot simply be assigned over
const setNavigator = (value: unknown) =>
  Object.defineProperty(globalThis, 'navigator', { value, configurable: true, writable: true });

/** A phone that answers a precise request with one thing and a rough request with another */
function phoneThatAnswers(precise: Answer, rough: Answer) {
  const asked: boolean[] = [];
  setNavigator({
    geolocation: {
      getCurrentPosition(ok: (p: unknown) => void, fail: () => void, options: { enableHighAccuracy: boolean }) {
        asked.push(options.enableHighAccuracy);
        const answer = options.enableHighAccuracy ? precise : rough;
        if (answer) ok({ coords: { latitude: answer.lat, longitude: answer.lng, accuracy: answer.accuracy } });
        else fail();
      },
    },
  });
  return asked;
}

test('an exact position is used as it is, and the rough one is not asked for', async () => {
  const { findPosition } = await import('../../src/lib/locationCheck');
  const asked = phoneThatAnswers({ lat: 6.5, lng: 3.4, accuracy: 12.4 }, { lat: 1, lng: 1, accuracy: 3000 });
  assert.deepEqual(await findPosition(50, 50), { lat: 6.5, lng: 3.4, accuracy: 12, rough: false });
  assert.deepEqual(asked, [true]);
});

test('with no exact position, a rough one is used and marked as rough', async () => {
  const { findPosition } = await import('../../src/lib/locationCheck');
  const asked = phoneThatAnswers(null, { lat: 6.6, lng: 3.3, accuracy: 2900 });
  assert.deepEqual(await findPosition(50, 50), { lat: 6.6, lng: 3.3, accuracy: 2900, rough: true });
  assert.deepEqual(asked, [true, false]);
});

test('a phone that gives neither is reported as not found, not as an error', async () => {
  const { findPosition } = await import('../../src/lib/locationCheck');
  phoneThatAnswers(null, null);
  assert.equal(await findPosition(50, 50), null);
  setNavigator({});
  assert.equal(await findPosition(50, 50), null);
});

test('the check screen counts a position as good only when it is close enough to find someone', () => {
  assert.deepEqual(describeFix({ found: true, seconds: 1, accuracy: 23 }), { text: 'Found in 1 second, to within 23 m', good: true });
  assert.deepEqual(describeFix({ found: true, seconds: 2, accuracy: 200 }), { text: 'Found in 2 seconds, to within 200 m', good: true });
  // A tester's phone found by masts only (13 October 2026) used to get a green tick
  assert.deepEqual(describeFix({ found: true, seconds: 2, accuracy: 2900 }), { text: 'Found in 2 seconds, but only to within 2,900 m', good: false });
});

test('the check screen says how long it waited, in good English', () => {
  assert.deepEqual(describeFix(null), { text: 'Looking…', good: null });
  assert.deepEqual(describeFix({ found: false, seconds: 0, accuracy: null }), { text: 'Not found', good: false });
  assert.deepEqual(describeFix({ found: false, seconds: 1, accuracy: null }), { text: 'Not found after 1 second', good: false });
  assert.deepEqual(describeFix({ found: false, seconds: 20, accuracy: null }), { text: 'Not found after 20 seconds', good: false });
});
