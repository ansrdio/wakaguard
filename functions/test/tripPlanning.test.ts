import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  describeLocationStatus,
  describeTimeLeft,
  formatClock,
  formatDuration,
  ARRIVAL_PRESETS,
  DEFAULT_TRIP_MINUTES,
  joinNames,
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
  assert.deepEqual(describeTimeLeft(NOW + 134 * MIN, NOW), { state: 'active', text: '2 h 14 min left' });
  assert.deepEqual(describeTimeLeft(NOW + 10 * MIN, NOW), { state: 'endingSoon', text: '10 min left' });
  assert.deepEqual(describeTimeLeft(NOW + 20 * 1000, NOW), { state: 'endingSoon', text: '1 min left' });
  assert.deepEqual(describeTimeLeft(NOW, NOW), { state: 'overdue', text: 'Arrival time reached' });
  assert.deepEqual(describeTimeLeft(NOW - 12 * MIN, NOW), { state: 'overdue', text: '12 min overdue' });
  assert.deepEqual(describeTimeLeft(NOW - 95 * MIN, NOW), { state: 'overdue', text: '1 h 35 min overdue' });
});

test('a complete plan is valid', () => {
  assert.deepEqual(validateTripPlan(valid), {});
});

test('each missing part of a plan gets its own message', () => {
  assert.equal(validateTripPlan({ ...valid, destination: ' ' }).destination, 'Enter where you are going');
  assert.match(validateTripPlan({ ...valid, destination: 'x'.repeat(41) }).destination!, /under 40/);
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
    text: 'No location sent for 12 min. Keep the app open.',
  });
  assert.equal(describeLocationStatus(null, false, NOW).state, 'none');
  assert.equal(describeLocationStatus(NOW, false, NOW).state, 'none');
});

test('quick choices suit city trips and the default is one of them', () => {
  assert.deepEqual(ARRIVAL_PRESETS.map((p) => p.minutes), [15, 30, 60, 120, 240]);
  assert.ok(ARRIVAL_PRESETS.some((p) => p.minutes === DEFAULT_TRIP_MINUTES));
  for (const preset of ARRIVAL_PRESETS) {
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
