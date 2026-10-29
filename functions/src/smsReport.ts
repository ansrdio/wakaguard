/**
 * @fileoverview Delivery reports from Africa's Talking, and the backup they allow
 *
 * Africa's Talking calls this address with how each text ended. When it says
 * a safety text did not reach the phone (smsReportPlan.ts), the same text is
 * sent again, once, through the backup provider (SMS_FALLBACK_PROVIDER, Termii).
 * It also passes on anyone who opts out of our sender ID with Africa's
 * Talking, so that the backup does not text them either.
 *
 * Set up: SMS_REPORT_KEY in functions/.env (32 or more random characters), and
 * in the Africa's Talking dashboard, SMS > SMS Callback URLs, both "Delivery
 * Reports" and "Bulk SMS Opt Out" set to
 * https://us-central1-<project id>.cloudfunctions.net/smsReport/<SMS_REPORT_KEY>.
 * The key in the address is what shows a report came from Africa's Talking.
 *
 * @module smsReport
 */

import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { FieldPath, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getNumberSetting, getSetting } from './config';
import { isSmsEnabled, OPT_OUTS, stoppedNumbers } from './safetyDelivery';
import { getFallbackProvider } from './sms';
import { decideReport, DeliveryReport, LoggedText, OptOutNotice, readNotification, textFromLog } from './smsReportPlan';
import { addressTo } from './templates';
import { markEveryCopy } from './textOptOut';
import { keysMatch } from './tripLocation';

export type ReportOutcome = 'not_ours' | 'recorded' | 'resent' | 'not_resent' | 'resend_failed' | 'stopped';

const ending = (phoneE164: string) => `the number ending ${phoneE164.slice(-4)}`;

/** Send one logged text again through the backup, and note how that went */
async function resend(
  ref: FirebaseFirestore.DocumentReference,
  report: DeliveryReport,
  text: LoggedText,
  messageBody: unknown
): Promise<ReportOutcome> {
  const note = (value: Record<string, unknown>) =>
    ref.update(new FieldPath('resends', report.id), { ...value, at: FieldValue.serverTimestamp() });
  const backup = getFallbackProvider();
  const usable = backup && backup.name !== text.provider && !backup.configError() ? backup : null;
  const why = `Africa's Talking reported a text to ${ending(text.phoneE164)} ${report.status}`;

  if (!isSmsEnabled() || !usable || typeof messageBody !== 'string' || !messageBody) {
    const reason = !isSmsEnabled() ? 'texts switched off' : !usable ? 'no backup provider' : 'no message in the log';
    await note({ state: 'not_sent', reason });
    console.error(`ALARM: texts not sent: ${why}, and it was not sent again (${reason})`);
    return 'not_resent';
  }
  // They may have asked for no more texts since
  if ((await stoppedNumbers([text.phoneE164])).has(text.phoneE164)) {
    await note({ state: 'not_sent', reason: 'number stopped texts' });
    console.log(`${why}; not sent again, as that number has stopped texts`);
    return 'not_resent';
  }

  try {
    const sid = await usable.send(text.phoneE164, addressTo(text.name, messageBody));
    await note({ state: 'sent', provider: usable.name, sid });
    console.warn(`${why}; sent again through ${usable.name}, id ${sid}`);
    return 'resent';
  } catch (err: any) {
    const error = err?.message || 'Unknown error';
    await note({ state: 'failed', provider: usable.name, error });
    console.error(`ALARM: texts not sent: ${why}, and sending it again through ${usable.name} failed: ${error}`);
    return 'resend_failed';
  }
}

/**
 * The log entry of the text a report is about. The entry is written just after
 * sending, and a refusal can be reported sooner, so a miss is looked for twice more.
 */
async function findLog(id: string): Promise<FirebaseFirestore.DocumentReference | null> {
  const waitMs = getNumberSetting('SMS_REPORT_LOOK_AGAIN_MS', 3000);
  for (let tries = 1; ; tries++) {
    const found = await admin.firestore().collection('safetyMessageLogs')
      .where('sids', 'array-contains', id).limit(1).get();
    if (!found.empty) return found.docs[0].ref;
    if (tries === 3) return null;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
}

export async function handleDeliveryReport(report: DeliveryReport): Promise<ReportOutcome> {
  const db = admin.firestore();
  const ref = await findLog(report.id);
  if (!ref) {
    // Texts sent outside the app, such as from the test tool
    console.log(`Text report ${report.status} for message ${report.id}, which is not in the log`);
    return 'not_ours';
  }
  // Taken after any wait for the entry, so the time since sending is not understated
  const nowMs = Date.now();

  // Noted inside a transaction, so that a report sent twice is acted on once
  const planned = await db.runTransaction(async (tx) => {
    const log = (await tx.get(ref)).data() || {};
    const sentAtMs = (log.createdAt as Timestamp | undefined)?.toMillis?.() ?? nowMs;
    const text = textFromLog(log, report.id, sentAtMs);
    const decision = text ? decideReport(report, text, nowMs) : 'ignore';
    if (!text || decision === 'ignore') return null;
    const reportPath = new FieldPath('reports', report.id);
    const reportValue = {
      status: report.status,
      failureReason: report.failureReason,
      networkCode: report.networkCode,
      at: FieldValue.serverTimestamp(),
    };
    if (decision === 'resend') {
      tx.update(ref, reportPath, reportValue, new FieldPath('resends', report.id), {
        state: 'sending',
        at: FieldValue.serverTimestamp(),
      });
    } else {
      tx.update(ref, reportPath, reportValue);
    }
    return { decision, text, messageBody: log.messageBody };
  });

  if (!planned) return 'not_ours';
  const { decision, text, messageBody } = planned;
  if (decision === 'too_late') {
    const minutes = Math.round((nowMs - text.sentAtMs) / 60000);
    console.error(`ALARM: texts not sent: Africa's Talking reported a text to ${ending(text.phoneE164)} `
      + `${report.status} ${minutes} minutes after it was sent, too late to send it again`);
  }
  return decision === 'resend' ? resend(ref, report, text, messageBody) : 'recorded';
}

/** Someone opted out with Africa's Talking: stop WakaGuard texts to them, as textOptOut.ts does */
export async function handleOptOut(notice: OptOutNotice): Promise<ReportOutcome> {
  const ours = getSetting('AFRICASTALKING_SENDER_ID', 'africastalking.sender_id');
  if (!ours || notice.senderId.toLowerCase() !== ours.toLowerCase()) {
    console.warn(`Opt-out from sender ID "${notice.senderId}", which is not ours; ignored`);
    return 'not_ours';
  }
  await admin.firestore().doc(`${OPT_OUTS}/${notice.phoneE164}`).set({
    phoneE164: notice.phoneE164,
    stopped: true,
    stoppedAt: FieldValue.serverTimestamp(),
    via: 'africastalking',
  }, { merge: true });
  await markEveryCopy(notice.phoneE164, true);
  console.log(`Texts stopped for ${ending(notice.phoneE164)}, who opted out with Africa's Talking`);
  return 'stopped';
}

export const smsReport = functions.https.onRequest(async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('method_not_allowed');
    return;
  }
  const key = getSetting('SMS_REPORT_KEY');
  if (!keysMatch(key, req.path.replace(/^\/+/, ''))) {
    if (!key) console.error('ALARM: a text report was refused because SMS_REPORT_KEY is not set');
    res.status(403).send('forbidden');
    return;
  }
  const notification = readNotification(req.body);
  if (!notification) {
    res.status(400).send('invalid_request');
    return;
  }
  try {
    const outcome = notification.kind === 'optOut'
      ? await handleOptOut(notification.notice)
      : await handleDeliveryReport(notification.report);
    res.status(200).send(outcome);
  } catch (err) {
    console.error(`ALARM: a text report could not be handled: ${String(err)}`);
    res.status(500).send('error');
  }
});
