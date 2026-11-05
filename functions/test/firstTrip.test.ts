import { test } from 'node:test';
import assert from 'node:assert/strict';
import { firstTripGuideSeen, firstTripStep, markFirstTripGuideSeen, testTripOutcome } from '../../src/lib/firstTrip';

const memory = () => {
  const kept = new Map<string, string>();
  return { getItem: (k: string) => kept.get(k) ?? null, setItem: (k: string, v: string) => { kept.set(k, v); } };
};

test('the guide is offered once on a phone, per account', () => {
  const store = memory();
  assert.equal(firstTripGuideSeen('ada', store), false);
  markFirstTripGuideSeen('ada', 'skipped', store);
  assert.equal(firstTripGuideSeen('ada', store), true);
  assert.equal(firstTripGuideSeen('tunde', store), false);
  assert.equal(firstTripGuideSeen('ada', null), false, 'with nothing to remember it in, it is offered');
});

test('a contact first, unless there is one or it was skipped', () => {
  assert.equal(firstTripStep(0, false), 'contact');
  assert.equal(firstTripStep(1, false), 'test');
  assert.equal(firstTripStep(0, true), 'test');
});

test('the guide says what a test trip left to run does', () => {
  assert.equal(testTripOutcome(['Mum']), "If you don't, Mum gets a text marked TEST, so they know what one looks like.");
  assert.equal(testTripOutcome(['Mum', 'Tunde']), "If you don't, your contacts get a text marked TEST, so they know what one looks like.");
  assert.equal(testTripOutcome([]), 'You have no contact yet, so nobody is texted.');
});
