import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAX_EXTEND_MINUTES, readTripAction } from '../src/tripActionPlan';
import {
  describeLocationStatus,
  describeTimeLeft,
  formatClock,
  formatDuration,
  ARRIVAL_PRESETS,
  DEFAULT_TRIP_MINUTES,
  initialsOf,
  joinNames,
  LONG_TRIP_PRESETS,
  MAX_EXTRA_MINUTES,
  readExtraMinutes,
  RETURN_HOLD_MS,
  textContactsByDefault,
  tripExpiryMs,
  validateTripPlan,
} from '../../src/lib/tripPlanning';

const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const LAGOS = { locale: 'en-GB', timeZone: 'Africa/Lagos' };
// Tue 6 Oct 2026, 2:00 pm in Lagos
const NOW = Date.UTC(2026, 9, 6, 13, 0);

const valid = { destination: 'Benin City', durationMinutes: 240, contactIds: ['a'], alertName: 'Ada' };

test('durations read naturally', () => {
  assert.equal(formatDuration(45), '45 min');
  assert.equal(formatDuration(120), '2 h');
  assert.equal(formatDuration(135), '2 h 15 min');
  assert.equal(formatDuration(0), '0 min');
  assert.equal(formatDuration(-5), '0 min');
});

test('arrival time shows the weekday only when it is not today', () => {
  assert.match(formatClock(NOW + 2 * HOUR + 30 * MIN, NOW, LAGOS), /^4:30\s?pm$/i);
  assert.match(formatClock(NOW + 11 * HOUR, NOW, LAGOS), /^Wed 1:00\s?am$/i);
});

test('countdown moves from active to ending soon to overdue', () => {
  assert.deepEqual(describeTimeLeft(NOW + 134 * MIN, NOW), { state: 'active', text: '2 h 14 min left', label: 'Time remaining', value: '2 h 14 min' });
  assert.deepEqual(describeTimeLeft(NOW + 10 * MIN, NOW), { state: 'endingSoon', text: '10 min left', label: 'Time remaining', value: '10 min' });
  assert.deepEqual(describeTimeLeft(NOW + 20 * 1000, NOW), { state: 'endingSoon', text: '1 min left', label: 'Time remaining', value: '1 min' });
  assert.deepEqual(describeTimeLeft(NOW, NOW), { state: 'overdue', text: 'Arrival time reached', label: 'Time remaining', value: '0 min' });
  assert.deepEqual(describeTimeLeft(NOW - 12 * MIN, NOW), { state: 'overdue', text: '12 min overdue', label: 'Overdue by', value: '12 min' });
  assert.deepEqual(describeTimeLeft(NOW - 95 * MIN, NOW), { state: 'overdue', text: '1 h 35 min overdue', label: 'Overdue by', value: '1 h 35 min' });
});

test('a complete plan is valid', () => {
  assert.deepEqual(validateTripPlan(valid), {});
});

test('each missing part of a plan gets its own message', () => {
  assert.equal(validateTripPlan({ ...valid, destination: ' ' }).destination, 'Enter where you are going');
  assert.deepEqual(validateTripPlan({ ...valid, destination: '12 Adeola Odeku Street, Victoria Island, Lagos' }), {});
  assert.match(validateTripPlan({ ...valid, destination: 'x'.repeat(81) }).destination!, /under 80/);
  assert.equal(validateTripPlan({ ...valid, durationMinutes: 0 }).duration, 'Choose when you expect to arrive');
  assert.equal(validateTripPlan({ ...valid, durationMinutes: NaN }).duration, 'Choose when you expect to arrive');
  assert.match(validateTripPlan({ ...valid, durationMinutes: 21 * 60 }).duration!, /up to 20 h/);
  assert.equal(validateTripPlan({ ...valid, contactIds: [] }).contacts, 'Choose at least one person to alert');
  assert.match(validateTripPlan({ ...valid, contactIds: ['a', 'b', 'c', 'd', 'e', 'f'] }).contacts!, /up to 5/);
  assert.equal(validateTripPlan({ ...valid, alertName: 'A' }).alertName, 'Enter the name your contacts know you by');
  assert.match(validateTripPlan({ ...valid, alertName: 'x'.repeat(31) }).alertName!, /under 30/);

  const all = validateTripPlan({ destination: '', durationMinutes: 0, contactIds: [], alertName: '' });
  assert.deepEqual(Object.keys(all).sort(), ['alertName', 'contacts', 'destination', 'duration']);
});

test('the share link outlives the expected arrival', () => {
  assert.equal(tripExpiryMs(NOW, NOW + 2 * HOUR), NOW + 24 * HOUR);
  assert.equal(tripExpiryMs(NOW, NOW + 18 * HOUR), NOW + 30 * HOUR);
  assert.equal(tripExpiryMs(NOW, null), NOW + 24 * HOUR);
});

test('location status tells fresh from stale from missing', () => {
  assert.deepEqual(describeLocationStatus(NOW - 20 * 1000, true, NOW), {
    state: 'fresh',
    text: 'Sharing your location, updated just now',
  });
  assert.equal(describeLocationStatus(NOW - 3 * MIN, true, NOW).text, 'Sharing your location, updated 3 min ago');
  assert.deepEqual(describeLocationStatus(NOW - 12 * MIN, true, NOW), {
    state: 'stale',
    // Not "keep the app open": this shows while the app is open
    text: 'No location received for 12 min. Check your signal and that location is switched on.',
  });
  assert.equal(describeLocationStatus(null, false, NOW).state, 'none');
  assert.equal(describeLocationStatus(NOW, false, NOW).state, 'none');
});

test('the warning waits for the app\'s copy of the trip to catch up after coming back', () => {
  const old = NOW - 12 * MIN;
  // Just back, and still away: the copy is not to be believed yet
  assert.equal(describeLocationStatus(old, true, NOW, NOW - 5 * 1000).state, 'fresh');
  assert.equal(describeLocationStatus(old, true, NOW, Infinity).state, 'fresh');
  assert.equal(describeLocationStatus(old, true, NOW, NOW + 1000).state, 'fresh');
  // Long enough for it to catch up: a real silence is reported
  assert.equal(describeLocationStatus(old, true, NOW, NOW - RETURN_HOLD_MS).state, 'stale');
  // A fresh position, or none at all, says what it always says
  assert.equal(describeLocationStatus(NOW - 3 * MIN, true, NOW, NOW).text, 'Sharing your location, updated 3 min ago');
  assert.equal(describeLocationStatus(null, false, NOW, NOW).state, 'none');
});

test('quick choices suit city trips and long road journeys, and the default is one of them', () => {
  assert.deepEqual(ARRIVAL_PRESETS.map((p) => p.minutes), [15, 30, 60, 120]);
  assert.deepEqual(LONG_TRIP_PRESETS.map((p) => p.minutes), [240, 360, 480, 720]);
  assert.ok(ARRIVAL_PRESETS.some((p) => p.minutes === DEFAULT_TRIP_MINUTES));
  for (const preset of [...ARRIVAL_PRESETS, ...LONG_TRIP_PRESETS]) {
    assert.deepEqual(validateTripPlan({ ...valid, durationMinutes: preset.minutes }), {});
  }
});

test('contacts are texted at the start by default only for long journeys', () => {
  assert.equal(textContactsByDefault(15), false);
  assert.equal(textContactsByDefault(60), false);
  assert.equal(textContactsByDefault(120), true);
  assert.equal(textContactsByDefault(360), true);
});

test('names are joined the way people say them', () => {
  assert.equal(joinNames([]), '');
  assert.equal(joinNames(['Mum']), 'Mum');
  assert.equal(joinNames(['Mum', 'Tunde']), 'Mum and Tunde');
  assert.equal(joinNames(['Mum', 'Tunde', 'Ngozi']), 'Mum, Tunde and Ngozi');
});

test('initialsOf: letters that stand in for a photo', () => {
  assert.equal(initialsOf('Mum'), 'M');
  assert.equal(initialsOf('aunty ngozi'), 'AN');
  assert.equal(initialsOf('  Tunde   Bello  Adeyemi '), 'TB');
  assert.equal(initialsOf(''), '');
});

test('"More time…" takes any whole minute up to 12 hours, as much as the server takes', () => {
  assert.equal(MAX_EXTRA_MINUTES, MAX_EXTEND_MINUTES);
  assert.equal(readExtraMinutes(0, 20), 20);
  assert.equal(readExtraMinutes(0, 7), 7);
  assert.equal(readExtraMinutes(0, 1), 1);
  assert.equal(readExtraMinutes(2, 43), 163);
  assert.equal(readExtraMinutes(12, 0), 720);
  assert.equal(readExtraMinutes(0, 0), null);
  assert.equal(readExtraMinutes(12, 1), null);
  // Every minute the app offers, the server's backup route takes too
  assert.deepEqual(readTripAction({ action: 'extend', minutes: 7, requestId: 'press_12345678' }), { action: 'extend', minutes: 7, requestId: 'press_12345678' });
});
