import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ForecastHour, inServiceArea, keepWhatIsUsed, kindOfHour, readAhead, roughArea } from '../src/weather';

const NOW = Date.UTC(2026, 9, 14, 12, 20);
const HOUR = 60 * 60 * 1000;
const at = (hoursFromNoon: number) => new Date(Date.UTC(2026, 9, 14, 12) + hoursFromNoon * HOUR).toISOString();
const hour = (hoursFromNoon: number, symbol = 'partlycloudy_day', rain = 0, temperature = 30): ForecastHour => ({
  time: at(hoursFromNoon),
  data: { instant: { details: { air_temperature: temperature } }, next_1_hours: { summary: { symbol_code: symbol }, details: { precipitation_amount: rain } } },
});

test('the server is only ever told a rough area, about 11 km across', () => {
  assert.deepEqual(roughArea(6.52437, 3.37921), { lat: 6.5, lng: 3.4, key: '6.5_3.4' });
  assert.deepEqual(roughArea(-0.04, 0.04), { lat: 0, lng: 0, key: '0.0_0.0' });
  for (const bad of [[null, 3], [6, '3'], [NaN, 3], [91, 3], [6, 181]]) assert.equal(roughArea(bad[0], bad[1]), null);
});

test('each hour is read for the one thing worth saying', () => {
  assert.equal(kindOfHour(hour(0, 'heavyrainandthunder', 9)), 'storm');
  assert.equal(kindOfHour(hour(0, 'heavyrain', 2)), 'heavy-rain');
  assert.equal(kindOfHour(hour(0, 'rain', 5)), 'heavy-rain');
  assert.equal(kindOfHour(hour(0, 'lightrainshowers_day', 0.2)), 'rain');
  assert.equal(kindOfHour(hour(0, 'fog')), 'fog');
  assert.equal(kindOfHour(hour(0, 'clearsky_day', 0, 39)), 'heat');
  assert.equal(kindOfHour(hour(0, 'clearsky_day', 0, 35)), null);
  assert.equal(kindOfHour({}), null);
});

test('the most serious thing in the hours ahead is chosen, with when it starts', () => {
  const series = [hour(-2, 'heavyrain'), hour(0), hour(1, 'rain'), hour(2, 'rainandthunder'), hour(5, 'heavyrain')];
  assert.deepEqual(readAhead(series, NOW, 3), { kind: 'storm', startsInHours: 1, hottest: 30, hours: 3 });
  // A trip of an hour and a half is read for two hours, which reaches the storm
  assert.deepEqual(readAhead(series, NOW, 1.5), { kind: 'storm', startsInHours: 1, hottest: 30, hours: 2 });
  // The storm is past the end of a one-hour trip; only the rain is in it
  assert.deepEqual(readAhead(series, NOW, 1), { kind: 'rain', startsInHours: 0, hottest: 30, hours: 1 });
});

test('the hour already under way still counts, and nothing coming says so', () => {
  assert.equal(readAhead([hour(0, 'rain')], NOW, 2).startsInHours, 0);
  assert.deepEqual(readAhead([hour(0), hour(1), hour(2)], NOW, 3), { kind: null, startsInHours: null, hottest: 30, hours: 3 });
});

test('it never looks further ahead than six hours, nor less than one', () => {
  assert.equal(readAhead([hour(7, 'rain')], NOW, 12).kind, null);
  assert.equal(readAhead([], NOW, 12).hours, 6);
  assert.equal(readAhead([], NOW, 0).hours, 1);
});

test('the forecast is kept with only what is used, and nothing empty', () => {
  const full = { time: at(1), data: { instant: { details: { air_temperature: 31, wind_speed: 3 } }, next_1_hours: { summary: { symbol_code: 'rain' }, details: { precipitation_amount: 1.2 } }, next_6_hours: {} } };
  assert.deepEqual(keepWhatIsUsed(full as ForecastHour), hour(1, 'rain', 1.2, 31));
  const bare = keepWhatIsUsed({ time: at(1), data: {} });
  assert.equal(JSON.stringify(bare).includes('undefined'), false);
  assert.deepEqual(bare.data?.next_1_hours, { summary: {}, details: {} });
});

test('weather is only given for Nigeria and its borders', () => {
  for (const [lat, lng] of [[6.5, 3.4], [9.1, 7.5], [13.9, 14.7], [4.3, 8.3]]) assert.equal(inServiceArea({ lat, lng }), true, `${lat},${lng}`);
  for (const [lat, lng] of [[51.5, -0.1], [40.7, -74], [-1.3, 36.8], [5.6, -0.2]]) assert.equal(inServiceArea({ lat, lng }), false, `${lat},${lng}`);
});
