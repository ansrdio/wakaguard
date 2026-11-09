import { test } from 'node:test';
import assert from 'node:assert/strict';
import { askedForNoTexts, canBeTexted, hasNumberAbroad, NIGERIAN_ONLY, readContactPhone } from '../../src/lib/contactPhone';
import { isValidE164 } from '../src/safetyDelivery';
import { isNigerianMobile } from '../src/sms';

// Numbers from other countries are ones set aside for fiction (US 555-01xx, UK 07700 900xxx)
const US = '+12025550123';
const UK = '+447700900123';

const number = (typed: string) => {
  const result = readContactPhone(typed);
  return result.ok ? result.phoneE164 : null;
};

test('canBeTexted: a contact with a Nigerian mobile number can be texted', () => {
  assert.equal(canBeTexted({ phoneE164: '+2348031234567' }), true);
  assert.equal(canBeTexted({ phoneE164: '+2347012345678' }), true);
  assert.equal(canBeTexted({ phoneE164: '+2349161234567' }), true);
});

test('canBeTexted: a contact with a number from another country cannot (texts are Nigerian only, 8 Nov 2026)', () => {
  assert.equal(canBeTexted({ phoneE164: US }), false);
  assert.equal(canBeTexted({ phoneE164: UK }), false);
});

test('canBeTexted: a contact saved without a full number cannot', () => {
  assert.equal(canBeTexted({}), false);
  assert.equal(canBeTexted({ phoneE164: null }), false);
  assert.equal(canBeTexted({ phoneE164: '' }), false);
  assert.equal(canBeTexted({ phoneE164: '(202)5550123' }), false);
  assert.equal(canBeTexted({ phoneE164: '08031234567' }), false);
  assert.equal(canBeTexted({ phoneE164: '+2341234567890' }), false, 'not a mobile number');
});

test('canBeTexted: agrees with the test the server applies before it texts someone', () => {
  for (const value of ['+2348031234567', US, UK, '+44', '2348031234567', '+0803123456', '', '+234803123456789012', '+2340000000001']) {
    assert.equal(canBeTexted({ phoneE164: value }), isValidE164(value) && isNigerianMobile(value), value);
  }
});

test('hasNumberAbroad: a number from another country, or one set aside when texts became Nigerian only', () => {
  assert.equal(hasNumberAbroad({ phoneE164: US }), true);
  assert.equal(hasNumberAbroad({ phoneE164: UK }), true);
  assert.equal(hasNumberAbroad({ phoneE164Abroad: US }), true);
  assert.equal(hasNumberAbroad({ phoneE164: '+2348031234567' }), false);
  assert.equal(hasNumberAbroad({ phoneE164: '08031234567' }), false, 'incomplete, not abroad');
  assert.equal(hasNumberAbroad({}), false);
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

test('readContactPhone: a number from another country is refused, saying why', () => {
  for (const typed of ['+1 (202) 555-0123', '+44 7700 900123', US]) {
    const result = readContactPhone(typed);
    assert.deepEqual(result, { ok: false, error: NIGERIAN_ONLY }, typed);
  }
  // Without a country code it is not guessed to be Nigerian either
  assert.equal(number('(202)5550123'), null);
  assert.equal(number('2025550123'), null);
});

test('readContactPhone: incomplete or empty numbers are refused with a reason', () => {
  for (const typed of ['', '   ', 'abc', '0803', '080312345', '080312345678', '+234803', '+', '01234567']) {
    const result = readContactPhone(typed);
    assert.equal(result.ok, false, typed);
    assert.ok(!result.ok && result.error.length > 0);
  }
});

test('readContactPhone: every number it accepts is one the server will text', () => {
  for (const typed of ['08031234567', '+234 803 123 4567', '2348031234567', '09161234567']) {
    const result = readContactPhone(typed);
    assert.ok(result.ok && isValidE164(result.phoneE164) && isNigerianMobile(result.phoneE164), typed);
  }
});

test('canBeTexted: a contact who asked for no more texts is not texted', () => {
  assert.equal(canBeTexted({ phoneE164: '+2348000000001', smsOptedOut: true }), false);
  assert.equal(askedForNoTexts({ smsOptedOut: true }), true);
  assert.equal(canBeTexted({ phoneE164: '+2348000000001', smsOptedOut: false }), true);
  assert.equal(askedForNoTexts({}), false);
});
