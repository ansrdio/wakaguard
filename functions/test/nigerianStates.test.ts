import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeStateName } from '../../src/lib/nigerianStates';

test('normalizeStateName: plain names in any case', () => {
  assert.equal(normalizeStateName('Lagos'), 'Lagos');
  assert.equal(normalizeStateName('  oGuN '), 'Ogun');
  assert.equal(normalizeStateName('Cross River'), 'Cross River');
});

test('normalizeStateName: names as map services return them', () => {
  assert.equal(normalizeStateName('Lagos State'), 'Lagos');
  assert.equal(normalizeStateName('Akwa Ibom State'), 'Akwa Ibom');
  assert.equal(normalizeStateName('Cross  River   State'), 'Cross River');
  assert.equal(normalizeStateName('Niger State'), 'Niger');
  assert.equal(normalizeStateName('Federal Capital Territory'), 'FCT');
});

test('normalizeStateName: places outside the list', () => {
  assert.equal(normalizeStateName('Greater Accra Region'), null);
  assert.equal(normalizeStateName('State'), null);
  assert.equal(normalizeStateName(''), null);
});
