import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hoursToLookAhead, readWeatherAhead, roughly, weatherLine, WeatherAhead } from '../../src/lib/weatherWords';

const ahead = (over: Partial<WeatherAhead>): WeatherAhead => ({ kind: null, startsInHours: null, hottest: 31, hours: 3, ...over });

test('each kind of weather has its line, saying when', () => {
  assert.equal(weatherLine(ahead({ kind: 'storm', startsInHours: 0 }))?.text, 'Thunderstorms expected here in the next hour. If you can, wait until they pass.');
  assert.equal(weatherLine(ahead({ kind: 'heavy-rain', startsInHours: 2 }))?.text, 'Heavy rain expected here in about 2 hours. Allow extra time; low roads may flood.');
  assert.equal(weatherLine(ahead({ kind: 'rain', startsInHours: 1 }))?.text, 'Rain expected here in about an hour. Allow extra time.');
  assert.equal(weatherLine(ahead({ kind: 'fog', startsInHours: 0 }))?.text, 'Fog expected here in the next hour. Slow down and keep your lights on.');
  assert.equal(weatherLine(ahead({ kind: 'heat', startsInHours: 3, hottest: 39 }))?.text, 'Very hot here in about 3 hours (39°C). Carry water.');
  for (const kind of ['storm', 'heavy-rain', 'rain', 'fog', 'heat'] as const) assert.equal(weatherLine(ahead({ kind, startsInHours: 0 }))?.tone, 'warn');
});

test('nothing coming is said quietly', () => {
  assert.deepEqual(weatherLine(ahead({})), { tone: 'calm', kind: null, text: 'No rain expected here in the next 3 hours.' });
  assert.equal(weatherLine(ahead({ hours: 1 }))?.text, 'No rain expected here in the next hour.');
  assert.equal(weatherLine(null), null);
});

test('on an okada, wet roads get a word of their own', () => {
  assert.match(weatherLine(ahead({ kind: 'rain', startsInHours: 0 }), 'okada')!.text, /Okada is risky on wet roads\.$/);
  assert.doesNotMatch(weatherLine(ahead({ kind: 'rain', startsInHours: 0 }), 'car')!.text, /Okada/);
  assert.doesNotMatch(weatherLine(ahead({ kind: 'fog', startsInHours: 0 }), 'okada')!.text, /Okada/);
});

test('only a well-formed answer from the server is used', () => {
  assert.deepEqual(readWeatherAhead({ kind: 'rain', startsInHours: 1, hottest: 30, hours: 3, credit: 'x' }), { kind: 'rain', startsInHours: 1, hottest: 30, hours: 3 });
  assert.deepEqual(readWeatherAhead({ kind: null, startsInHours: null, hottest: null, hours: 2 }), { kind: null, startsInHours: null, hottest: null, hours: 2 });
  for (const bad of [null, 'rain', {}, { kind: 'hail', hours: 3 }, { kind: 'rain', hours: 0 }]) assert.equal(readWeatherAhead(bad), null);
});

test('the server is told a rough place, for as long as the trip runs', () => {
  assert.deepEqual(roughly(6.52437, 3.37921), { lat: 6.5, lng: 3.4 });
  assert.equal(hoursToLookAhead(30), 1);
  assert.equal(hoursToLookAhead(61), 2);
  assert.equal(hoursToLookAhead(20 * 60), 6);
  assert.equal(hoursToLookAhead(-5), 1);
  assert.equal(hoursToLookAhead(NaN), 3);
});
