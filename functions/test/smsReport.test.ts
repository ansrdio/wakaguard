import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  decideReport, DeliveryReport, LoggedText, readNotification, RESEND_WITHIN_MS, textFromLog,
} from '../src/smsReportPlan';

// Made-up numbers in a range no network gives out
const A = '+2340000000001';
const B = '+2340000000002';

test("a delivery report is read from Africa's Talking's form", () => {
  assert.deepEqual(readNotification({
    id: 'ATXid_abc123', status: 'Failed', phoneNumber: A, networkCode: '62120', failureReason: 'DeliveryFailure', retryCount: '0',
  }), {
    kind: 'delivery',
    report: { id: 'ATXid_abc123', status: 'Failed', phoneE164: A, networkCode: '62120', failureReason: 'DeliveryFailure' },
  });
  // A "+" sent unencoded arrives as a space
  assert.equal((readNotification({ id: 'ATXid_1', status: 'Success', phoneNumber: ' 2340000000001' }) as any).report.phoneE164, A);
  assert.equal((readNotification({ id: 'ATXid_1', status: 'Success' }) as any).report.phoneE164, null, 'the number is optional');
  for (const bad of [
    { status: 'Failed' },
    { id: 'ATXid_1' },
    { id: 'a/b', status: 'Failed' },
    { id: 'ATXid_1', status: '<script>' },
    {},
    null,
    'id=ATXid_1',
  ]) {
    assert.equal(readNotification(bad), null, JSON.stringify(bad));
  }
});

test("an opt-out notice names our sender ID and a full number", () => {
  assert.deepEqual(readNotification({ senderId: 'WakaGuard', phoneNumber: A }), {
    kind: 'optOut', notice: { senderId: 'WakaGuard', phoneE164: A },
  });
  assert.equal(readNotification({ senderId: 'WakaGuard', phoneNumber: '0800' }), null);
  assert.equal(readNotification({ phoneNumber: A }), null);
});

const log = {
  recipients: [{ name: 'Tobi', phoneE164: A }, { name: null, phoneE164: B }],
  providerResult: [
    { phoneE164: A, sid: 'ATXid_a', error: null, provider: 'africastalking' },
    { phoneE164: B, sid: 'ATXid_b', error: null, provider: 'africastalking' },
  ],
  resends: { ATXid_b: { state: 'sent' } },
};

test('the text a report is about is found in the log entry', () => {
  assert.deepEqual(textFromLog(log, 'ATXid_a', 1000), {
    phoneE164: A, name: 'Tobi', provider: 'africastalking', sentAtMs: 1000, alreadyResent: false,
  });
  assert.equal(textFromLog(log, 'ATXid_b', 1000)?.alreadyResent, true);
  assert.equal(textFromLog(log, 'ATXid_b', 1000)?.name, null);
  assert.equal(textFromLog(log, 'ATXid_other', 1000), null);
  assert.equal(textFromLog({}, 'ATXid_a', 1000), null);
});

test('only an undelivered text from Africa\'s Talking, reported in time, is sent again', () => {
  const text: LoggedText = { phoneE164: A, name: 'Tobi', provider: 'africastalking', sentAtMs: 0, alreadyResent: false };
  const report = (status: string, phoneE164: string | null = A): DeliveryReport =>
    ({ id: 'ATXid_a', status, phoneE164, networkCode: null, failureReason: null });

  for (const status of ['Failed', 'Rejected', 'Expired']) {
    assert.equal(decideReport(report(status), text, 60_000), 'resend', status);
  }
  for (const status of ['Success', 'Sent', 'Submitted', 'Buffered', 'AbsentSubscriber']) {
    assert.equal(decideReport(report(status), text, 60_000), 'record', status);
  }
  assert.equal(decideReport(report('Failed'), { ...text, alreadyResent: true }, 60_000), 'record', 'only once');
  assert.equal(decideReport(report('Failed'), text, RESEND_WITHIN_MS), 'resend');
  assert.equal(decideReport(report('Failed'), text, RESEND_WITHIN_MS + 1), 'too_late');
  assert.equal(decideReport(report('Failed', null), text, 60_000), 'resend', 'a report without the number');
  assert.equal(decideReport(report('Failed', B), text, 60_000), 'ignore', 'a different number');
  assert.equal(decideReport(report('Failed'), { ...text, provider: 'termii' }, 60_000), 'ignore', 'sent through Termii');
});
