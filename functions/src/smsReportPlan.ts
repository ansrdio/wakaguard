/**
 * The checks behind Africa's Talking's delivery reports (smsReport.ts), kept
 * apart from Firestore so they can be tested on their own.
 *
 * Africa's Talking says only later, not when we send, that a text did not
 * reach the phone: a number with Do-Not-Disturb on comes back "Failed" or
 * "Rejected" with no reason given (Africa's Talking, 15 October 2026). The
 * backup in sms.ts covers only a text refused straight away, so these reports
 * are where the rest are caught and sent again through the backup provider.
 * Fields and statuses: https://developers.africastalking.com/docs/sms/notifications
 */

import { isValidE164 } from './safetyDelivery';
import { ID_PATTERN } from './tripLocation';

/**
 * Final reports that a text will not reach the phone through Africa's
 * Talking. "Expired" is a network's filter discarding it. "AbsentSubscriber"
 * (phone off or out of coverage) is left out: no provider reaches it sooner.
 */
export const RESEND_STATUSES = ['Rejected', 'Failed', 'Expired'];

/**
 * A later report is recorded but the text is not sent again: by then the trip
 * may be over, and an old alert arriving after "arrived safely" would only alarm.
 */
export const RESEND_WITHIN_MS = 30 * 60 * 1000;

export interface DeliveryReport {
  /** Africa's Talking's message id, as returned when the text was sent */
  id: string;
  status: string;
  phoneE164: string | null;
  networkCode: string | null;
  failureReason: string | null;
}

/** Someone opted out of texts from our sender ID with Africa's Talking */
export interface OptOutNotice {
  senderId: string;
  phoneE164: string;
}

export type Notification =
  | { kind: 'delivery'; report: DeliveryReport }
  | { kind: 'optOut'; notice: OptOutNotice };

const WORD = /^[A-Za-z0-9 _-]{1,40}$/;

function word(value: unknown): string | null {
  return typeof value === 'string' && WORD.test(value.trim()) ? value.trim() : null;
}

function phone(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  let p = value.replace(/[\s-]/g, '');
  // An unencoded "+" in a form arrives as a space, which is gone by now
  if (/^\d{8,15}$/.test(p)) p = `+${p}`;
  return isValidE164(p) ? p : null;
}

/** A delivery report or an opt-out notice, from the form Africa's Talking posts */
export function readNotification(body: unknown): Notification | null {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  if (b.id !== undefined || b.status !== undefined) {
    const id = typeof b.id === 'string' && ID_PATTERN.test(b.id) ? b.id : null;
    const status = word(b.status);
    if (!id || !status) return null;
    return {
      kind: 'delivery',
      report: {
        id,
        status,
        phoneE164: phone(b.phoneNumber),
        networkCode: word(b.networkCode),
        failureReason: word(b.failureReason),
      },
    };
  }
  const senderId = word(b.senderId);
  const phoneE164 = phone(b.phoneNumber);
  return senderId && phoneE164 ? { kind: 'optOut', notice: { senderId, phoneE164 } } : null;
}

/** One contact's text, as the safetyMessageLogs entry records it */
export interface LoggedText {
  phoneE164: string;
  name: string | null;
  /** Which provider took it on */
  provider: string | null;
  sentAtMs: number;
  alreadyResent: boolean;
}

/** The text in this log entry that the report is about, or null if none */
export function textFromLog(log: Record<string, any>, id: string, sentAtMs: number): LoggedText | null {
  const results: any[] = Array.isArray(log.providerResult) ? log.providerResult : [];
  const result = results.find((r) => r && r.sid === id);
  if (!result || typeof result.phoneE164 !== 'string') return null;
  const recipients: any[] = Array.isArray(log.recipients) ? log.recipients : [];
  const recipient = recipients.find((r) => r && r.phoneE164 === result.phoneE164);
  return {
    phoneE164: result.phoneE164,
    name: typeof recipient?.name === 'string' ? recipient.name : null,
    provider: typeof result.provider === 'string' ? result.provider : null,
    sentAtMs,
    alreadyResent: !!(log.resends && typeof log.resends === 'object' && log.resends[id]),
  };
}

export type ReportDecision = 'ignore' | 'record' | 'resend' | 'too_late';

/**
 * ignore: not a text Africa's Talking sent to that number, so nothing is written.
 * record: note how it ended. resend: note it and send it again through the
 * backup, once. too_late: note it; it failed but is too old to send again.
 */
export function decideReport(report: DeliveryReport, text: LoggedText, nowMs: number): ReportDecision {
  if (text.provider !== 'africastalking') return 'ignore';
  if (report.phoneE164 && report.phoneE164 !== text.phoneE164) return 'ignore';
  if (!RESEND_STATUSES.includes(report.status) || text.alreadyResent) return 'record';
  return nowMs - text.sentAtMs <= RESEND_WITHIN_MS ? 'resend' : 'too_late';
}
