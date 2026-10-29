import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  FEELS_HOT_FROM, feelsLike, feelsLikeOfHour, ForecastHour, inServiceArea, keepWhatIsUsed, kindOfHour, readAhead, roughArea,
} from '../src/weather';

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

test('how hot it feels follows the US weather service heat index', () => {
  const fahrenheit = (c: number) => Math.round((c * 9) / 5 + 32);
  const celsius = (f: number) => ((f - 32) * 5) / 9;
  // Values from the published heat index table
  assert.equal(fahrenheit(feelsLike(celsius(90), 70)), 106);
  assert.equal(fahrenheit(feelsLike(celsius(86), 70)), 95);
  assert.equal(fahrenheit(feelsLike(celsius(100), 40)), 109);
  // Dry air never makes it count as cooler than the air
  assert.equal(Math.round(feelsLike(40, 10)), 40);
});

test('humid heat is worth a word even below 38°C', () => {
  const humid = (temperature: number, humidity: number): ForecastHour => ({
    time: at(0),
    data: { instant: { details: { air_temperature: temperature, relative_humidity: humidity } }, next_1_hours: { summary: { symbol_code: 'fair_day' } } },
  });
  assert.equal(kindOfHour(humid(33, 70)), 'heat', '33°C at 70% feels like about 43°C');
  assert.equal(kindOfHour(humid(31, 60)), null);
  assert.equal(kindOfHour(humid(36, 15)), null, 'dry 36°C stays below both limits');
  assert.equal(FEELS_HOT_FROM, 41);
  assert.equal(feelsLikeOfHour(hour(0)), null, 'no humidity, no feels-like');
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
  const withHumidity = { time: at(1), data: { instant: { details: { air_temperature: 31, relative_humidity: 74, dew_point_temperature: 26 } } } };
  assert.deepEqual(keepWhatIsUsed(withHumidity as ForecastHour).data?.instant, { details: { air_temperature: 31, relative_humidity: 74 } });
  const bare = keepWhatIsUsed({ time: at(1), data: {} });
  assert.equal(JSON.stringify(bare).includes('undefined'), false);
  assert.deepEqual(bare.data?.next_1_hours, { summary: {}, details: {} });
});

test('weather is only given for Nigeria and its borders', () => {
  for (const [lat, lng] of [[6.5, 3.4], [9.1, 7.5], [13.9, 14.7], [4.3, 8.3]]) assert.equal(inServiceArea({ lat, lng }), true, `${lat},${lng}`);
  for (const [lat, lng] of [[51.5, -0.1], [40.7, -74], [-1.3, 36.8], [5.6, -0.2]]) assert.equal(inServiceArea({ lat, lng }), false, `${lat},${lng}`);
});
