import { test } from 'node:test';
import assert from 'node:assert/strict';
import { batteryForText, batteryFromPhone, TEXT_BATTERY_MAX_AGE_MS } from '../src/battery';
import { batteryLine, keptBattery, readingFrom } from '../../src/lib/battery';
import { buildOverdueMessage, buildSosMessage } from '../src/templates';

const NOW = Date.UTC(2026, 10, 17, 15, 0);

test('the phone says 0 to 1; the server keeps a whole number from 0 to 100', () => {
  assert.deepEqual(readingFrom(0.083, false), { level: 8, charging: false });
  assert.deepEqual(readingFrom(1, true), { level: 100, charging: true });
  for (const bad of [-1, 1.2, NaN, null, undefined, '0.5']) assert.equal(readingFrom(bad, false), null, String(bad));
  assert.deepEqual(batteryFromPhone(8, false, NOW), { level: 8, charging: false, atMs: NOW });
  assert.deepEqual(batteryFromPhone(55, 'yes', NOW), { level: 55, charging: false, atMs: NOW });
  for (const bad of [-1, 101, 8.5, '8', null, undefined]) assert.equal(batteryFromPhone(bad, false, NOW), null, String(bad));
});

test('contacts are told plainly, and warned when it is low and not charging', () => {
  assert.deepEqual(batteryLine(keptBattery({ level: 57, charging: false }), false), { text: 'Battery 57%', low: false });
  assert.deepEqual(batteryLine(keptBattery({ level: 8, charging: false }), false), { text: 'Battery low: 8%. Their phone may switch off soon.', low: true });
  assert.deepEqual(batteryLine(keptBattery({ level: 8, charging: true }), false), { text: 'Battery 8%, charging', low: false });
  // With no update for a while, it is the battery as it was then
  assert.deepEqual(batteryLine(keptBattery({ level: 6, charging: false }), true), { text: 'Battery was 6% then. Their phone may have switched off.', low: true });
  assert.deepEqual(batteryLine(keptBattery({ level: 70, charging: false }), true), { text: 'Battery was 70% then.', low: false });
  assert.equal(batteryLine(keptBattery(undefined), false), null);
  assert.equal(keptBattery({ level: 'low' }), null);
});

test('an alert text carries the battery only when the reading is recent', () => {
  assert.equal(batteryForText({ level: 8, atMs: NOW - 5 * 60 * 1000 }, NOW), 8);
  assert.equal(batteryForText({ level: 8, atMs: NOW - TEXT_BATTERY_MAX_AGE_MS - 1 }, NOW), null);
  assert.equal(batteryForText({ level: 8 }, NOW), null);
  assert.equal(batteryForText(null, NOW), null);
});

test('the battery goes after when they were last seen', () => {
  const overdue = buildOverdueMessage({
    userName: 'Ada', kind: 'trip', deadlineMs: NOW, destination: 'Yaba', lat: 6.5, lng: 3.4, lastUpdateMs: NOW - 10 * 60 * 1000, token: 't1', battery: 8,
  });
  assert.match(overdue, /\nLast seen Tue 3:50 pm, battery 8%:\nhttps:\/\/maps/);
  const sos = buildSosMessage({ userName: 'Ada', lat: 6.5, lng: 3.4, locationAtMs: NOW, token: 't1', battery: 42 });
  assert.match(sos, /, battery 42%:\n/);
  assert.doesNotMatch(buildSosMessage({ userName: 'Ada', lat: 6.5, lng: 3.4, token: 't1' }), /battery/);
});

test('a long alert drops the plate first, then the battery, to stay within two pages', () => {
  const long = {
    userName: 'Adaeze Chukwuemeka-Okonkwo', kind: 'trip' as const, deadlineMs: NOW,
    destination: 'Federal Medical Centre, Ebute Metta, Lagos Mainland', lat: 6.5, lng: 3.4,
    lastUpdateMs: NOW - 10 * 60 * 1000, token: 'abcdefghijklmnopqrstuvwxyz012345', plate: 'KJA 123 AB', battery: 8,
  };
  const text = buildOverdueMessage(long);
  assert.ok(!text.includes('KJA 123 AB') || text.includes('battery 8%'), 'the battery is kept before the plate');
});
