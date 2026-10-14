import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  TRAVEL_MODES, isTravelMode, lastTravelMode, rememberTravelMode,
  tipBeforeSettingOff, tipOnTheWay, tipsFor, travelModeLabel,
} from '../../src/lib/travelMode';
import { TRAVEL_MODE_IDS, travelModeForContacts } from '../src/tripMonitor';

const store = new Map<string, string>();
beforeEach(() => {
  store.clear();
  (globalThis as { window?: unknown }).window = {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      removeItem: (key: string) => void store.delete(key),
    },
  };
});

test('the ways of travelling, and only those', () => {
  assert.deepEqual(TRAVEL_MODES.map((mode) => mode.id), ['bus', 'keke', 'okada', 'car', 'taxi', 'foot', 'other']);
  assert.ok(isTravelMode('okada'));
  for (const not of ['', 'Okada', 'canoe', null, undefined, 3]) assert.equal(isTravelMode(not), false);
  assert.equal(travelModeLabel('bus'), 'Bus or danfo');
  assert.equal(travelModeLabel('canoe'), '');
});

test('every way of travelling but "other" has tips, short enough for one line or two', () => {
  for (const mode of TRAVEL_MODES) {
    const tips = tipsFor(mode.id);
    if (mode.id === 'other') {
      assert.deepEqual([...tips], []);
      continue;
    }
    assert.ok(tips.length >= 2, mode.id);
    for (const tip of tips) {
      assert.ok(tip.length <= 90, tip);
      assert.match(tip, /^[A-Z].*\.$/);
    }
  }
});

test('the start form and the trip card show different tips', () => {
  assert.equal(tipBeforeSettingOff('okada'), 'Ask for a helmet and hold on with both hands.');
  assert.equal(tipOnTheWay('okada'), 'Avoid okada at night and in the rain.');
  for (const mode of TRAVEL_MODES) {
    if (mode.id === 'other') continue;
    assert.notEqual(tipBeforeSettingOff(mode.id), tipOnTheWay(mode.id));
  }
});

test('no answer, or "other", means no tip and nothing in the way', () => {
  for (const mode of [null, undefined, 'other'] as const) {
    assert.equal(tipBeforeSettingOff(mode), null);
    assert.equal(tipOnTheWay(mode), null);
  }
});

test('the last answer is remembered, and forgotten when the question is left unanswered', () => {
  assert.equal(lastTravelMode(), null);
  rememberTravelMode('keke');
  assert.equal(lastTravelMode(), 'keke');
  rememberTravelMode(null);
  assert.equal(lastTravelMode(), null);
});

test('something else saved under the same name is not taken for an answer', () => {
  store.set('wakaguard_travel_mode', 'canoe');
  assert.equal(lastTravelMode(), null);
});

test('a phone that cannot remember anything still works', () => {
  (globalThis as { window?: unknown }).window = { get localStorage(): never { throw new Error('blocked'); } };
  assert.equal(lastTravelMode(), null);
  assert.doesNotThrow(() => rememberTravelMode('bus'));
});

test('the server knows the same ways of travelling as the app', () => {
  assert.deepEqual([...TRAVEL_MODE_IDS].sort(), TRAVEL_MODES.map((mode) => mode.id).sort());
});

test('only one of the app\'s own choices is ever put on the page contacts open', () => {
  assert.deepEqual(travelModeForContacts({ travelMode: 'okada' }), { travelMode: 'okada' });
  for (const not of [undefined, {}, { travelMode: '' }, { travelMode: 'canoe' }, { travelMode: 7 }, { travelMode: '<b>bus</b>' }]) {
    assert.deepEqual(travelModeForContacts(not as never), {});
  }
});
