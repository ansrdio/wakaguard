import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  autocompleteBody, MAX_PLACES_PER_HOUR, MAX_SUGGESTS_PER_HOUR, nextTry, NIGERIA_BOX, PLACE_FIELDS, placeFrom,
  plainName, readRequest, suggestionsFrom,
} from '../src/placeSearchPlan';
import { newSearchSession, readFoundPlace, readSuggestions, searchable } from '../../src/lib/placeSearchRules';

const SESSION = '3f1c2a7e-9b4d-4c1e-8f2a-1b2c3d4e5f60';

test('a suggestion request is checked: words of a sensible length, a session, and the area rounded to about a km', () => {
  assert.deepEqual(readRequest({ kind: 'suggest', text: '  ikeja   city mall ', session: SESSION, near: { lat: 6.601234, lng: 3.351567 } }), {
    kind: 'suggest', text: 'ikeja city mall', session: SESSION, near: { lat: 6.6, lng: 3.35 },
  });
  assert.equal(readRequest({ kind: 'suggest', text: 'ik', session: SESSION }), null);
  assert.equal(readRequest({ kind: 'suggest', text: 'x'.repeat(81), session: SESSION }), null);
  assert.equal(readRequest({ kind: 'suggest', text: 'ikeja', session: 'short' }), null);
  assert.equal(readRequest({ kind: 'suggest', text: 'ikeja', session: SESSION, near: { lat: 'x' } })?.kind, 'suggest');
  assert.equal(readRequest({ kind: 'delete', session: SESSION }), null);
  assert.equal(readRequest(null), null);
});

test('a place request needs a place id and keeps the suggested name, in plain letters', () => {
  assert.deepEqual(readRequest({ kind: 'place', placeId: 'ChIJ_abc123XYZ', session: SESSION, name: 'Ọjọta Bus Park' }), {
    kind: 'place', placeId: 'ChIJ_abc123XYZ', session: SESSION, name: 'Ojota Bus Park',
  });
  assert.equal(readRequest({ kind: 'place', placeId: 'bad id!', session: SESSION, name: 'x' }), null);
});

test('Autocomplete is asked in English for Nigeria, near the area when known, else anywhere in Nigeria first', () => {
  const near = autocompleteBody('yaba', SESSION, { lat: 6.51, lng: 3.37 });
  assert.equal(near.input, 'yaba');
  assert.equal(near.sessionToken, SESSION);
  assert.equal(near.languageCode, 'en');
  assert.equal(near.regionCode, 'ng');
  assert.deepEqual(near.locationBias, { circle: { center: { latitude: 6.51, longitude: 3.37 }, radius: 50000 } });
  assert.deepEqual(autocompleteBody('yaba', SESSION, null).locationBias, { rectangle: NIGERIA_BOX });
  // Nothing that could say who is asking
  assert.deepEqual(Object.keys(near).sort(), ['input', 'languageCode', 'locationBias', 'regionCode', 'sessionToken']);
});

test("the place look-up asks only for Google's cheapest fields: id, address and spot", () => {
  assert.equal(PLACE_FIELDS, 'id,formattedAddress,location');
});

test('suggestions are read from Google, at most five, with names a text can carry', () => {
  const answer = {
    suggestions: [
      { placePrediction: { placeId: 'ChIJ_mall_0001', structuredFormat: { mainText: { text: 'Ikeja City Mall' }, secondaryText: { text: 'Obafemi Awolowo Way, Ikeja' } } } },
      { queryPrediction: { text: { text: 'ikeja city mall cinema' } } },
      { placePrediction: { placeId: 'bad id', structuredFormat: { mainText: { text: 'Bad' } } } },
      { placePrediction: { placeId: 'ChIJ_ojota_002', structuredFormat: { mainText: { text: 'Ọjọta Motor Park' } } } },
      ...Array.from({ length: 6 }, (_, i) => ({ placePrediction: { placeId: `ChIJ_more_${i}000`, structuredFormat: { mainText: { text: `Place ${i}` } } } })),
    ],
  };
  const found = suggestionsFrom(answer);
  assert.equal(found.length, 5);
  assert.deepEqual(found[0], { placeId: 'ChIJ_mall_0001', name: 'Ikeja City Mall', detail: 'Obafemi Awolowo Way, Ikeja' });
  assert.deepEqual(found[1], { placeId: 'ChIJ_ojota_002', name: 'Ojota Motor Park', detail: '' });
  assert.deepEqual(suggestionsFrom({}), []);
  assert.deepEqual(suggestionsFrom(null), []);
});

test('a long name is cut at a word to fit a text', () => {
  const name = plainName('Lagos State University Teaching Hospital, Ikeja Main Gate');
  assert.ok(name.length <= 40);
  assert.equal(name, 'Lagos State University Teaching');
});

test("the chosen place comes back with the suggested name and Google's spot", () => {
  const answer = { id: 'ChIJ_mall_0001', formattedAddress: '194 Obafemi Awolowo Way, Ikeja', location: { latitude: 6.6135, longitude: 3.3584 } };
  assert.deepEqual(placeFrom(answer, 'Ikeja City Mall'), {
    placeId: 'ChIJ_mall_0001', name: 'Ikeja City Mall', address: '194 Obafemi Awolowo Way, Ikeja', lat: 6.6135, lng: 3.3584,
  });
  assert.equal(placeFrom({ id: 'x' }, 'Ikeja City Mall'), null);
  assert.equal(placeFrom({ location: { latitude: 99, longitude: 3 } }, 'Ikeja City Mall'), null);
  // No name was sent: the address stands in
  assert.equal(placeFrom(answer, '')?.name, '194 Obafemi Awolowo Way, Ikeja');
});

test('each person has an hourly limit, counted afresh each hour', () => {
  let state: { startMs: number; count: number } | null = null;
  for (let i = 0; i < MAX_PLACES_PER_HOUR; i++) {
    const next = nextTry(state, 1000 + i, MAX_PLACES_PER_HOUR);
    assert.equal(next.allowed, true);
    state = next;
  }
  assert.equal(nextTry(state, 2000, MAX_PLACES_PER_HOUR).allowed, false);
  assert.equal(nextTry(state, 1000 + 60 * 60 * 1000, MAX_PLACES_PER_HOUR).allowed, true);
  assert.ok(MAX_SUGGESTS_PER_HOUR > MAX_PLACES_PER_HOUR);
});

test('the app: only sensible words are searched, sessions are fresh, and answers are checked', () => {
  assert.equal(searchable('ik'), false);
  assert.equal(searchable(' ikeja '), true);
  assert.equal(searchable('x'.repeat(81)), false);
  const a = newSearchSession();
  assert.match(a, /^[A-Za-z0-9-]{16,64}$/);
  assert.notEqual(a, newSearchSession());

  assert.deepEqual(readSuggestions({ suggestions: [{ placeId: 'p1', name: 'Yaba Market', detail: 'Yaba' }, { name: 'x' }, null] }), [
    { placeId: 'p1', name: 'Yaba Market', detail: 'Yaba' },
  ]);
  assert.deepEqual(readSuggestions({ suggestions: 'no' }), []);
  assert.deepEqual(readFoundPlace({ place: { name: 'Yaba Market', address: 'Yaba', lat: 6.5095123, lng: 3.3711456 } }), {
    name: 'Yaba Market', address: 'Yaba', lat: 6.50951, lng: 3.37115,
  });
  assert.equal(readFoundPlace({ place: null, reason: 'too_many' }), null);
});
