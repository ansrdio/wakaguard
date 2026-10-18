import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FAR_AWAY_KM, isPostedFarAway } from '../../src/lib/reportDistance';
import { TRAVEL_MODES, tipsHeading } from '../../src/lib/travelMode';
import { readAppConfig } from '../../src/lib/appConfig';

test('a report pinned more than 30 km from the phone is marked; unknown is not', () => {
  assert.equal(FAR_AWAY_KM, 30);
  const ikeja = { lat: 6.6018, lng: 3.3515 };
  assert.equal(isPostedFarAway(ikeja, { lat: 6.45, lng: 3.39 }), false, 'across Lagos');
  assert.equal(isPostedFarAway(ikeja, { lat: 7.38, lng: 3.95 }), true, 'Ibadan');
  assert.equal(isPostedFarAway(null, { lat: 7.38, lng: 3.95 }), null);
});

test('the safety tips heading reads as English for every way of travelling', () => {
  for (const mode of TRAVEL_MODES) assert.doesNotMatch(tipsHeading(mode.id), /^For (other|on foot)/);
  assert.equal(tipsHeading('okada'), 'On an okada');
  assert.equal(tipsHeading('other'), 'For the way you travel');
  assert.equal(tipsHeading(null), 'For the way you travel');
});

test('directions stay hidden unless the server switch says otherwise', () => {
  assert.equal(readAppConfig({}).directions, false);
  assert.equal(readAppConfig({ directions: true }).directions, true);
  assert.equal(readAppConfig({ directions: 'yes' }).directions, false);
});
