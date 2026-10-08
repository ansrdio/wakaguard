import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canBeTexted, readContactPhone } from '../../src/lib/contactPhone';
import { isValidE164 } from '../src/safetyDelivery';

const number = (typed: string) => {
  const result = readContactPhone(typed);
  return result.ok ? result.phoneE164 : null;
};

test('canBeTexted: a contact with a full international number can be texted', () => {
  assert.equal(canBeTexted({ phoneE164: '+2348031234567' }), true);
  assert.equal(canBeTexted({ phoneE164: '+12242454527' }), true);
});

test('canBeTexted: a contact saved without one cannot', () => {
  assert.equal(canBeTexted({}), false);
  assert.equal(canBeTexted({ phoneE164: null }), false);
  assert.equal(canBeTexted({ phoneE164: '' }), false);
  assert.equal(canBeTexted({ phoneE164: '(224)2454527' }), false);
  assert.equal(canBeTexted({ phoneE164: '08031234567' }), false);
});

test('canBeTexted: agrees with the test the server applies before it texts someone', () => {
  for (const value of ['+2348031234567', '+12242454527', '+44', '2348031234567', '+0803123456', '', '+234803123456789012']) {
    assert.equal(canBeTexted({ phoneE164: value }), isValidE164(value), value);
  }
});

test('readContactPhone: Nigerian mobile numbers in the ways people write them', () => {
  assert.equal(number('08031234567'), '+2348031234567');
  assert.equal(number('0803 123 4567'), '+2348031234567');
  assert.equal(number('0803-123-4567'), '+2348031234567');
  assert.equal(number('8031234567'), '+2348031234567');
  assert.equal(number('2348031234567'), '+2348031234567');
  assert.equal(number('+2348031234567'), '+2348031234567');
  assert.equal(number('+234 803 123 4567'), '+2348031234567');
  assert.equal(number('+234 0803 123 4567'), '+2348031234567');
  assert.equal(number('07012345678'), '+2347012345678');
  assert.equal(number('09161234567'), '+2349161234567');
});

test('readContactPhone: a number from another country needs its country code', () => {
  assert.equal(number('+1 (224) 245-4527'), '+12242454527');
  assert.equal(number('+44 7911 123456'), '+447911123456');
  // Without the code it is not guessed to be Nigerian
  assert.equal(number('(224)2454527'), null);
  assert.equal(number('2242454527'), null);
});

test('readContactPhone: incomplete or empty numbers are refused with a reason', () => {
  for (const typed of ['', '   ', 'abc', '0803', '080312345', '080312345678', '+234803', '+', '01234567']) {
    const result = readContactPhone(typed);
    assert.equal(result.ok, false, typed);
    assert.ok(!result.ok && result.error.length > 0);
  }
});

test('readContactPhone: every number it accepts is one the server will text', () => {
  for (const typed of ['08031234567', '+1 (224) 245-4527', '+44 7911 123456', '2348031234567']) {
    const result = readContactPhone(typed);
    assert.ok(result.ok && isValidE164(result.phoneE164), typed);
  }
});
