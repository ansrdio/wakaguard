import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countSmsSegments, isGsm7, sanitizeForSms, sanitizeName, sanitizePlace, toGsm7 } from '../src/smsText';
import {
  buildAllClearMessage,
  buildCheckinMessage,
  buildMapsLink,
  buildOverdueMessage,
  buildSosMessage,
  buildTripShareMessage,
} from '../src/templates';

const DEADLINE = Date.UTC(2026, 9, 6, 15, 30);
const TOKEN = 'Zk3_9aQbT-1xYp0LmN4rSw'; // 22 characters, as the app generates

test('names keep letters and lose links, phone numbers and odd punctuation', () => {
  assert.equal(sanitizeName('Ada Obi'), 'Ada Obi');
  assert.equal(sanitizeName("  Chi-Chi   O'Neil "), "Chi-Chi O'Neil");
  assert.equal(sanitizeName('Your bank is blocked visit http://evil.example/x now'), 'Your bank is blocked visit now');
  assert.equal(sanitizeName('call 0803 123 4567 urgently'), 'call urgently');
  assert.equal(sanitizeName('win at bit.ly/free'), 'win at');
  assert.equal(sanitizeName('A: "quoted" <b>'), 'A quoted b');
  assert.equal(sanitizeName('x'.repeat(80)).length, 30);
  assert.equal(sanitizeName(undefined), '');
  assert.equal(sanitizeName({ toString: () => 'x' }), '');
});

test('accents and tone marks are flattened so the message stays in the cheap alphabet', () => {
  // é is part of the SMS alphabet and is kept in free text; names are flattened fully
  assert.equal(toGsm7('Adébáyọ̀ Ṣọlá'), 'Adébayo Sola');
  assert.equal(sanitizeName('Adébáyọ̀ Ṣọlá'), 'Adebayo Sola');
  assert.equal(sanitizePlace('Ìbàdàn, Ọ̀yọ́'), 'Ibadan, Oyo');
  assert.equal(toGsm7('“quote” ‘x’ a—b…'), '"quote" \'x\' a-b...');
  assert.equal(toGsm7('ok 👍 fine'), 'ok  fine');
  assert.ok(isGsm7(sanitizeName('Adébáyọ̀ 👍')));
});

test('place labels and free text are single line and capped', () => {
  assert.equal(sanitizePlace('Benin City\n(Ring Road)'), 'Benin City (Ring Road)');
  assert.equal(sanitizePlace('Go to www.evil.example/pay'), 'Go to');
  assert.equal(sanitizeForSms('line1\r\nline2\tend', { maxLength: 50 }), 'line1 line2 end');
  assert.equal(sanitizeForSms('a'.repeat(200), { maxLength: 100 }).length, 100);
});

test('segment counting follows GSM-7 and Unicode rules', () => {
  assert.equal(countSmsSegments(''), 0);
  assert.equal(countSmsSegments('a'.repeat(160)), 1);
  assert.equal(countSmsSegments('a'.repeat(161)), 2);
  assert.equal(countSmsSegments('a'.repeat(306)), 2);
  assert.equal(countSmsSegments('a'.repeat(307)), 3);
  assert.equal(countSmsSegments('€'.repeat(80)), 1);
  assert.equal(countSmsSegments('€'.repeat(81)), 2);
  assert.equal(countSmsSegments('ọ'.repeat(70)), 1);
  assert.equal(countSmsSegments('ọ'.repeat(71)), 2);
});

test('coordinates are shortened to about one metre', () => {
  assert.equal(buildMapsLink(6.335123456789, 5.603700000001), 'https://maps.google.com/?q=6.33512,5.6037');
});

test('a hostile destination cannot put a link or a second message into an alert', () => {
  const msg = buildOverdueMessage({
    userName: 'Ada',
    kind: 'trip',
    deadlineMs: DEADLINE,
    destination: 'Lagos. URGENT: your account is locked, visit http://evil.example or call +234 803 123 4567',
    token: TOKEN,
  });
  assert.doesNotMatch(msg, /evil\.example/);
  assert.doesNotMatch(msg, /803/);
  // Only our own links remain
  const links = msg.match(/https?:\/\/\S+/g) || [];
  assert.deepEqual(links, [`https://wakaguard.com/s?token=${TOKEN}`]);
});

test('a hostile check-in note is quoted, stripped of links and capped', () => {
  const msg = buildCheckinMessage({
    userName: 'Ada',
    message: 'Pay now at https://evil.example/pay ' + 'x'.repeat(300),
    lat: 6.5,
    lng: 3.3,
  });
  assert.doesNotMatch(msg, /evil\.example/);
  assert.match(msg, /^WakaGuard: Ada checked in and is OK\. "Pay now at x+" Location: https:\/\/maps\.google\.com/);
  assert.ok(msg.length < 220);
});

test('SOS message labels an old position as last known, and a fresh one as the location', () => {
  const fresh = buildSosMessage({ userName: 'Ada', lat: 6.5, lng: 3.3, token: TOKEN });
  assert.match(fresh, /^WakaGuard SOS: Ada needs help\. Location: https:\/\/maps\.google\.com\/\?q=6\.5,3\.3 Track: /);
  assert.match(fresh, /Call them or 112\.$/);

  const old = buildSosMessage({ userName: 'Ada', lat: 6.5, lng: 3.3, locationAtMs: DEADLINE - 41 * 60000 });
  assert.match(old, /Last known location \(Tue 3:49\s?pm\): https:\/\/maps/i);

  const none = buildSosMessage({ userName: 'Ada' });
  assert.equal(none, 'WakaGuard SOS: Ada needs help. Call them or 112.');
});

test('trip share and SOS all-clear messages read correctly', () => {
  const share = buildTripShareMessage({ userName: 'Ada', token: TOKEN, destination: 'Benin City', endsAtMs: DEADLINE });
  assert.match(share, /^WakaGuard: Ada is sharing a trip to Benin City with you\. Expected arrival Tue 4:30\s?pm\. Follow it: https:\/\/wakaguard\.com\/s\?token=/i);

  const clear = buildAllClearMessage({ userName: 'Ada', reason: 'sos_ended' });
  assert.match(clear, /ended the SOS alert in the app\. Please call them to confirm they are safe\.$/);
});

test('every message fits in two SMS segments with the longest allowed inputs', () => {
  const userName = sanitizeName('W'.repeat(60));
  const destination = 'D'.repeat(80);
  const at = { lat: -12.345678, lng: -123.456789 };
  const bodies = [
    buildOverdueMessage({ userName, kind: 'trip', deadlineMs: DEADLINE, destination, ...at, lastUpdateMs: DEADLINE, token: TOKEN }),
    buildOverdueMessage({ userName, kind: 'timer', deadlineMs: DEADLINE }),
    buildSosMessage({ userName, ...at, locationAtMs: DEADLINE, token: TOKEN }),
    buildTripShareMessage({ userName, token: TOKEN, destination, endsAtMs: DEADLINE }),
    buildCheckinMessage({ userName, message: 'm'.repeat(300), ...at }),
    buildAllClearMessage({ userName, reason: 'extended', newDeadlineMs: DEADLINE }),
    buildAllClearMessage({ userName, reason: 'sos_ended' }),
  ];
  for (const body of bodies) {
    assert.ok(isGsm7(body), `not GSM-7: ${body}`);
    assert.ok(countSmsSegments(body) <= 2, `${countSmsSegments(body)} segments (${body.length} chars): ${body}`);
  }
});
