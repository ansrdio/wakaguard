/**
 * @fileoverview "Let me know you got there" (build 29)
 *
 * Testers who stopped using WakaGuard mostly forgot to start a trip before
 * leaving (17 November 2026). This moves the remembering to the person who
 * worries: a mum, partner or friend makes a link and sends it themselves (on
 * WhatsApp, say). Whoever opens it is asked whether to start a trip with that
 * person as a contact. Nobody is texted and no trip starts until the traveller
 * says so in the app; WakaGuard sends nothing when the link is made.
 *
 * A request holds the asker's name and Nigerian mobile number, as they typed
 * them, for REQUEST_DAYS; the daily deletion removes it after that, and
 * deleting the asker's account removes it at once. The number is shown in full
 * only to a signed-in person who opens the link, so they can add the asker as
 * a contact. Making links needs a confirmed account, as sending texts does,
 * and at most MAX_A_DAY a day.
 *
 * @module tripRequests
 */

import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { randomBytes } from 'node:crypto';
import { nigerianMobile } from './referralPlan';
import { isConfirmedAccount } from './confirmedAccount';

export const TRIP_REQUESTS = 'tripRequests';
/** How long a link works */
export const REQUEST_DAYS = 7;
/** Links one person may make in a day */
export const MAX_A_DAY = 10;
/** Long enough that links cannot be guessed */
export const ID_LENGTH = 16;
const ID_ALPHABET = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const DAY_MS = 24 * 60 * 60 * 1000;

export type CreateProblem = 'name' | 'phone' | 'too_many' | 'not_confirmed';
export type ReadProblem = 'not_found' | 'expired' | 'own';

const db = () => admin.firestore();

/** The asker's name as they will be shown: 1 to 40 plain characters */
export function askerName(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const text = value.replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim();
  return text.length >= 1 && text.length <= 40 ? text : null;
}

/** A random id for a link, from letters and digits that are not easily mixed up */
export function newRequestId(bytes: Buffer = randomBytes(ID_LENGTH)): string {
  return [...bytes].map((b) => ID_ALPHABET[b % ID_ALPHABET.length]).join('');
}

/** Whether a link id has the shape this module makes */
export function isRequestId(value: unknown): value is string {
  return typeof value === 'string' && value.length === ID_LENGTH && [...value].every((c) => ID_ALPHABET.includes(c));
}

export async function createRequest(uid: string, body: Record<string, unknown>, nowMs: number):
  Promise<{ ok: true; id: string } | { ok: false; problem: CreateProblem }> {
  const name = askerName(body.name);
  if (!name) return { ok: false, problem: 'name' };
  const phone = nigerianMobile(body.phone);
  if (!phone) return { ok: false, problem: 'phone' };
  const user = await admin.auth().getUser(uid);
  if (!isConfirmedAccount(user)) return { ok: false, problem: 'not_confirmed' };
  // A person's links last a week, so there are never many to look through (and no index is needed)
  const mine = await db().collection(TRIP_REQUESTS).where('fromUid', '==', uid).select('createdAt').get();
  const today = mine.docs.filter((d) => (d.get('createdAt')?.toMillis?.() ?? 0) >= nowMs - DAY_MS).length;
  if (today >= MAX_A_DAY) return { ok: false, problem: 'too_many' };
  const id = newRequestId();
  await db().doc(`${TRIP_REQUESTS}/${id}`).create({
    fromUid: uid,
    name,
    phoneE164: phone,
    createdAt: admin.firestore.Timestamp.fromMillis(nowMs),
    expiresAt: admin.firestore.Timestamp.fromMillis(nowMs + REQUEST_DAYS * DAY_MS),
  });
  return { ok: true, id };
}

export async function readRequest(uid: string, body: Record<string, unknown>, nowMs: number):
  Promise<{ ok: true; name: string; phone: string } | { ok: false; problem: ReadProblem }> {
  if (!isRequestId(body.id)) return { ok: false, problem: 'not_found' };
  const request = (await db().doc(`${TRIP_REQUESTS}/${body.id}`).get()).data();
  if (!request) return { ok: false, problem: 'not_found' };
  if ((request.expiresAt?.toMillis?.() ?? 0) <= nowMs) return { ok: false, problem: 'expired' };
  if (request.fromUid === uid) return { ok: false, problem: 'own' };
  return { ok: true, name: String(request.name), phone: String(request.phoneE164) };
}

/** Deleting an account: the links it made stop working at once */
export async function deleteTripRequests(uid: string): Promise<number> {
  const mine = await db().collection(TRIP_REQUESTS).where('fromUid', '==', uid).get();
  await Promise.all(mine.docs.map((d) => d.ref.delete()));
  return mine.size;
}

export const tripRequests = functions.https.onCall(async (data: unknown, context) => {
  const body = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  if (context.auth.token.firebase?.sign_in_provider === 'anonymous') {
    throw new functions.https.HttpsError('permission-denied', 'Sign up first');
  }
  const uid = context.auth.uid;
  switch (body.action) {
    case 'create': return createRequest(uid, body, Date.now());
    case 'read': return readRequest(uid, body, Date.now());
    default: throw new functions.https.HttpsError('invalid-argument', 'Unknown action');
  }
});
