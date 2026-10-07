import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CURRENT_POSITION_MAX_AGE_MS, currentPosition } from '../../src/lib/recentPosition';

const NOW = Date.UTC(2026, 9, 7, 12, 0, 0);
const fix = (ageMs: number) => ({ lat: 6.6, lng: 3.35, atMs: NOW - ageMs });

test('currentPosition: a recent fix is sent as the current location', () => {
  assert.deepEqual(currentPosition(fix(0), NOW), { lat: 6.6, lng: 3.35 });
  assert.deepEqual(currentPosition(fix(90 * 1000), NOW), { lat: 6.6, lng: 3.35 });
  assert.deepEqual(currentPosition(fix(CURRENT_POSITION_MAX_AGE_MS), NOW), { lat: 6.6, lng: 3.35 });
});

test('currentPosition: an old fix is not passed off as current', () => {
  assert.equal(currentPosition(fix(CURRENT_POSITION_MAX_AGE_MS + 1), NOW), null);
  assert.equal(currentPosition(fix(60 * 60 * 1000), NOW), null);
});

test('currentPosition: nothing to send', () => {
  assert.equal(currentPosition(null, NOW), null);
  assert.equal(currentPosition({ lat: Number.NaN, lng: 3.35, atMs: NOW }, NOW), null);
});

test('currentPosition: a fix stamped slightly ahead of the clock still counts', () => {
  assert.deepEqual(currentPosition(fix(-2000), NOW), { lat: 6.6, lng: 3.35 });
});

test('the limit matches the one the server applies to a trip position', async () => {
  const { readFileSync } = await import('node:fs');
  const server = readFileSync(new URL('../src/tripMonitor.ts', import.meta.url), 'utf8');
  const match = server.match(/const LIVE_LOCATION_MS = (\d+) \* 60 \* 1000;/);
  assert.ok(match, 'LIVE_LOCATION_MS is declared as minutes in tripMonitor.ts');
  assert.equal(Number(match![1]) * 60 * 1000, CURRENT_POSITION_MAX_AGE_MS);
});
