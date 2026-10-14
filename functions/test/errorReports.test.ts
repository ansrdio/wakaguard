import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildErrorReport, deviceFromUserAgent, describeFault, isNoise, MAX_MESSAGE, scrub } from '../../src/lib/errorReports';

const INFINIX = 'Mozilla/5.0 (Linux; Android 11; Infinix X688B Build/RP1A.200720.011; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0 Mobile Safari/537.36';
const SAMSUNG = 'Mozilla/5.0 (Linux; Android 14; SM-S156V) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36';
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148';
const DESKTOP = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

test('nothing that could identify a person or a place gets into a report', () => {
  assert.equal(scrub('Could not text ada@example.com'), 'Could not text <email>');
  assert.equal(scrub('Bad number +234 803 000 0001 and 08030000001'), 'Bad number <number> and <number>');
  assert.equal(scrub('Invalid LatLng object: (6.52437, 3.37921)'), 'Invalid LatLng object: (<number>, <number>)');
  assert.equal(scrub('fetch https://wakaguard.com/s?t=abc123&k=secret failed'), 'fetch https://wakaguard.com/s?<…> failed');
  assert.equal(scrub('token eyJhbGciOiJSUzI1NiIsImtpZCI6IjFlOTczZWUwZTE2ZjdlZWY0ZjkyMWQ1MGRj'), 'token <id>');
  assert.equal(scrub('No document trips/Kx3vB9qLm2Np7Rt4Ws1aZQ'), 'No document trips/<id>');
  assert.equal(scrub('near 6.52, 3.38'), 'near <number>, <number>');
});

test('ordinary fault text and stack positions are kept', () => {
  assert.equal(scrub("TypeError: Cannot read properties of undefined (reading 'lat')"), "TypeError: Cannot read properties of undefined (reading 'lat')");
  assert.equal(scrub('at MapController (chunks/src_components.js:7700:21)'), 'at MapController (chunks/src_components.js:7700:21)');
  assert.equal(scrub('at recursivelyTraversePassiveMountEffects'), 'at recursivelyTraversePassiveMountEffects');
  assert.equal(scrub('WakaGuard 1.2.0 build 23'), 'WakaGuard 1.2.0 build 23');
});

test('the kind of phone is read from the browser it runs in', () => {
  assert.equal(deviceFromUserAgent(INFINIX), 'Android 11 · Infinix X688B');
  assert.equal(deviceFromUserAgent(SAMSUNG), 'Android 14 · SM-S156V');
  assert.equal(deviceFromUserAgent(IPHONE), 'iPhone · iOS 18.0');
  assert.equal(deviceFromUserAgent(DESKTOP), 'Chrome · Mac OS X');
});

test('any thrown value can be described', () => {
  assert.deepEqual(describeFault(new RangeError('too far')).message, 'RangeError: too far');
  assert.deepEqual(describeFault('plain words'), { message: 'plain words', stack: '' });
  assert.deepEqual(describeFault({ code: 'unavailable' }), { message: '{"code":"unavailable"}', stack: '' });
  assert.deepEqual(describeFault(undefined).message, 'undefined');
});

test('noise is not reported, and a report is cut to size', () => {
  for (const message of ['Script error.', 'ResizeObserver loop completed with undelivered notifications.', 'AbortError: The user aborted a request.']) assert.equal(isNoise(message), true);
  assert.equal(buildErrorReport('Script error.', '/', 23, '1.2.0', 'android', SAMSUNG), null);
  assert.equal(buildErrorReport('', '/', 23, '1.2.0', 'android', SAMSUNG), null);
  const long = buildErrorReport(new Error('word '.repeat(200)), '/', 23, '1.2.0', 'android', SAMSUNG)!;
  assert.equal(long.message.length, MAX_MESSAGE);
  assert.deepEqual(Object.keys(long).sort(), ['build', 'device', 'message', 'platform', 'stack', 'version', 'where']);
});
