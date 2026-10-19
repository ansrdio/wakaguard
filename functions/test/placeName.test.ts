import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  LOOKUP_GAP_MS, MAX_LOOKUPS_PER_HOUR, MAX_NAME_LENGTH, nextLookup, placeNameFrom, readSpot, spotKey, waitForTurnMs,
} from '../src/placeNamePlan';
import { mayFillDestination, readPlaceName } from '../../src/lib/destinationPoint';
import { MAX_DESTINATION_LENGTH } from '../../src/lib/tripPlanning';

// Shaped like Nominatim's answers for the landmarks tried on 18 October 2026
const OJOTA = { name: '', address: { road: 'Ikorodu Road', suburb: 'Ojota', city: 'Ikeja', state: 'Lagos State' } };
const WUSE = { name: '', address: { road: 'Blantyre Street', suburb: 'Wuse II', city: 'Abuja', state: 'Federal Capital Territory' } };
const UCH = { name: '', address: { county: 'Ibadan North', state: 'Oyo State' } };

test('a pin is named by its street, area and town, as long as the box allows', () => {
  assert.equal(placeNameFrom(OJOTA), 'Ikorodu Road, Ojota, Ikeja');
  assert.equal(placeNameFrom(WUSE), 'Blantyre Street, Wuse II, Abuja');
  assert.equal(MAX_NAME_LENGTH, MAX_DESTINATION_LENGTH);
});

test('the state is added only when little else is known', () => {
  assert.equal(placeNameFrom(UCH), 'Ibadan North, Oyo State');
  assert.equal(placeNameFrom({ address: { state: 'Edo State' } }), 'Edo State');
});

test("a place's own name comes before the street", () => {
  assert.equal(
    placeNameFrom({ name: 'Ikeja City Mall', address: { road: 'Obafemi Awolowo Way', suburb: 'Alausa', city: 'Ikeja' } }),
    'Ikeja City Mall, Alausa, Ikeja'
  );
});

test('a name never runs past the box, and a part that does not fit is left out', () => {
  const name = placeNameFrom({ address: { road: 'Lagos-Abeokuta Expressway', suburb: 'Abule Egba', city: 'Lagos' } });
  assert.ok(name && name.length <= MAX_NAME_LENGTH, String(name));
  assert.equal(name, 'Lagos-Abeokuta Expressway, Abule Egba');
});

test('marks over letters are dropped, so alert texts keep their length', () => {
  assert.equal(placeNameFrom({ address: { road: 'Ọjọta Road', city: 'Ìbàdàn' } }), 'Ojota Road, Ibadan');
});

test('nothing useful in the answer gives no name', () => {
  assert.equal(placeNameFrom({ error: 'Unable to geocode' }), null);
  assert.equal(placeNameFrom({}), null);
  assert.equal(placeNameFrom(null), null);
  assert.equal(placeNameFrom('Lagos'), null);
});

test('the same name is not repeated', () => {
  assert.equal(placeNameFrom({ address: { suburb: 'Ikeja', city: 'Ikeja', state: 'Lagos State' } }), 'Ikeja, Lagos State');
});

test('any real spot is looked up, across a border too', () => {
  assert.deepEqual(readSpot({ lat: 6.587, lng: 3.379 }), { lat: 6.587, lng: 3.379 });
  assert.deepEqual(readSpot({ lat: 33.4, lng: -112.0 }), { lat: 33.4, lng: -112.0 });
  assert.equal(readSpot({ lat: 91, lng: 3.3 }), null);
  assert.equal(readSpot({ lat: 6.5, lng: 181 }), null);
  assert.equal(readSpot({ lat: '6.5', lng: 3.3 }), null);
  assert.equal(readSpot({ lat: NaN, lng: 3.3 }), null);
  assert.equal(readSpot(null), null);
});

test('pins a few metres apart share a name', () => {
  assert.equal(spotKey({ lat: 6.58701, lng: 3.37902 }), spotKey({ lat: 6.58703, lng: 3.37898 }));
  assert.notEqual(spotKey({ lat: 6.587, lng: 3.379 }), spotKey({ lat: 6.588, lng: 3.379 }));
});

test('one person may name a limited number of pins an hour', () => {
  let state: { startMs: number; count: number } | null = null;
  for (let i = 0; i < MAX_LOOKUPS_PER_HOUR; i++) {
    const next = nextLookup(state, 1000 + i);
    assert.equal(next.allowed, true);
    state = next;
  }
  assert.equal(nextLookup(state, 2000).allowed, false);
  assert.equal(nextLookup(state, 1000 + 60 * 60 * 1000).allowed, true);
});

test('look-ups to OpenStreetMap wait their turn, about one a second for the whole app', () => {
  assert.equal(waitForTurnMs(null, 5000), 0);
  assert.equal(waitForTurnMs(5000, 5000 + LOOKUP_GAP_MS), 0);
  assert.equal(waitForTurnMs(5000, 5400), LOOKUP_GAP_MS - 400);
  // A clock that went back never blocks for ever
  assert.equal(waitForTurnMs(9000, 5000), 0);
});

test("the app takes a name only from a proper answer and never replaces what was typed", () => {
  assert.equal(readPlaceName({ name: 'Ikorodu Road, Ojota, Ikeja', credit: 'x' }), 'Ikorodu Road, Ojota, Ikeja');
  assert.equal(readPlaceName({ name: null }), null);
  assert.equal(readPlaceName({ name: 'x'.repeat(MAX_DESTINATION_LENGTH + 1) }), null);
  assert.equal(readPlaceName(null), null);

  assert.equal(mayFillDestination('', null), true);
  assert.equal(mayFillDestination('   ', null), true);
  assert.equal(mayFillDestination('Benin City', null), false);
  // The last pin's own name may be replaced by the new pin's
  assert.equal(mayFillDestination('Ikorodu Road, Ojota, Ikeja', 'Ikorodu Road, Ojota, Ikeja'), true);
  assert.equal(mayFillDestination('Ikorodu Road, Ojota', 'Ikorodu Road, Ojota, Ikeja'), false);
});
