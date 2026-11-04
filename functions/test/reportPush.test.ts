import { test } from 'node:test';
import assert from 'node:assert/strict';
import { knownState, NIGERIAN_STATES, reportPushText } from '../src/reportPush';
import { NIGERIAN_STATES as APP_STATES } from '../../src/lib/nigerianStates';

test("the server's states are the app's", () => {
  assert.deepEqual([...NIGERIAN_STATES], [...APP_STATES]);
});

test('the notification says only known words', () => {
  assert.deepEqual(reportPushText('accident', 'high', 1.234, 'Lagos'), {
    title: 'New accident report nearby',
    body: 'Serious accident reported 1.2 km away in Lagos',
  });
  assert.deepEqual(reportPushText('roadwork', 'medium', null, 'FCT'), {
    title: 'New construction report nearby',
    body: 'Construction reported near you in FCT',
  });
});

test("text the reporter typed never reaches anyone's phone", () => {
  // Security review, 4 November 2026
  const said = reportPushText('pothole', 'low', 2, 'Lagos. Account suspended, verify at example.shop');
  assert.equal(said?.body, 'Pothole reported 2.0 km away');
  assert.equal(knownState('lagos'), null, 'not as the app names it');
  assert.equal(knownState(42), null);
  assert.equal(reportPushText('Visit example.shop', 'high', 1, 'Lagos'), null, 'a kind of report the app does not have');
});
