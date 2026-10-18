/**
 * @fileoverview "Stop WakaGuard texts to my number", for trusted contacts
 *
 * Texts come from a sender name, so a contact cannot reply STOP. Instead the
 * trip page that every text with a link opens has a form: the contact enters
 * the number the text came to and, if it is one of that trip's contacts,
 * WakaGuard never texts that number again, for anyone's trips. Holding the
 * link is the proof, as only someone who was texted has it. (A code sent by
 * text was considered and dropped: our sender is approved for alerts only.)
 *
 * smsOptOuts/{number} is what the server checks before every text
 * (getTrustedContacts in safetyDelivery.ts). Every traveller's copy of that
 * contact carries smsOptedOut: true, so the app shows they will not be told
 * and leaves them out of trips. Texts can be turned back on the same way.
 *
 * @module textOptOut
 */

import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { isValidE164, OPT_OUTS } from './safetyDelivery';
import { ID_PATTERN } from './tripLocation';
import { nextTry, numberOnTrip, OptOutRequest, readOptOutRequest } from './textOptOutPlan';
import { answerBrowser } from './webOrigins';

export type OptOutOutcome = 'stopped' | 'resumed' | 'not_matched' | 'too_many';

/** Tries from each trip link, so that numbers cannot be guessed one after another */
const TRIES = 'textOptOutTries';

/** Set or clear the mark on each traveller's copy of this contact */
async function markCopies(refs: FirebaseFirestore.DocumentReference[], stopped: boolean): Promise<void> {
  const db = admin.firestore();
  for (let i = 0; i < refs.length; i += 400) {
    const batch = db.batch();
    refs.slice(i, i + 400).forEach((ref) =>
      batch.update(ref, { smsOptedOut: stopped ? true : FieldValue.delete() })
    );
    await batch.commit();
  }
}

export async function applyOptOut(request: OptOutRequest, nowMs = Date.now()): Promise<OptOutOutcome> {
  const db = admin.firestore();
  const { token, phoneE164, action } = request;

  // The link's code is the trip's id; the shared copy says whose trip it is.
  // A code that is no trip's is answered before anything is written.
  const shared = (await db.doc(`sharedTrips/${token}`).get()).data();
  const uid = shared?.uid;
  if (typeof uid !== 'string' || !ID_PATTERN.test(uid)) return 'not_matched';

  const allowed = await db.runTransaction(async (tx) => {
    const ref = db.doc(`${TRIES}/${token}`);
    const prev = (await tx.get(ref)).data();
    const next = nextTry(
      prev ? { startMs: (prev.windowStart as Timestamp).toMillis(), count: Number(prev.count) || 0 } : null,
      nowMs
    );
    tx.set(ref, { windowStart: Timestamp.fromMillis(next.startMs), count: next.count });
    return next.allowed;
  });
  if (!allowed) return 'too_many';

  const trip = (await db.doc(`users/${uid}/trips/${token}`).get()).data();
  const contacts = await db.collection(`users/${uid}/trustedContacts`).get();
  const listed = contacts.docs.map((d) => ({ id: d.id, phoneE164: d.get('phoneE164') }));
  if (!numberOnTrip(phoneE164, listed, trip?.trustedContactIds)) return 'not_matched';

  const stopped = action === 'stop';
  await db.doc(`${OPT_OUTS}/${phoneE164}`).set({
    phoneE164,
    stopped,
    [stopped ? 'stoppedAt' : 'resumedAt']: FieldValue.serverTimestamp(),
    // Which trip's link was used, in case a contact says they never asked
    viaUid: uid,
    viaTripId: token,
  }, { merge: true });

  // This traveller's copies first: they need no index and matter most
  const own = contacts.docs.filter((d) => d.get('phoneE164') === phoneE164).map((d) => d.ref);
  await markCopies(own, stopped);
  try {
    const everywhere = await db.collectionGroup('trustedContacts').where('phoneE164', '==', phoneE164).get();
    const ownPaths = new Set(own.map((r) => r.path));
    await markCopies(everywhere.docs.map((d) => d.ref).filter((r) => !ownPaths.has(r.path)), stopped);
  } catch (err) {
    // Texts are still stopped (the list is checked before every text); other
    // travellers' copies are marked when they are next saved
    console.error(`Could not mark other travellers' copies of a contact: ${String(err)}`);
  }

  console.log(`Texts ${stopped ? 'stopped' : 'turned back on'} for a contact of ${uid}, from trip ${token}`);
  return stopped ? 'stopped' : 'resumed';
}

/** Bring one saved contact's mark in line with the list (for contacts added or changed later) */
export async function markIfStopped(
  ref: FirebaseFirestore.DocumentReference,
  data: FirebaseFirestore.DocumentData | undefined
): Promise<void> {
  if (!data) return;
  const phone = data.phoneE164;
  const stopped = typeof phone === 'string' && isValidE164(phone)
    && (await admin.firestore().doc(`${OPT_OUTS}/${phone}`).get()).get('stopped') === true;
  if (stopped !== (data.smsOptedOut === true)) {
    await ref.update({ smsOptedOut: stopped ? true : FieldValue.delete() });
  }
}

export const onTrustedContactWrite = functions.firestore
  .document('users/{uid}/trustedContacts/{contactId}')
  .onWrite((change) => (change.after.exists ? markIfStopped(change.after.ref, change.after.data()) : null));

export const stopTexts = functions.https.onRequest(async (req, res) => {
  if (answerBrowser(req, res)) return;
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }
  const request = readOptOutRequest(req.body);
  if (!request) {
    res.status(400).json({ error: 'invalid_request' });
    return;
  }
  const outcome = await applyOptOut(request);
  if (outcome === 'stopped' || outcome === 'resumed') res.status(200).json({ ok: true, done: outcome });
  else if (outcome === 'too_many') res.status(429).json({ error: 'too_many' });
  else res.status(403).json({ error: 'not_matched' });
});
