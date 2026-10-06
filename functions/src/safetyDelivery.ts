import * as admin from 'firebase-admin';
import { getSetting } from './config';
import { getProviders, sendSmsBatch, SendSmsResult } from './sms';
import { sanitizeName } from './smsText';

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

/**
 * Load a user's trusted contacts that have a valid phone number, oldest first,
 * capped at MAX_RECIPIENTS. If contactIds is non-empty, only those contacts
 * are considered.
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

  contacts.sort((a, b) => a.createdAtMs - b.createdAtMs || a.id.localeCompare(b.id));
  if (contacts.length > MAX_RECIPIENTS) {
    console.warn(`User ${uid} has ${contacts.length} contacts; only the first ${MAX_RECIPIENTS} are messaged`);
  }
  return contacts.slice(0, MAX_RECIPIENTS).map(({ createdAtMs, ...c }) => c);
}

export interface SenderProfile {
  /** Name to show contacts, already safe to embed in an SMS */
  name: string;
  canSend: boolean;
  blockReason?: 'account_disabled' | 'email_not_verified' | 'sms_blocked';
}

const UNKNOWN_NAME = 'Your contact';

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

  let docName = '';
  try {
    const data = (await admin.firestore().doc(`users/${uid}`).get()).data() || {};
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

  // A real name (from Google sign-in) is more recognisable than an app handle
  const name = sanitizeName(authName) || sanitizeName(docName) || UNKNOWN_NAME;
  return { name, canSend, blockReason };
}

/**
 * Send one message body to a list of recipients and write a safetyMessageLogs entry.
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
    provider: smsEnabled ? (getProviders()[0]?.name ?? 'none') : 'blocked',
    providerResult: providerResults.map((r) => ({
      phoneE164: r.phoneE164,
      sid: r.sid ?? null,
      error: r.error ?? null,
      provider: r.provider ?? null,
    })),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log(`Safety SMS [${type}] for ${uid}: status=${status}, sent=${sent}/${recipients.length}`);

  return { status, sent, failed, logId: logRef.id };
}
