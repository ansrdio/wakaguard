import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { getSetting } from './config';
import { getProviders, sendSmsBatch, SendSmsResult } from './sms';
import { sanitizeName } from './smsText';
import { addressTo } from './templates';

export type DeliveryStatus = 'sent' | 'partial' | 'failed' | 'blocked';

/** No single message goes to more than this many contacts. */
export const MAX_RECIPIENTS = 5;

export interface Recipient {
  id?: string;
  name?: string;
  phoneE164: string;
}

export interface TrustedContactDoc {
  name: string;
  phoneE164: string;
  notifyOnSOS?: boolean;
  notifyOnCheckIn?: boolean;
  notifyOnTripShare?: boolean;
}

export interface DeliveryResult {
  status: DeliveryStatus;
  sent: number;
  failed: number;
  logId: string;
}

export function isValidE164(phone: string): boolean {
  return /^\+[1-9]\d{6,14}$/.test(phone);
}

/** SMS can be switched off, for example while a provider account is pending. */
export function isSmsEnabled(): boolean {
  return getSetting('SMS_ENABLED', 'sms.enabled') !== 'false';
}

/** Numbers whose owners asked for no more WakaGuard texts (textOptOut.ts) */
export const OPT_OUTS = 'smsOptOuts';

/**
 * Which of these numbers have asked for no more texts. If the list cannot be
 * read, none are left out: an outage must not silence a safety alert.
 */
export async function stoppedNumbers(phones: string[]): Promise<Set<string>> {
  const unique = [...new Set(phones)];
  if (unique.length === 0) return new Set();
  try {
    const db = admin.firestore();
    const snaps = await db.getAll(...unique.map((p) => db.doc(`${OPT_OUTS}/${p}`)));
    return new Set(snaps.filter((s) => s.get('stopped') === true).map((s) => s.id));
  } catch (err) {
    console.error(`Could not read the list of stopped numbers; texting everyone: ${String(err)}`);
    return new Set();
  }
}

/**
 * Load a user's trusted contacts that have a valid phone number and have not
 * asked for texts to stop, oldest first, capped at MAX_RECIPIENTS. If
 * contactIds is non-empty, only those contacts are considered.
 */
export async function getTrustedContacts(
  uid: string,
  contactIds?: string[] | null
): Promise<Array<TrustedContactDoc & { id: string }>> {
  const snap = await admin.firestore().collection(`users/${uid}/trustedContacts`).get();
  const wanted = Array.isArray(contactIds) && contactIds.length > 0 ? new Set(contactIds) : null;

  const contacts: Array<TrustedContactDoc & { id: string; createdAtMs: number }> = [];
  const seenPhones = new Set<string>();
  snap.forEach((doc) => {
    const c = doc.data() as TrustedContactDoc & { createdAt?: FirebaseFirestore.Timestamp };
    if (!c.phoneE164 || !isValidE164(c.phoneE164)) return;
    if (wanted && !wanted.has(doc.id)) return;
    if (seenPhones.has(c.phoneE164)) return;
    seenPhones.add(c.phoneE164);
    contacts.push({ ...c, id: doc.id, createdAtMs: c.createdAt?.toMillis?.() ?? 0 });
  });

  const stopped = await stoppedNumbers(contacts.map((c) => c.phoneE164));
  const textable = contacts.filter((c) => !stopped.has(c.phoneE164));
  if (stopped.size > 0) {
    console.log(`User ${uid}: ${stopped.size} contact(s) asked for no texts and are left out`);
  }

  textable.sort((a, b) => a.createdAtMs - b.createdAtMs || a.id.localeCompare(b.id));
  if (textable.length > MAX_RECIPIENTS) {
    console.warn(`User ${uid} has ${textable.length} contacts; only the first ${MAX_RECIPIENTS} are messaged`);
  }
  return textable.slice(0, MAX_RECIPIENTS).map(({ createdAtMs, ...c }) => c);
}

export interface SenderProfile {
  /** Name to show contacts, already safe to embed in an SMS */
  name: string;
  canSend: boolean;
  blockReason?: 'account_disabled' | 'email_not_verified' | 'sms_blocked';
}

/** Used in messages when the account has no usable name */
export const UNKNOWN_NAME = 'Your contact';

/**
 * Who a message is from, and whether this account may send SMS at all.
 *
 * SMS is limited to accounts with a verified identity (verified email, phone,
 * or a federated sign-in). Disabling an account in Firebase Auth, or setting
 * smsBlocked: true on its user document, stops its messages. If the Auth lookup itself fails the sender is allowed: an
 * outage must not silence a safety alert.
 */
export async function getSenderProfile(uid: string): Promise<SenderProfile> {
  let authName = '';
  let canSend = true;
  let blockReason: SenderProfile['blockReason'];

  try {
    const user = await admin.auth().getUser(uid);
    authName = user.displayName || '';
    const verified = user.emailVerified
      || !!user.phoneNumber
      || user.providerData.some((p) => p.providerId !== 'password');
    if (user.disabled) {
      canSend = false;
      blockReason = 'account_disabled';
    } else if (!verified) {
      canSend = false;
      blockReason = 'email_not_verified';
    }
  } catch (err) {
    console.warn(`Auth lookup failed for ${uid}; allowing send`, err);
  }

  let alertName = '';
  let docName = '';
  try {
    const data = (await admin.firestore().doc(`users/${uid}`).get()).data() || {};
    alertName = typeof data.alertName === 'string' ? data.alertName : '';
    docName = data.displayName || data.username || '';
    // Server-owned switch (clients cannot write it) to stop one user's SMS
    // without disabling their whole account
    if (data.smsBlocked === true && canSend) {
      canSend = false;
      blockReason = 'sms_blocked';
    }
  } catch (err) {
    console.warn(`Could not read user document for ${uid}`, err);
  }

  // The name the user chose for alerts comes first. Otherwise a real name
  // (from Google sign-in) is more recognisable than an app handle.
  const name = sanitizeName(alertName) || sanitizeName(authName) || sanitizeName(docName) || UNKNOWN_NAME;
  return { name, canSend, blockReason };
}

/**
 * Send one message to a list of recipients and write a safetyMessageLogs entry.
 * Each recipient's copy opens with their name and closes with the company's
 * (see addressTo); the log keeps the body they share.
 * Never throws for provider errors; the outcome is in the returned status.
 *
 * 'sent' means the provider accepted every message, not that each handset
 * received it.
 */
export async function deliverSafetySms(params: {
  uid: string;
  type: string;
  recipients: Recipient[];
  messageBody: string;
  payload?: Record<string, unknown>;
}): Promise<DeliveryResult> {
  const { uid, type, messageBody, payload = {} } = params;
  const recipients = params.recipients.slice(0, MAX_RECIPIENTS);
  const smsEnabled = isSmsEnabled();

  let providerResults: SendSmsResult[] = [];
  let status: DeliveryStatus;
  let sent = 0;
  let failed = 0;

  if (!smsEnabled) {
    console.log(`Safety SMS [${type}] BLOCKED (SMS disabled) for ${uid}: ${recipients.length} recipients`);
    providerResults = recipients.map((r) => ({
      phoneE164: r.phoneE164,
      error: 'SMS sending is switched off',
    }));
    status = 'blocked';
    failed = recipients.length;
  } else {
    // Each contact's text is addressed to them and signed with the company's name
    providerResults = await sendSmsBatch(
      recipients.map((r) => ({ phoneE164: r.phoneE164, body: addressTo(r.name, messageBody) }))
    );

    sent = providerResults.filter((r) => r.sid && !r.error).length;
    failed = providerResults.filter((r) => r.error).length;

    if (sent === recipients.length) {
      status = 'sent';
    } else if (sent > 0) {
      status = 'partial';
    } else {
      status = 'failed';
    }
  }

  const logRef = admin.firestore().collection('safetyMessageLogs').doc();
  await logRef.set({
    uid,
    type,
    recipients: recipients.map((r) => ({ name: r.name || null, phoneE164: r.phoneE164 })),
    payload,
    messageBody,
    status,
    provider: smsEnabled ? (getProviders()[0]?.name ?? 'none') : 'blocked',
    providerResult: providerResults.map((r) => ({
      phoneE164: r.phoneE164,
      sid: r.sid ?? null,
      error: r.error ?? null,
      provider: r.provider ?? null,
    })),
    // So that a delivery report can find this entry (smsReport.ts)
    sids: providerResults.flatMap((r) => (r.sid ? [r.sid] : [])),
    createdAt: FieldValue.serverTimestamp(),
  });

  console.log(`Safety SMS [${type}] for ${uid}: status=${status}, sent=${sent}/${recipients.length}`);
  // An error line, so the owner is emailed (serverWatch.ts, docs/OPERATIONS.md)
  if (status === 'failed' || status === 'partial') {
    console.error(`ALARM: texts not sent [${type}] for ${uid}: ${failed} of ${recipients.length} failed`);
  }

  return { status, sent, failed, logId: logRef.id };
}
