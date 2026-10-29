import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { getFallbackProvider, getProviders, sendSms, sendSmsBatch } from '../src/sms';

const ENV_KEYS = [
  'SMS_PROVIDER', 'SMS_FALLBACK_PROVIDER', 'TWILIO_MOCK',
  'TERMII_API_KEY', 'TERMII_SENDER_ID', 'TERMII_BASE_URL', 'TERMII_CHANNEL',
  'TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_FROM_NUMBER',
  'AFRICASTALKING_USERNAME', 'AFRICASTALKING_API_KEY', 'AFRICASTALKING_SENDER_ID', 'AFRICASTALKING_BASE_URL',
];
const realFetch = globalThis.fetch;
let calls: Array<{ url: string; body: any; headers?: Record<string, string> }> = [];

function mockFetch(respond: (call: number) => { status: number; body: unknown } | Error) {
  calls = [];
  globalThis.fetch = (async (url: any, init: any) => {
    calls.push({ url: String(url), body: JSON.parse(init.body), headers: init.headers });
    const result = respond(calls.length);
    if (result instanceof Error) throw result;
    const text = typeof result.body === 'string' ? result.body : JSON.stringify(result.body);
    return new Response(text, { status: result.status });
  }) as typeof fetch;
}

beforeEach(() => {
  for (const key of ENV_KEYS) delete process.env[key];
});
afterEach(() => {
  globalThis.fetch = realFetch;
});

function useTermii() {
  process.env.SMS_PROVIDER = 'termii';
  process.env.TERMII_API_KEY = 'key_123';
  process.env.TERMII_SENDER_ID = 'WakaGuard';
}

test('Termii request matches the documented format', async () => {
  useTermii();
  mockFetch(() => ({ status: 200, body: { code: 'ok', message_id: '3017544', message_id_str: '3017544', message: 'Successfully Sent' } }));

  const result = await sendSms('+2348012345678', 'hello');

  assert.deepEqual(result, { phoneE164: '+2348012345678', sid: '3017544', provider: 'termii' });
  assert.equal(calls[0].url, 'https://v3.api.termii.com/api/sms/send');
  assert.deepEqual(calls[0].body, {
    api_key: 'key_123',
    to: '2348012345678',
    from: 'WakaGuard',
    sms: 'hello',
    type: 'plain',
    channel: 'dnd',
  });
});

test('Termii base URL and channel are configurable', async () => {
  useTermii();
  process.env.TERMII_BASE_URL = 'https://api.ng.termii.com/';
  process.env.TERMII_CHANNEL = 'generic';
  mockFetch(() => ({ status: 200, body: { message_id: 1 } }));

  await sendSms('+2348012345678', 'hello');

  assert.equal(calls[0].url, 'https://api.ng.termii.com/api/sms/send');
  assert.equal(calls[0].body.channel, 'generic');
});

test('Termii rejections, non-JSON errors and network failures are reported, not thrown', async () => {
  useTermii();

  mockFetch(() => ({ status: 400, body: { message: 'Invalid sender id' } }));
  assert.match((await sendSms('+2348012345678', 'x')).error!, /termii: Termii 400: Invalid sender id/);

  mockFetch(() => ({ status: 502, body: '<html>Bad gateway</html>' }));
  assert.match((await sendSms('+2348012345678', 'x')).error!, /Termii 502: <html>Bad gateway/);

  mockFetch(() => ({ status: 200, body: { code: 'error', message: 'Insufficient balance' } }));
  assert.match((await sendSms('+2348012345678', 'x')).error!, /Insufficient balance/);

  mockFetch(() => new Error('socket hang up'));
  const failed = await sendSms('+2348012345678', 'x');
  assert.match(failed.error!, /socket hang up/);
  assert.equal(failed.sid, undefined);
});

test('missing or invalid settings are reported without calling the provider', async () => {
  process.env.SMS_PROVIDER = 'termii';
  mockFetch(() => ({ status: 200, body: { message_id: 1 } }));
  assert.match((await sendSms('+2348012345678', 'x')).error!, /missing TERMII_API_KEY, TERMII_SENDER_ID/);

  process.env.TERMII_API_KEY = 'k';
  process.env.TERMII_SENDER_ID = 'WakaGuardSafety';
  assert.match((await sendSms('+2348012345678', 'x')).error!, /3 to 11 characters/);
  assert.equal(calls.length, 0);

  process.env.SMS_PROVIDER = 'twilio';
  assert.match((await sendSms('+2348012345678', 'x')).error!, /missing TWILIO_ACCOUNT_SID/);

  process.env.SMS_PROVIDER = 'carrier-pigeon';
  assert.equal((await sendSms('+2348012345678', 'x')).error, 'No SMS provider configured');
});

test('the fallback provider is used when the first one fails', async () => {
  useTermii();
  process.env.SMS_FALLBACK_PROVIDER = 'mock';
  mockFetch(() => ({ status: 500, body: { message: 'down' } }));

  const result = await sendSms('+2348012345678', 'x');

  assert.equal(result.provider, 'mock');
  assert.match(result.sid!, /^MOCK_/);
  assert.equal(result.error, undefined);
});

test('provider order and legacy mock switch', () => {
  assert.deepEqual(getProviders().map((p) => p.name), ['twilio']);

  process.env.SMS_PROVIDER = 'Termii';
  process.env.SMS_FALLBACK_PROVIDER = 'twilio';
  assert.deepEqual(getProviders().map((p) => p.name), ['termii', 'twilio']);

  process.env.SMS_FALLBACK_PROVIDER = 'termii';
  assert.deepEqual(getProviders().map((p) => p.name), ['termii']);

  process.env.TWILIO_MOCK = 'true';
  assert.deepEqual(getProviders().map((p) => p.name), ['mock']);
});

test('the backup provider on its own, for texts reported undelivered later', () => {
  process.env.SMS_PROVIDER = 'africastalking';
  assert.equal(getFallbackProvider(), null, 'no backup set');
  process.env.SMS_FALLBACK_PROVIDER = 'termii';
  assert.equal(getFallbackProvider()?.name, 'termii');
  process.env.SMS_FALLBACK_PROVIDER = 'africastalking';
  assert.equal(getFallbackProvider(), null, 'the same provider is no backup');
});

test('a batch reports each recipient separately', async () => {
  useTermii();
  mockFetch((n) => (n === 1 ? { status: 200, body: { message_id: 'a' } } : { status: 400, body: { message: 'bad number' } }));

  const results = await sendSmsBatch([
    { phoneE164: '+2348000000001', body: 'x' },
    { phoneE164: '+2348000000002', body: 'x' },
  ]);

  assert.equal(results.filter((r) => r.sid).length, 1);
  assert.equal(results.filter((r) => r.error).length, 1);
});

// ---------------------------------------------------------------------------
// Africa's Talking
// ---------------------------------------------------------------------------

function useAfricasTalking() {
  process.env.SMS_PROVIDER = 'africastalking';
  process.env.AFRICASTALKING_USERNAME = 'wakaguard';
  process.env.AFRICASTALKING_API_KEY = 'key_456';
  process.env.AFRICASTALKING_SENDER_ID = 'WakaGuard';
}
const recipient = (statusCode: number, status: string, messageId = 'ATXid_1') => ({
  SMSMessageData: {
    Message: 'Sent to 1/1 Total Cost: NGN 4.0000',
    Recipients: [{ statusCode, number: '+2348012345678', status, cost: 'NGN 4.0000', messageId }],
  },
});

test("Africa's Talking request matches the documented format", async () => {
  useAfricasTalking();
  mockFetch(() => ({ status: 201, body: recipient(101, 'Success') }));

  const result = await sendSms('+2348012345678', 'hello');

  assert.deepEqual(result, { phoneE164: '+2348012345678', sid: 'ATXid_1', provider: 'africastalking' });
  assert.equal(calls[0].url, 'https://api.africastalking.com/version1/messaging/bulk');
  assert.deepEqual(calls[0].body, {
    username: 'wakaguard', message: 'hello', senderId: 'WakaGuard', phoneNumbers: ['+2348012345678'],
  });
  assert.equal(calls[0].headers?.apiKey, 'key_456');
});

test("Africa's Talking refusals inside a successful reply are reported as failures", async () => {
  useAfricasTalking();
  for (const [code, status] of [[405, 'InsufficientBalance'], [409, 'DoNotDisturbRejection'], [402, 'InvalidSenderId']] as const) {
    mockFetch(() => ({ status: 201, body: recipient(code, status, 'None') }));
    const result = await sendSms('+2348012345678', 'hello');
    assert.equal(result.sid, undefined);
    assert.match(result.error ?? '', new RegExp(`${code} ${status}`));
  }

  mockFetch(() => ({ status: 401, body: 'The supplied authentication is invalid' }));
  assert.match((await sendSms('+2348012345678', 'hello')).error ?? '', /401.*authentication is invalid/);
});

test("Africa's Talking settings are checked before anything is sent", async () => {
  process.env.SMS_PROVIDER = 'africastalking';
  mockFetch(() => ({ status: 201, body: recipient(101, 'Success') }));
  const result = await sendSms('+2348012345678', 'hello');
  assert.match(result.error ?? '', /AFRICASTALKING_USERNAME, AFRICASTALKING_API_KEY, AFRICASTALKING_SENDER_ID/);
  assert.equal(calls.length, 0);
});

