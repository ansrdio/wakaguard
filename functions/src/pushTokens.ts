/**
 * @fileoverview Notification links that no longer reach a phone
 *
 * A phone's link (its FCM token, in `pushSubscriptions/{uid}`) stops working
 * when the app is removed or the link expires. Until 4 November 2026 every
 * send kept trying it: one tester's morning weather failed with "NotRegistered"
 * every day. Now a send that finds a dead link notes it here, and later sends
 * skip it.
 *
 * The note is kept apart, in `deadPushTokens/{uid}` (server only: no rule lets
 * the app read or write it), because the person's own record must keep a link
 * for the app's later writes to pass the rules. When the app saves a new link,
 * it no longer matches the note, so sending starts again by itself. The note
 * goes with the account (accountDeletion.ts).
 *
 * @module pushTokens
 */

import * as admin from 'firebase-admin';

export const DEAD_PUSH_TOKENS = 'deadPushTokens';

/** FCM's codes for a link that will never work again, as opposed to a passing failure */
const DEAD_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
]);

/** Whether a send failed because the link is dead, not for a passing reason */
export function isDeadTokenError(error: unknown): boolean {
  const code = (error as { code?: unknown } | null)?.code;
  if (typeof code === 'string' && DEAD_CODES.has(code)) return true;
  // How the failures were logged: "Error: NotRegistered"
  return /NotRegistered/.test(String(error));
}

/** Whether this link was already found dead */
export async function isDeadToken(uid: string, token: string): Promise<boolean> {
  const note = await admin.firestore().doc(`${DEAD_PUSH_TOKENS}/${uid}`).get();
  return note.exists && note.get('token') === token;
}

/** Notes the link as dead if that is why the send failed. Returns whether it was. */
export async function noteIfDead(uid: string, token: string, error: unknown): Promise<boolean> {
  if (!isDeadTokenError(error)) return false;
  await admin.firestore().doc(`${DEAD_PUSH_TOKENS}/${uid}`).set({
    token,
    at: admin.firestore.FieldValue.serverTimestamp(),
  });
  return true;
}
