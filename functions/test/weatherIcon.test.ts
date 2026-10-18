import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readHours } from '../src/weather';
import { readWeatherAhead, weatherIcon } from '../../src/lib/weatherWords';

const HOUR = 60 * 60 * 1000;
const NOW = Date.UTC(2026, 9, 19, 12, 20);
const hour = (h: number, symbol: string, t: number) => ({
  time: new Date(Date.UTC(2026, 9, 19, 12) + h * HOUR).toISOString(),
  data: { instant: { details: { air_temperature: t } }, next_1_hours: { summary: { symbol_code: symbol } } },
});

test('the icon starts with the hour under way and shows up to six', () => {
  const series = [hour(-1, 'fair_day', 30), hour(0, 'cloudy', 29.6), hour(1, 'rain', 27.2), ...[2, 3, 4, 5, 6, 7].map((h) => hour(h, 'cloudy', 26))];
  const hours = readHours(series, NOW, 6);
  assert.equal(hours.length, 6);
  assert.deepEqual(hours[0], { atMs: Date.UTC(2026, 9, 19, 12), temperature: 30, symbol: 'cloudy' });
  assert.equal(hours[1].symbol, 'rain');
});

test('MET Norway symbols become pictures', () => {
  assert.equal(weatherIcon('clearsky_day'), 'clear-day');
  assert.equal(weatherIcon('clearsky_night'), 'clear-night');
  assert.equal(weatherIcon('partlycloudy_night'), 'partly-night');
  assert.equal(weatherIcon('fair_day'), 'partly-day');
  assert.equal(weatherIcon('cloudy'), 'cloudy');
  assert.equal(weatherIcon('lightrainshowers_day'), 'light-rain');
  assert.equal(weatherIcon('heavyrain'), 'rain');
  assert.equal(weatherIcon('rainshowers_day'), 'rain');
  assert.equal(weatherIcon('rainandthunder'), 'storm');
  assert.equal(weatherIcon('fog'), 'fog');
  assert.equal(weatherIcon(null), 'cloudy');
});

test('an answer from a server without the hours still reads, with none', () => {
  const old = readWeatherAhead({ kind: null, startsInHours: null, hottest: 30, hours: 3 });
  assert.deepEqual(old?.next, []);
  const fresh = readWeatherAhead({ kind: 'rain', startsInHours: 1, hottest: 30, hours: 6, next: [{ atMs: NOW, temperature: 29, symbol: 'rain' }, { atMs: 'x' }] });
  assert.deepEqual(fresh?.next, [{ atMs: NOW, temperature: 29, symbol: 'rain' }]);
});
