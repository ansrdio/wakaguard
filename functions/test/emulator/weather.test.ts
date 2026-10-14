/**
 * Keeping and renewing MET Norway's forecast, against the Firestore emulator.
 * MET Norway itself is stood in for: no request leaves this machine.
 * Run with: npm run test:monitor
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import * as admin from 'firebase-admin';
import '../../src/index';
import { forecastFor, roughArea } from '../../src/weather';

const HOUR = 60 * 60 * 1000;
const realFetch = globalThis.fetch;
const asked: { url: string; headers: Record<string, string> }[] = [];
let answer: () => Response = () => new Response('{}', { status: 500 });

before(() => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'Firestore emulator must be running');
  globalThis.fetch = (async (url: string, init?: { headers?: Record<string, string> }) => {
    asked.push({ url: String(url), headers: init?.headers ?? {} });
    return answer();
  }) as typeof fetch;
});
after(() => {
  globalThis.fetch = realFetch;
});

const forecast = (startMs: number, symbol: string) => JSON.stringify({
  properties: {
    timeseries: [0, 1, 30].map((h) => ({
      time: new Date(startMs + h * HOUR).toISOString(),
      data: { instant: { details: { air_temperature: 29 } }, next_1_hours: { summary: { symbol_code: symbol }, details: { precipitation_amount: 1 } } },
    })),
  },
});

test('a forecast is kept until it expires, then asked for again politely', async () => {
  const area = roughArea(9.06 + Math.random() / 1000, 7.49)!;
  await admin.firestore().doc(`weatherForecasts/${area.key}`).delete();
  const now = Date.UTC(2026, 9, 14, 12);
  asked.length = 0;
  answer = () => new Response(forecast(now, 'rain'), {
    status: 200,
    headers: { expires: new Date(now + HOUR / 2).toUTCString(), 'last-modified': 'Tue, 14 Oct 2026 11:45:00 GMT' },
  });

  const first = await forecastFor(area, now);
  assert.equal(first.length, 2, 'only the next day is kept');
  assert.equal(asked.length, 1);
  assert.match(asked[0].url, /lat=9\.1&lon=7\.5$/);
  assert.match(asked[0].headers['User-Agent'], /^WakaGuard\/\S+ https:\/\/wakaguard\.com$/);

  await forecastFor(area, now + 10 * 60 * 1000);
  assert.equal(asked.length, 1, 'not asked again before it expires');

  answer = () => new Response(null, { status: 304, headers: { expires: new Date(now + 2 * HOUR).toUTCString() } });
  const renewed = await forecastFor(area, now + HOUR);
  assert.equal(asked.length, 2);
  assert.equal(asked[1].headers['If-Modified-Since'], 'Tue, 14 Oct 2026 11:45:00 GMT');
  assert.deepEqual(renewed, first, 'an unchanged forecast is kept');
  await forecastFor(area, now + HOUR + 60 * 1000);
  assert.equal(asked.length, 2, 'the new expiry time is respected');
});

test('when MET Norway cannot be reached, a recent forecast still serves, an old one does not', async () => {
  const area = roughArea(4.95 + Math.random() / 1000, 8.32)!;
  await admin.firestore().doc(`weatherForecasts/${area.key}`).delete();
  const now = Date.UTC(2026, 9, 14, 12);
  answer = () => new Response(forecast(now, 'fog'), { status: 200, headers: { expires: new Date(now + HOUR / 2).toUTCString() } });
  await forecastFor(area, now);

  answer = () => { throw new Error('no network'); };
  assert.equal((await forecastFor(area, now + 2 * HOUR)).length, 2);
  await assert.rejects(forecastFor(area, now + 7 * HOUR));
});
