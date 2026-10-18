import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countSmsSegments, isGsm7, sanitizeForSms, sanitizeName, sanitizePlace, toGsm7 } from '../src/smsText';
import {
  addressTo,
  buildAllClearMessage,
  buildCheckinMessage,
  buildMapsLink,
  buildOverdueMessage,
  buildSosMessage,
  buildTripShareMessage,
  markAsTest,
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
  assert.deepEqual(links, [`https://wakaguard.com/s?t=${TOKEN}`]);
});

test('a hostile check-in note is quoted, stripped of links and capped', () => {
  const msg = buildCheckinMessage({
    userName: 'Ada',
    message: 'Pay now at https://evil.example/pay ' + 'x'.repeat(300),
    lat: 6.5,
    lng: 3.3,
  });
  assert.doesNotMatch(msg, /evil\.example/);
  assert.match(msg, /^WakaGuard: Ada checked in and is OK\. "Pay now at x+"\n\nLocation:\nhttps:\/\/maps\.google\.com/);
  assert.ok(msg.length < 220);
});

test('SOS message labels an old position as last known, and a fresh one as the location', () => {
  const fresh = buildSosMessage({ userName: 'Ada', lat: 6.5, lng: 3.3, token: TOKEN });
  assert.match(fresh, /^WakaGuard SOS: Ada needs help\. Call them or 112\.\n\nLocation:\nhttps:\/\/maps\.google\.com\/\?q=6\.5,3\.3\n\nFollow their trip:\nhttps:\/\/wakaguard\.com\/s\?t=/);

  const old = buildSosMessage({ userName: 'Ada', lat: 6.5, lng: 3.3, locationAtMs: DEADLINE - 41 * 60000 });
  assert.match(old, /\n\nLast seen Tue 3:49\s?pm:\nhttps:\/\/maps/i);

  const none = buildSosMessage({ userName: 'Ada' });
  assert.equal(none, 'WakaGuard SOS: Ada needs help. Call them or 112.');
});

test('trip share and SOS all-clear messages read correctly', () => {
  const share = buildTripShareMessage({ userName: 'Ada', token: TOKEN, destination: 'Benin City', endsAtMs: DEADLINE });
  assert.match(share, /^WakaGuard: Ada is sharing a trip to Benin City with you\. Expected arrival Tue 4:30\s?pm\.\n\nFollow their trip:\nhttps:\/\/wakaguard\.com\/s\?t=/i);

  const clear = buildAllClearMessage({ userName: 'Ada', reason: 'sos_ended' });
  assert.match(clear, /ended the SOS alert in the app\. Please call them to confirm they are safe\.$/);
});

test('the arrival text names the destination when there is one, cleaned', () => {
  assert.equal(
    buildAllClearMessage({ userName: 'Ada', reason: 'arrived', destination: 'Benin City' }),
    'WakaGuard: Ada has arrived safely and ended their trip to Benin City.'
  );
  assert.equal(buildAllClearMessage({ userName: 'Ada', reason: 'arrived' }), 'WakaGuard: Ada has arrived safely and ended their trip.');
  assert.doesNotMatch(buildAllClearMessage({ userName: 'Ada', reason: 'arrived', destination: 'see https://x.example' }), /https?:/);
});

test('every message fits in two SMS segments with the longest allowed inputs', () => {
  const userName = sanitizeName('W'.repeat(60));
  const destination = 'D'.repeat(80);
  const at = { lat: -12.345678, lng: -123.456789 };
  const bodies = [
    buildOverdueMessage({ userName, kind: 'trip', deadlineMs: DEADLINE, destination, ...at, lastUpdateMs: DEADLINE, token: TOKEN, plate: 'P'.repeat(12) }),
    buildSosMessage({ userName, ...at, locationAtMs: DEADLINE, token: TOKEN, plate: 'P'.repeat(12) }),
    buildOverdueMessage({ userName, kind: 'timer', deadlineMs: DEADLINE }),
    buildSosMessage({ userName, ...at, locationAtMs: DEADLINE, token: TOKEN }),
    buildTripShareMessage({ userName, token: TOKEN, destination, endsAtMs: DEADLINE }),
    buildCheckinMessage({ userName, message: 'm'.repeat(300), ...at }),
    buildAllClearMessage({ userName, reason: 'extended', newDeadlineMs: DEADLINE }),
    buildAllClearMessage({ userName, reason: 'sos_ended' }),
    buildAllClearMessage({ userName, reason: 'arrived', destination }),
  ];
  for (const body of bodies) {
    assert.ok(isGsm7(body), `not GSM-7: ${body}`);
    assert.ok(countSmsSegments(body) <= 2, `${countSmsSegments(body)} segments (${body.length} chars): ${body}`);
  }
});

test('addressTo: opens with the contact\'s name and closes with the company\'s', () => {
  const body = buildAllClearMessage({ userName: 'Ada', reason: 'ended' });
  assert.equal(
    addressTo('Tobi', body),
    'Hi Tobi, WakaGuard: Ada has checked in and ended the trip safely. Powered by WakaGuard'
  );
});

test('the text for a traveller who has not arrived is the sample Termii approved', () => {
  // Confirmed in writing by Termii on 12 October 2026 and registered with the
  // sender ID. Friday 16 October 2026, 6:30 pm and 6:10 pm in Lagos.
  const body = buildOverdueMessage({
    userName: 'Ade',
    kind: 'trip',
    deadlineMs: Date.UTC(2026, 9, 16, 17, 30),
    destination: 'Ibadan',
    lat: 7.3775,
    lng: 3.9471,
    lastUpdateMs: Date.UTC(2026, 9, 16, 17, 10),
    token: 'abc123',
  });
  assert.equal(
    addressTo('Tobi', body),
    'Hi Tobi, WakaGuard: Ade has not checked in from a trip to Ibadan, due Fri 6:30 pm. Please call them.\n\n'
      + 'Last seen Fri 6:10 pm:\nhttps://maps.google.com/?q=7.3775,3.9471\n\n'
      + 'Follow their trip:\nhttps://wakaguard.com/s?t=abc123\n\n'
      + 'Powered by WakaGuard'
  );
});

test('every text opens with "Hi" and closes with the company, test or not, named or not', () => {
  // The format Termii requires: Hi(name), ... Powered by(Company's name)
  const bodies = [
    buildSosMessage({ userName: 'Ada' }),
    buildAllClearMessage({ userName: 'Ada', reason: 'ended' }),
    buildTripShareMessage({ userName: 'Ada', token: TOKEN, destination: 'Ibadan', endsAtMs: DEADLINE }),
    buildCheckinMessage({ userName: 'Ada' }),
    buildOverdueMessage({ userName: 'Ada', kind: 'trip', deadlineMs: DEADLINE, token: TOKEN }),
  ];
  for (const body of bodies) {
    for (const isTest of [false, true]) {
      for (const name of ['Tobi', '', null]) {
        const text = addressTo(name, markAsTest(body, isTest));
        assert.match(text, name ? /^Hi Tobi, / : /^Hi, /, text);
        assert.match(text, /[ \n]Powered by WakaGuard$/, text);
        assert.equal(text.includes('WAKAGUARD TEST ALERT. NOT A REAL EMERGENCY.'), isTest, text);
      }
    }
  }
});

test('addressTo: a test label comes straight after the greeting', () => {
  const body = markAsTest(buildSosMessage({ userName: 'Ada' }), true);
  assert.equal(
    addressTo('Tobi', body),
    'Hi Tobi, WAKAGUARD TEST ALERT. NOT A REAL EMERGENCY. WakaGuard SOS: Ada needs help. Call them or 112. Powered by WakaGuard'
  );
});

test('addressTo: a contact\'s name cannot carry a link, a number or a second message', () => {
  const msg = addressTo('Mum. Visit http://evil.example or call +234 803 123 4567 now', 'WakaGuard: Ada has checked in safely.');
  assert.doesNotMatch(msg, /evil\.example/);
  assert.doesNotMatch(msg, /803/);
  assert.match(msg, /^Hi Mum\./);
  assert.match(msg, / Powered by WakaGuard$/);
  // The name is the traveller's own label for the contact; it is kept short
  assert.ok(msg.indexOf(',') <= 'Hi '.length + 20);
});

test('addressTo: with no usable name the greeting is a plain "Hi,"', () => {
  for (const name of ['', '   ', null, undefined, 42, 'https://evil.example']) {
    assert.equal(addressTo(name, 'WakaGuard: Ada has checked in safely.'), 'Hi, WakaGuard: Ada has checked in safely. Powered by WakaGuard');
  }
});

test('addressed messages: an ordinary alert is two segments, and the longest possible is three', () => {
  const ordinary = addressTo('Abimbola', buildOverdueMessage({
    userName: 'Adaeze', kind: 'trip', deadlineMs: DEADLINE, destination: 'Shoprite Ikeja',
    lat: 6.61234, lng: 3.35678, lastUpdateMs: DEADLINE - 600000, token: TOKEN,
  }));
  assert.ok(isGsm7(ordinary), `not GSM-7: ${ordinary}`);
  assert.equal(countSmsSegments(ordinary), 2, `${ordinary.length} chars: ${ordinary}`);

  const userName = sanitizeName('W'.repeat(60));
  const longest = addressTo('C'.repeat(60), markAsTest(buildOverdueMessage({
    userName, kind: 'trip', deadlineMs: DEADLINE, destination: 'D'.repeat(80),
    lat: -12.345678, lng: -123.456789, lastUpdateMs: DEADLINE, token: TOKEN,
  }), true));
  assert.ok(isGsm7(longest), `not GSM-7: ${longest}`);
  assert.ok(countSmsSegments(longest) <= 3, `${countSmsSegments(longest)} segments (${longest.length} chars): ${longest}`);
});
