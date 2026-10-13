import { test } from 'node:test';
import assert from 'node:assert/strict';
import { adviseOnLocation, PhoneLocation } from '../../src/lib/locationCheck';
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
