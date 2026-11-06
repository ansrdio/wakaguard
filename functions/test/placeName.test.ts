import { test } from 'node:test';
import assert from 'node:assert/strict';
import { geocodeQuery, MAX_LOOKUPS_PER_HOUR, MAX_NAME_LENGTH, namesFromGoogle, nextLookup, readSpot } from '../src/placeNamePlan';
import { mayFillDestination, PLACE_NAME_CREDIT, readPlaceName } from '../../src/lib/destinationPoint';
import { readSpotState } from '../../src/lib/placeNameRead';
import { normalizeStateName } from '../../src/lib/nigerianStates';
import { MAX_DESTINATION_LENGTH } from '../../src/lib/tripPlanning';

/** A part of an address as Google's Geocoding API gives it */
const part = (name: string, ...types: string[]) => ({ long_name: name, short_name: name, types });
const answer = (...results: Array<{ types: string[]; address_components: unknown[] }>) => ({ status: 'OK', results });

// Shaped like Google's reverse geocoding answers for places tried on build 27
const OJOTA = answer(
  { types: ['plus_code'], address_components: [part('8F2Q+XG', 'plus_code')] },
  {
    types: ['street_address'],
    address_components: [
      part('12', 'street_number'), part('Ikorodu Road', 'route'), part('Ojota', 'neighborhood', 'political'),
      part('Kosofe', 'administrative_area_level_2', 'political'), part('Lagos', 'administrative_area_level_1', 'political'),
      { long_name: 'Nigeria', short_name: 'NG', types: ['country', 'political'] },
    ],
  },
  { types: ['locality', 'political'], address_components: [part('Lagos', 'locality', 'political')] },
);
const WUSE = answer({
  types: ['route'],
  address_components: [
    part('Blantyre Street', 'route'), part('Wuse II', 'sublocality_level_1', 'sublocality', 'political'),
    part('Abuja', 'locality', 'political'), part('Federal Capital Territory', 'administrative_area_level_1', 'political'),
    { long_name: 'Nigeria', short_name: 'NG', types: ['country', 'political'] },
  ],
});
const COUNTRYSIDE = answer({
  types: ['administrative_area_level_2', 'political'],
  address_components: [part('Ibadan North', 'administrative_area_level_2', 'political'), part('Oyo', 'administrative_area_level_1', 'political')],
});

test('a pin is named by its street, area and town, as long as the box allows', () => {
  assert.deepEqual(namesFromGoogle(OJOTA), { name: 'Ikorodu Road, Ojota, Lagos', state: 'Lagos', country: 'NG' });
  assert.equal(namesFromGoogle(WUSE)?.name, 'Blantyre Street, Wuse II, Abuja');
  assert.equal(MAX_NAME_LENGTH, MAX_DESTINATION_LENGTH);
});

test("Plus Code results are skipped, and Google's state names match the app's states", () => {
  assert.equal(namesFromGoogle(OJOTA)?.name?.includes('+'), false);
  assert.equal(normalizeStateName(namesFromGoogle(OJOTA)!.state!), 'Lagos');
  assert.equal(normalizeStateName(namesFromGoogle(WUSE)!.state!), 'FCT');
  assert.equal(normalizeStateName(namesFromGoogle(COUNTRYSIDE)!.state!), 'Oyo');
});

test('the state is added only when little else is known', () => {
  assert.equal(namesFromGoogle(COUNTRYSIDE)?.name, 'Ibadan North, Oyo');
});

test('a name never runs past the box, and a part that does not fit is left out', () => {
  const long = answer({
    types: ['route'],
    address_components: [part('Lagos-Abeokuta Expressway', 'route'), part('Abule Egba', 'neighborhood'), part('Lagos', 'locality')],
  });
  const name = namesFromGoogle(long)?.name;
  assert.ok(name && name.length <= MAX_NAME_LENGTH, String(name));
  assert.equal(name, 'Lagos-Abeokuta Expressway, Abule Egba');
});

test('marks over letters are dropped, so alert texts keep their length', () => {
  const marked = answer({ types: ['route'], address_components: [part('Ọjọta Road', 'route'), part('Ìbàdàn', 'locality')] });
  assert.equal(namesFromGoogle(marked)?.name, 'Ojota Road, Ibadan');
});

test('the same name is not repeated', () => {
  const twice = answer({ types: ['locality'], address_components: [part('Ikeja', 'neighborhood'), part('Ikeja', 'locality'), part('Lagos', 'administrative_area_level_1')] });
  assert.equal(namesFromGoogle(twice)?.name, 'Ikeja, Lagos');
});

test('nothing useful in the answer gives no name', () => {
  assert.equal(namesFromGoogle({ status: 'ZERO_RESULTS', results: [] }), null);
  assert.equal(namesFromGoogle({ status: 'REQUEST_DENIED' }), null);
  assert.deepEqual(namesFromGoogle({ status: 'OK', results: [] }), { name: null, state: null, country: null });
  assert.equal(namesFromGoogle(null), null);
  assert.equal(namesFromGoogle('Lagos'), null);
});

test('Google is asked for the spot alone, in English, as seen from Nigeria', () => {
  const url = new URL(geocodeQuery({ lat: 6.5869, lng: 3.3792 }, 'test-key'));
  assert.equal(url.origin + url.pathname, 'https://maps.googleapis.com/maps/api/geocode/json');
  assert.equal(url.searchParams.get('latlng'), '6.586900,3.379200');
  assert.equal(url.searchParams.get('language'), 'en');
  assert.equal(url.searchParams.get('region'), 'ng');
  assert.deepEqual([...url.searchParams.keys()].sort(), ['key', 'language', 'latlng', 'region']);
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

test('one person may look up a limited number of spots an hour', () => {
  let state: { startMs: number; count: number } | null = null;
  for (let i = 0; i < MAX_LOOKUPS_PER_HOUR; i++) {
    const next = nextLookup(state, 1000 + i);
    assert.equal(next.allowed, true);
    state = next;
  }
  assert.equal(nextLookup(state, 2000).allowed, false);
  assert.equal(nextLookup(state, 1000 + 60 * 60 * 1000).allowed, true);
});

test('the app takes a name only from a proper answer and never replaces what was typed', () => {
  assert.equal(readPlaceName({ name: 'Ikorodu Road, Ojota, Lagos', credit: 'Google Maps' }), 'Ikorodu Road, Ojota, Lagos');
  assert.equal(readPlaceName({ name: null }), null);
  assert.equal(readPlaceName({ name: 'x'.repeat(MAX_DESTINATION_LENGTH + 1) }), null);
  assert.equal(readPlaceName(null), null);
  assert.equal(PLACE_NAME_CREDIT, 'Google Maps');

  assert.equal(mayFillDestination('', null), true);
  assert.equal(mayFillDestination('   ', null), true);
  assert.equal(mayFillDestination('Benin City', null), false);
  // The last pin's own name may be replaced by the new pin's
  assert.equal(mayFillDestination('Ikorodu Road, Ojota, Lagos', 'Ikorodu Road, Ojota, Lagos'), true);
  assert.equal(mayFillDestination('Ikorodu Road, Ojota', 'Ikorodu Road, Ojota, Lagos'), false);
});

test("the app reads the state from the server's answer", () => {
  assert.deepEqual(readSpotState({ name: 'x', state: 'Lagos', country: 'NG' }), { state: 'Lagos', country: 'NG' });
  assert.equal(readSpotState({ state: null }), null);
  assert.equal(readSpotState(null), null);
});
