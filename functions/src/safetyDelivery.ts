import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { sendSmsBatch, SendSmsResult } from './twilio';

export type DeliveryStatus = 'sent' | 'partial' | 'failed' | 'blocked';

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

/** SMS can be switched off while the provider account is pending verification. */
export function isSmsEnabled(): boolean {
  return process.env.SMS_ENABLED !== 'false' &&
    functions.config().sms?.enabled !== 'false';
}

/**
 * Load a user's trusted contacts that have a valid phone number.
 * If contactIds is non-empty, only those contacts are returned.
 */
export async function getTrustedContacts(
  uid: string,
  contactIds?: string[] | null
): Promise<Array<TrustedContactDoc & { id: string }>> {
  const snap = await admin.firestore().collection(`users/${uid}/trustedContacts`).get();
  const wanted = Array.isArray(contactIds) && contactIds.length > 0 ? new Set(contactIds) : null;

  const contacts: Array<TrustedContactDoc & { id: string }> = [];
  snap.forEach((doc) => {
    const c = doc.data() as TrustedContactDoc;
    if (!c.phoneE164 || !isValidE164(c.phoneE164)) return;
    if (wanted && !wanted.has(doc.id)) return;
    contacts.push({ ...c, id: doc.id });
  });
  return contacts;
}

/** Best available name for the traveller, for use in messages to contacts. */
export async function getDisplayName(uid: string): Promise<string> {
  try {
    const userSnap = await admin.firestore().doc(`users/${uid}`).get();
    const data = userSnap.data() || {};
    const fromDoc = data.displayName || data.username;
    if (typeof fromDoc === 'string' && fromDoc.trim()) return fromDoc.trim();

    const authUser = await admin.auth().getUser(uid);
    if (authUser.displayName?.trim()) return authUser.displayName.trim();
  } catch (err) {
    console.warn(`Could not resolve display name for ${uid}`, err);
  }
  return 'Your contact';
}

/**
 * Send one message body to a list of recipients and write a safetyMessageLogs entry.
 * Never throws for provider errors; the outcome is in the returned status.
 */
export async function deliverSafetySms(params: {
  uid: string;
  type: string;
  recipients: Recipient[];
  messageBody: string;
  payload?: Record<string, unknown>;
}): Promise<DeliveryResult> {
  const { uid, type, recipients, messageBody, payload = {} } = params;
  const smsEnabled = isSmsEnabled();

  let providerResults: SendSmsResult[] = [];
  let status: DeliveryStatus;
  let sent = 0;
  let failed = 0;

  if (!smsEnabled) {
    console.log(`Safety SMS [${type}] BLOCKED (SMS disabled) for ${uid}: ${recipients.length} recipients`);
    providerResults = recipients.map((r) => ({
      phoneE164: r.phoneE164,
      error: 'SMS sending is not yet available. Twilio verification pending.',
    }));
    status = 'blocked';
    failed = recipients.length;
  } else {
    providerResults = await sendSmsBatch(
      recipients.map((r) => ({ phoneE164: r.phoneE164, body: messageBody }))
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
    provider: smsEnabled ? 'twilio' : 'blocked',
    providerResult: providerResults.map((r) => ({
      phoneE164: r.phoneE164,
      sid: r.sid ?? null,
      error: r.error ?? null,
    })),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log(`Safety SMS [${type}] for ${uid}: status=${status}, sent=${sent}/${recipients.length}`);

  return { status, sent, failed, logId: logRef.id };
}
