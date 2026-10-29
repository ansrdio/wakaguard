import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildWeatherPush, endOfLagosDay, lagosDay, morningMessage, WEATHER_CHANNEL_ID } from '../src/morningWeather';
import { readDay } from '../src/weather';

const HOUR = 60 * 60 * 1000;
// Mon 19 Oct 2026, 6:30 am in Nigeria
const MORNING = Date.UTC(2026, 9, 19, 5, 30);
const hour = (h: number, symbol: string, temperature = 29) => ({
  time: new Date(Date.UTC(2026, 9, 19, 5) + h * HOUR).toISOString(),
  data: { instant: { details: { air_temperature: temperature } }, next_1_hours: { summary: { symbol_code: symbol }, details: { precipitation_amount: 0.5 } } },
});

test('the Nigerian day and its 9 pm end', () => {
  assert.equal(lagosDay(MORNING), '2026-10-19');
  assert.equal(lagosDay(Date.UTC(2026, 9, 19, 23, 30)), '2026-10-20', 'half past midnight in Nigeria is the next day');
  assert.equal(endOfLagosDay(MORNING), Date.UTC(2026, 9, 19, 20));
});

test('the day is read up to 9 pm, the most serious thing first', () => {
  const series = [hour(0, 'cloudy'), hour(3, 'rain'), hour(9, 'rainandthunder'), hour(17, 'heavyrain')];
  const day = readDay(series, MORNING, endOfLagosDay(MORNING));
  assert.equal(day.kind, 'storm');
  assert.equal(day.startsAtMs, Date.UTC(2026, 9, 19, 14), 'the storm at 3 pm; the rain after 9 pm is not today');
  assert.equal(readDay([hour(0, 'cloudy'), hour(5, 'fair')], MORNING, endOfLagosDay(MORNING)).kind, null);
});

test('a notification only on a day worth one, in the approved style', () => {
  const storm = morningMessage({ kind: 'storm', startsAtMs: Date.UTC(2026, 9, 19, 14), hottest: 31 }, MORNING)!;
  assert.equal(storm.title, 'Thunderstorms expected today');
  assert.equal(storm.body, 'From about 3 pm where you are. If you can, travel before or after them.');
  assert.deepEqual(storm.data, { kind: 'weather', type: 'storm' });
  assert.match(morningMessage({ kind: 'rain', startsAtMs: MORNING, hottest: 30 }, MORNING)!.body, /^Starting soon where you are\./);
  assert.match(morningMessage({ kind: 'heat', startsAtMs: Date.UTC(2026, 9, 19, 12), hottest: 40 }, MORNING)!.body, /Up to 40°C/);
  assert.equal(morningMessage({ kind: null, startsAtMs: null, hottest: 30 }, MORNING), null);
});

test('a hot day says how hot it will feel, and when, with what to do', () => {
  const humid = morningMessage({
    kind: 'heat', startsAtMs: MORNING, hottest: 34, feelsLike: 43, hottestAtMs: Date.UTC(2026, 9, 19, 13),
  }, MORNING)!;
  assert.equal(humid.title, 'Very hot today');
  assert.equal(humid.body, 'It will feel like 43°C where you are around 2 pm. Carry water, wait in the shade, and travel before 11 am or after 4 pm if you can.');
  assert.equal(morningMessage({ kind: 'heat', startsAtMs: MORNING, hottest: 37, feelsLike: 47, hottestAtMs: MORNING }, MORNING)!.title, 'Dangerously hot today');
  // Dry heat, where it feels no hotter than the air, gives the temperature
  assert.match(morningMessage({ kind: 'heat', startsAtMs: MORNING, hottest: 41, feelsLike: 41, hottestAtMs: MORNING }, MORNING)!.body, /^Up to 41°C where you are\./);
});

test('the day is read for how hot it will feel at its hottest', () => {
  const humid = (h: number, temperature: number, humidity: number) => ({
    time: new Date(Date.UTC(2026, 9, 19, 5) + h * HOUR).toISOString(),
    data: { instant: { details: { air_temperature: temperature, relative_humidity: humidity } }, next_1_hours: { summary: { symbol_code: 'fair_day' } } },
  });
  const day = readDay([humid(1, 29, 80), humid(7, 33, 70), humid(9, 32, 60)], MORNING, endOfLagosDay(MORNING));
  assert.equal(day.kind, 'heat');
  assert.equal(day.hottest, 33);
  assert.equal(day.feelsLike, 43);
  assert.equal(day.hottestAtMs, Date.UTC(2026, 9, 19, 12), 'the hottest-feeling hour, 1 pm in Nigeria');
});

test('it goes out as an ordinary notification, never like a trip alert', () => {
  const push = buildWeatherPush({ fcmToken: 'token-1' }, { title: 't', body: 'b', data: { kind: 'weather' } }) as any;
  assert.equal(push.android.notification.channelId, WEATHER_CHANNEL_ID);
  assert.equal(push.android.priority, undefined);
  assert.equal(push.apns.payload.aps['interruption-level'], undefined);
  assert.equal(push.apns.payload.aps.category, undefined, 'no trip buttons');
});
