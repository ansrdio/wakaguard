/**
 * Africa's Talking's delivery reports and the backup they allow, against the
 * Firestore emulator. Run with: npm run test:monitor
 * Africa's Talking is answered by a stand-in and the backup is the mock
 * provider, so nothing is actually sent.
 */
process.env.SMS_PROVIDER = 'africastalking';
process.env.SMS_FALLBACK_PROVIDER = 'mock';
process.env.AFRICASTALKING_USERNAME = 'wakaguard';
process.env.AFRICASTALKING_API_KEY = 'test_key';
process.env.AFRICASTALKING_SENDER_ID = 'WakaGuard';
process.env.SMS_REPORT_KEY = 'test_report_key_0123456789abcdefghij';
process.env.SMS_REPORT_LOOK_AGAIN_MS = '200';

import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import * as admin from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { smsReport } from '../../src/index';
import { deliverSafetySms, getTrustedContacts } from '../../src/safetyDelivery';

const db = () => admin.firestore();
const KEY = process.env.SMS_REPORT_KEY!;
let seq = 0;
// Made-up numbers in a range no network gives out
const number = () => `+2340001${String(1000000 + seq++).slice(1)}`;

// Every text the backup sends, from the mock provider's log line
const resent: string[] = [];
const realLog = console.log;
console.log = (...args: unknown[]) => {
  const line = args.map(String).join(' ');
  if (line.startsWith('[SMS MOCK]')) resent.push(line);
  realLog(...args);
};
const realFetch = globalThis.fetch;
after(() => {
  console.log = realLog;
  globalThis.fetch = realFetch;
});

function call(body: unknown, path = `/${KEY}`, method = 'POST'): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const res: any = {
      statusCode: 200,
      status(code: number) { this.statusCode = code; return this; },
      send(payload: unknown) { resolve({ status: this.statusCode, body: payload }); },
      json(payload: unknown) { resolve({ status: this.statusCode, body: payload }); },
    };
    Promise.resolve((smsReport as any)({ method, body, path, headers: {} }, res)).catch(reject);
  });
}

/** A log entry as deliverSafetySms writes it, for texts Africa's Talking took on */
async function makeLog(texts: Array<{ name: string | null; phoneE164: string; sid: string; provider?: string }>, sentAtMs = Date.now()) {
  const ref = db().collection('safetyMessageLogs').doc();
  await ref.set({
    uid: `report_user_${seq++}`,
    type: 'overdue',
    recipients: texts.map((t) => ({ name: t.name, phoneE164: t.phoneE164 })),
    messageBody: 'WakaGuard: Ade has not checked in from a trip.',
    status: 'sent',
    provider: 'africastalking',
    providerResult: texts.map((t) => ({ phoneE164: t.phoneE164, sid: t.sid, error: null, provider: t.provider ?? 'africastalking' })),
    sids: texts.map((t) => t.sid),
    createdAt: Timestamp.fromMillis(sentAtMs),
  });
  return ref;
}

const sid = () => `ATXid_test${Date.now()}${seq++}`;

test("a text Africa's Talking reports failed is sent again through the backup, once", async () => {
  const a = { name: 'Tobi', phoneE164: number(), sid: sid() };
  const b = { name: null, phoneE164: number(), sid: sid() };
  const ref = await makeLog([a, b]);
  const before = resent.length;

  const first = await call({ id: a.sid, status: 'Failed', phoneNumber: a.phoneE164, networkCode: '62120' });
  assert.deepEqual(first, { status: 200, body: 'resent' });
  const log = (await ref.get()).data()!;
  assert.equal(log.reports[a.sid].status, 'Failed');
  assert.equal(log.reports[a.sid].networkCode, '62120');
  assert.equal(log.resends[a.sid].state, 'sent');
  assert.equal(log.resends[a.sid].provider, 'mock');
  assert.equal(resent.length, before + 1);
  // The same text as the first time, addressed to the same contact
  assert.match(resent[resent.length - 1], new RegExp(`To: \\${a.phoneE164}, Body: Hi Tobi, WakaGuard: Ade has not checked in`));

  // Africa's Talking sending the report again changes nothing
  assert.deepEqual(await call({ id: a.sid, status: 'Failed', phoneNumber: a.phoneE164 }), { status: 200, body: 'recorded' });
  assert.equal(resent.length, before + 1);

  // A delivered text is only noted
  assert.deepEqual(await call({ id: b.sid, status: 'Success', phoneNumber: b.phoneE164 }), { status: 200, body: 'recorded' });
  const after = (await ref.get()).data()!;
  assert.equal(after.reports[b.sid].status, 'Success');
  assert.equal(after.resends[b.sid], undefined);
  assert.equal(resent.length, before + 1);
});

test('a report that comes in before the log entry is written still finds it', async () => {
  const a = { name: 'Tobi', phoneE164: number(), sid: sid() };
  const before = resent.length;
  const answer = call({ id: a.sid, status: 'Rejected', phoneNumber: a.phoneE164 });
  await new Promise((resolve) => setTimeout(resolve, 5));
  await makeLog([a]);
  assert.deepEqual(await answer, { status: 200, body: 'resent' });
  assert.equal(resent.length, before + 1);
});

test('a late report, a stopped number, or a text the backup sent are not sent again', async () => {
  const before = resent.length;

  const late = { name: 'Tobi', phoneE164: number(), sid: sid() };
  const lateRef = await makeLog([late], Date.now() - 2 * 60 * 60 * 1000);
  assert.deepEqual(await call({ id: late.sid, status: 'Rejected' }), { status: 200, body: 'recorded' });
  assert.equal((await lateRef.get()).data()!.reports[late.sid].status, 'Rejected');
  assert.equal((await lateRef.get()).data()!.resends, undefined);

  const stopped = { name: 'Tobi', phoneE164: number(), sid: sid() };
  const stoppedRef = await makeLog([stopped]);
  await db().doc(`smsOptOuts/${stopped.phoneE164}`).set({ phoneE164: stopped.phoneE164, stopped: true });
  assert.deepEqual(await call({ id: stopped.sid, status: 'Failed' }), { status: 200, body: 'not_resent' });
  assert.equal((await stoppedRef.get()).data()!.resends[stopped.sid].reason, 'number stopped texts');

  const viaTermii = { name: 'Tobi', phoneE164: number(), sid: sid(), provider: 'termii' };
  const termiiRef = await makeLog([viaTermii]);
  assert.deepEqual(await call({ id: viaTermii.sid, status: 'Failed' }), { status: 200, body: 'not_ours' });
  assert.equal((await termiiRef.get()).data()!.reports, undefined);

  assert.deepEqual(await call({ id: 'ATXid_never_sent', status: 'Failed' }), { status: 200, body: 'not_ours' });
  assert.equal(resent.length, before);
});

test('a report without the key, not posted, or not a report is refused and changes nothing', async () => {
  const a = { name: 'Tobi', phoneE164: number(), sid: sid() };
  const ref = await makeLog([a]);
  assert.equal((await call({ id: a.sid, status: 'Failed' }, '/wrong_key_0123456789abcdefghijklmn')).status, 403);
  assert.equal((await call({ id: a.sid, status: 'Failed' }, '/')).status, 403);
  assert.equal((await call({ id: a.sid, status: 'Failed' }, `/${KEY}`, 'GET')).status, 405);
  assert.equal((await call({ hello: 'there' })).status, 400);
  assert.equal((await ref.get()).data()!.reports, undefined);
});

test("someone who opts out with Africa's Talking gets no more WakaGuard texts", async () => {
  const phone = number();
  const uid = `report_optout_${Date.now()}_${seq++}`;
  await db().doc(`users/${uid}/trustedContacts/c1`).set({ name: 'Tobi', phoneE164: phone });
  await db().doc(`users/${uid}/trustedContacts/c2`).set({ name: 'Bisi', phoneE164: number() });

  assert.deepEqual(await call({ senderId: 'SomeoneElse', phoneNumber: phone }), { status: 200, body: 'not_ours' });
  assert.equal((await db().doc(`smsOptOuts/${phone}`).get()).exists, false);

  assert.deepEqual(await call({ senderId: 'WakaGuard', phoneNumber: phone }), { status: 200, body: 'stopped' });
  const listed = (await db().doc(`smsOptOuts/${phone}`).get()).data()!;
  assert.equal(listed.stopped, true);
  assert.equal(listed.via, 'africastalking');
  assert.equal((await db().doc(`users/${uid}/trustedContacts/c1`).get()).get('smsOptedOut'), true);
  assert.deepEqual((await getTrustedContacts(uid)).map((c) => c.id), ['c2']);
});

test("a real send through Africa's Talking is logged so its report finds it", async () => {
  const phone = number();
  const messageId = sid();
  globalThis.fetch = (async () => new Response(JSON.stringify({
    SMSMessageData: { Recipients: [{ statusCode: 101, status: 'Success', messageId, number: phone }] },
  }), { status: 201 })) as typeof fetch;
  const before = resent.length;

  const delivered = await deliverSafetySms({
    uid: `report_send_${seq++}`,
    type: 'test',
    recipients: [{ name: 'Ada', phoneE164: phone }],
    messageBody: 'WakaGuard: a test.',
  });
  globalThis.fetch = realFetch;
  assert.equal(delivered.status, 'sent');
  const ref = db().doc(`safetyMessageLogs/${delivered.logId}`);
  assert.deepEqual((await ref.get()).get('sids'), [messageId]);

  assert.deepEqual(await call({ id: messageId, status: 'Rejected', phoneNumber: phone }), { status: 200, body: 'resent' });
  assert.equal((await ref.get()).data()!.resends[messageId].state, 'sent');
  assert.equal(resent.length, before + 1);
});
