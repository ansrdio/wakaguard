import { test } from 'node:test';
import assert from 'node:assert/strict';
import { expiryFor, MAX_EXTEND_MINUTES, planTripAction, readTripAction } from '../src/tripActionPlan';
import { tripExpiryMs } from '../../src/lib/tripPlanning';

const MIN = 60 * 1000;
const NOW = Date.UTC(2026, 9, 18, 12, 0);

test('only "end", and "extend" with whole minutes and a press id, are accepted', () => {
  assert.deepEqual(readTripAction({ action: 'end' }), { action: 'end' });
  assert.deepEqual(readTripAction({ action: 'extend', minutes: 15, requestId: 'press_abc123' }), { action: 'extend', minutes: 15, requestId: 'press_abc123' });
  for (const bad of [
    {}, { action: 'cancel' }, { action: 'extend', minutes: 15 }, { action: 'extend', minutes: 0, requestId: 'press_abc123' },
    { action: 'extend', minutes: 2.5, requestId: 'press_abc123' }, { action: 'extend', minutes: MAX_EXTEND_MINUTES + 1, requestId: 'press_abc123' },
    { action: 'extend', minutes: 15, requestId: 'short' }, { action: 'extend', minutes: 15, requestId: 'has spaces in it' },
  ]) assert.equal(readTripAction(bad), null, JSON.stringify(bad));
});

test('a running trip ends; an ended one is left alone', () => {
  assert.deepEqual(planTripAction({ status: 'active' }, { action: 'end' }, NOW), { kind: 'end' });
  assert.deepEqual(planTripAction({ status: 'emergency' }, { action: 'end' }, NOW), { kind: 'end' });
  for (const status of ['completed', 'cancelled']) assert.deepEqual(planTripAction({ status }, { action: 'end' }, NOW), { kind: 'already' });
});

test('time is added from the arrival time, or from now once it has passed, as the app does', () => {
  const ahead = planTripAction({ status: 'active', startMs: NOW - 30 * MIN, endsAtMs: NOW + 10 * MIN }, { action: 'extend', minutes: 15, requestId: 'press_abc123' }, NOW);
  assert.equal(ahead.kind, 'extend');
  if (ahead.kind === 'extend') assert.equal(ahead.endsAtMs, NOW + 25 * MIN);

  const late = planTripAction({ status: 'active', startMs: NOW - 60 * MIN, endsAtMs: NOW - 20 * MIN }, { action: 'extend', minutes: 15, requestId: 'press_abc123' }, NOW);
  if (late.kind === 'extend') assert.equal(late.endsAtMs, NOW + 15 * MIN);
  else assert.fail('expected extend');
});

test('the same press is never added twice, and an ended trip gets no extra time', () => {
  const trip = { status: 'active', startMs: NOW, endsAtMs: NOW + 30 * MIN, lastExtendRequestId: 'press_abc123' };
  assert.deepEqual(planTripAction(trip, { action: 'extend', minutes: 15, requestId: 'press_abc123' }, NOW), { kind: 'already' });
  assert.equal(planTripAction(trip, { action: 'extend', minutes: 15, requestId: 'press_def456' }, NOW).kind, 'extend');
  assert.deepEqual(planTripAction({ status: 'completed' }, { action: 'extend', minutes: 15, requestId: 'press_def456' }, NOW), { kind: 'ended' });
});

test('the link stays readable by the same rule as the app', () => {
  for (const [start, ends] of [[NOW, NOW + 30 * MIN], [NOW, NOW + 20 * 60 * MIN], [NOW - 23 * 60 * MIN, NOW + 5 * MIN]]) {
    assert.equal(expiryFor(start, ends), tripExpiryMs(start, ends));
  }
  const plan = planTripAction({ status: 'active', startMs: NOW, endsAtMs: NOW + 30 * MIN, expiresAtMs: NOW + 48 * 60 * MIN }, { action: 'extend', minutes: 15, requestId: 'press_abc123' }, NOW);
  if (plan.kind === 'extend') assert.equal(plan.expiresAtMs, NOW + 48 * 60 * MIN, 'never brought forward');
});
