/**
 * "Invite friends" (build 27): who invited whom, each friend's progress, the
 * rewards and cash outs. The rules are in referralPlan.ts.
 *
 * Everything here is written by the server only (the database rules refuse
 * every phone), so a phone cannot change a count or a balance:
 *   referrals/{friendUid}     who invited the friend and how far they are
 *   referralMonths/{month}    rewards placed in a month, against the budget
 *   referralInviters/{uid}    rewards placed per month for one inviter
 *   cashOuts/{id}             a request to be paid, and whether it was
 *
 * The app reaches it through one callable function, `referrals`, with an
 * action: "join" (who invited me), "summary" (the Invite friends screen),
 * "cashOut", and "fromTrip" (the username behind a trip link, for the page a
 * contact opens from "Get WakaGuard"). Trips are counted from onTripUpdated
 * (tripMonitor.ts), and a friend whose 4 trips are done is checked again when
 * they add a contact (textOptOut.ts).
 */

import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getNumberSetting } from './config';
import { ID_PATTERN } from './tripLocation';
import { isConfirmedAccount } from './confirmedAccount';
import {
  ACCOUNTS_FROM_MS, addTrip, balanceOf, CASH_OUT_OPENS_MS, cashOutProblem, deadlineOf, HOLD_DAYS, joinProblem, lagosMonth,
  MIN_CASH_OUT_NAIRA, MONTHLY_REWARDS, paidDetails, PER_PERSON_MONTHLY, placeReward, readPayTo, readUsername,
  refusalFor, REWARD_NAIRA, TRIPS_NEEDED, tripProblem, tripsDone, WINDOW_DAYS,
} from './referralPlan';

type DocData = FirebaseFirestore.DocumentData;

const DAY_MS = 24 * 60 * 60 * 1000;
/** Months read ahead when placing a reward; a budget full for half a year is far past anything planned */
const MONTHS_AHEAD = 6;
/** "Get WakaGuard" on a contact's page names the traveller for this long after the trip */
const FROM_TRIP_DAYS = 7;
/** The Invite friends screen lists this many friends, newest first */
const FRIENDS_SHOWN = 100;

const db = () => admin.firestore();

/**
 * Accounts made from this moment count as invited. Only the local emulators
 * set REFERRALS_ACCOUNTS_FROM_MS, to try this out before 11 November; never
 * set it on the live project.
 */
const accountsFromMs = () => getNumberSetting('REFERRALS_ACCOUNTS_FROM_MS', ACCOUNTS_FROM_MS);

const ms = (value: unknown): number | null => {
  const t = value as { toMillis?: () => number } | null | undefined;
  return typeof t?.toMillis === 'function' ? t.toMillis() : null;
};

const strings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

// ---------------------------------------------------------------- counting

/**
 * Counts a trip towards the friend's 4 at the moment it ends with "I've
 * arrived". Called from onTripUpdated for every trip change; most people were
 * not invited, which costs one read.
 */
export async function countReferralTrip(uid: string, before: DocData, after: DocData, createdMs: number | null): Promise<void> {
  const wasOpen = before.status === 'active' || before.status === 'emergency';
  if (!wasOpen || after.status !== 'completed') return;

  const ref = db().doc(`referrals/${uid}`);
  const referral = (await ref.get()).data();
  if (!referral || referral.state !== 'counting') return;

  const nowMs = Date.now();
  const startMs = ms(after.startTime);
  const problem = tripProblem({
    status: after.status,
    isTest: after.isTest,
    startMs,
    endMs: ms(after.endTime),
    createdMs: createdMs ?? startMs ?? nowMs,
    endedSeenMs: nowMs,
    startLocation: after.startLocation,
    endLocation: after.endLocation,
    farthestM: after.farthestFromStartM,
    positions: after.positionCount,
  });
  if (problem) return;

  const endedMs = Math.min(ms(after.endTime) ?? nowMs, nowMs);
  await db().runTransaction(async (tx) => {
    const now = (await tx.get(ref)).data();
    if (!now || now.state !== 'counting') return;
    const next = addTrip(
      { joinedMs: ms(now.joinedAt) ?? 0, days: strings(now.days), devices: strings(now.devices) },
      endedMs,
      after.trackingDeviceId,
    );
    if (next) tx.update(ref, { days: next.days, devices: next.devices, updatedAt: FieldValue.serverTimestamp() });
  });

  await qualifyIfDone(uid);
}

/**
 * Turns a friend whose 4 trips are done and who has a contact into a reward
 * for the person who invited them, or a refusal when the phones say it is
 * the same person. Safe to call any time: it does nothing otherwise.
 */
export async function qualifyIfDone(friendUid: string): Promise<void> {
  const ref = db().doc(`referrals/${friendUid}`);
  const referral = (await ref.get()).data();
  if (!referral || referral.state !== 'counting' || !tripsDone({ days: strings(referral.days) })) return;

  const contacts = await db().collection(`users/${friendUid}/trustedContacts`).limit(1).get();
  if (contacts.empty) return;
  // Waits, as for the contact: the inviter's screen checks again each time it opens
  if (!(await friendConfirmed(friendUid))) return;

  const inviterUid: string = referral.inviterUid;
  const devices = strings(referral.devices);
  const [inviterTrips, sharing] = await Promise.all([
    db().collection(`users/${inviterUid}/trips`).select('trackingDeviceId').get(),
    devices.length > 0
      ? db().collection('referrals').where('devices', 'array-contains-any', devices.slice(0, 10)).get()
      : null,
  ]);
  const inviterDevices = new Set(strings(inviterTrips.docs.map((doc) => doc.get('trackingDeviceId'))));
  const devicesAlreadyPaid = new Set(
    (sharing?.docs ?? [])
      .filter((doc) => doc.id !== friendUid && doc.get('state') === 'qualified')
      .flatMap((doc) => strings(doc.get('devices'))),
  );
  const refusal = refusalFor(devices, inviterDevices, devicesAlreadyPaid);

  const nowMs = Date.now();
  const firstMonth = lagosMonth(nowMs + HOLD_DAYS * DAY_MS);
  const months = [firstMonth];
  while (months.length < MONTHS_AHEAD) {
    const [year, month] = months[months.length - 1].split('-').map(Number);
    months.push(month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, '0')}`);
  }
  const inviterRef = db().doc(`referralInviters/${inviterUid}`);
  const monthRefs = months.map((month) => db().doc(`referralMonths/${month}`));

  await db().runTransaction(async (tx) => {
    const now = (await tx.get(ref)).data();
    if (!now || now.state !== 'counting' || !tripsDone({ days: strings(now.days) })) return;
    if (refusal) {
      tx.update(ref, { state: 'refused', refusal, decidedAt: FieldValue.serverTimestamp() });
      return;
    }

    const [inviterSnap, ...monthSnaps] = await tx.getAll(inviterRef, ...monthRefs);
    const inviterMonths = (inviterSnap.get('months') ?? {}) as Record<string, number>;
    const monthCounts = new Map(monthSnaps.map((snap, i) => [months[i], Number(snap.get('rewards') ?? 0)]));
    const placed = placeReward(
      nowMs,
      (month) => Number(inviterMonths[month] ?? 0),
      (month) => monthCounts.get(month) ?? 0,
    );

    tx.update(ref, {
      state: 'qualified',
      decidedAt: FieldValue.serverTimestamp(),
      month: placed.month,
      availableAt: Timestamp.fromMillis(placed.availableMs),
      amount: REWARD_NAIRA,
    });
    tx.set(db().doc(`referralMonths/${placed.month}`), {
      rewards: FieldValue.increment(1),
      naira: FieldValue.increment(REWARD_NAIRA),
    }, { merge: true });
    tx.set(inviterRef, { months: { [placed.month]: FieldValue.increment(1) } }, { merge: true });
  });
}

// ---------------------------------------------------------------- the app's calls

type Result = Record<string, unknown>;

async function usernameOf(uid: string): Promise<string | null> {
  const name = (await db().doc(`users/${uid}`).get()).get('username');
  return typeof name === 'string' && name ? name : null;
}

/** False also for an account that is gone, which earns nothing */
async function friendConfirmed(uid: string): Promise<boolean> {
  try {
    return isConfirmedAccount(await admin.auth().getUser(uid));
  } catch {
    return false;
  }
}

async function accountCreatedMs(uid: string): Promise<number> {
  const user = await admin.auth().getUser(uid);
  return Date.parse(user.metadata.creationTime);
}

/** "Who invited you?": the friend names the person by username */
async function join(uid: string, data: Record<string, unknown>): Promise<Result> {
  const name = readUsername(data.inviter);
  if (!name) return { ok: false, problem: 'not_found' };

  const [createdMs, owner] = await Promise.all([
    accountCreatedMs(uid),
    db().doc(`usernames/${name.toLowerCase()}`).get(),
  ]);
  const inviterUid = typeof owner.get('uid') === 'string' ? (owner.get('uid') as string) : null;
  const ref = db().doc(`referrals/${uid}`);
  const via = data.via === 'link' || data.via === 'trip' ? data.via : 'typed';

  return db().runTransaction(async (tx) => {
    const problem = joinProblem({
      uid,
      accountCreatedMs: createdMs,
      alreadyJoined: (await tx.get(ref)).exists,
      inviterUid,
      nowMs: Date.now(),
      accountsFromMs: accountsFromMs(),
    });
    if (problem) return { ok: false, problem };
    tx.create(ref, {
      inviterUid,
      joinedAt: Timestamp.fromMillis(createdMs),
      deadline: Timestamp.fromMillis(deadlineOf(createdMs)),
      days: [],
      devices: [],
      state: 'counting',
      via,
      createdAt: FieldValue.serverTimestamp(),
    });
    return { ok: true };
  });
}

/** How a friend shows on the inviter's screen. Never their trips: only how many days are done */
function friendStatus(referral: DocData, hasContact: boolean | null, confirmed: boolean | null, nowMs: number) {
  const trips = Math.min(strings(referral.days).length, TRIPS_NEEDED);
  const deadlineMs = ms(referral.deadline);
  let state: string = referral.state;
  if (state === 'counting' && trips >= TRIPS_NEEDED) state = hasContact && confirmed === false ? 'needs_confirmed' : 'needs_contact';
  else if (state === 'counting' && deadlineMs != null && nowMs >= deadlineMs) state = 'expired';
  return {
    trips,
    state,
    hasContact,
    deadlineMs,
    availableMs: ms(referral.availableAt),
    refusal: referral.refusal ?? null,
  };
}

/** Everything on the Invite friends screen */
async function summary(uid: string): Promise<Result> {
  const invitedQuery = db().collection('referrals').where('inviterUid', '==', uid);
  let invited = await invitedQuery.get();

  // A friend may have added their contact since their 4th trip
  const waiting = invited.docs.filter((doc) => doc.get('state') === 'counting' && tripsDone({ days: strings(doc.get('days')) }));
  if (waiting.length > 0) {
    await Promise.all(waiting.map((doc) => qualifyIfDone(doc.id).catch((err) => console.error('Could not check a friend', err))));
    invited = await invitedQuery.get();
  }

  const [username, cashOuts, ownReferral, createdMs] = await Promise.all([
    usernameOf(uid),
    db().collection('cashOuts').where('uid', '==', uid).get(),
    db().doc(`referrals/${uid}`).get(),
    accountCreatedMs(uid),
  ]);
  return buildSummary(uid, username, invited.docs, cashOuts.docs, ownReferral, createdMs, Date.now());
}

async function buildSummary(
  uid: string,
  username: string | null,
  invitedDocs: FirebaseFirestore.QueryDocumentSnapshot[],
  cashOutDocs: FirebaseFirestore.QueryDocumentSnapshot[],
  ownReferral: FirebaseFirestore.DocumentSnapshot,
  createdMs: number,
  nowMs: number,
): Promise<Result> {
  const newest = [...invitedDocs]
    .sort((a, b) => (ms(b.get('createdAt')) ?? 0) - (ms(a.get('createdAt')) ?? 0))
    .slice(0, FRIENDS_SHOWN);

  const friends = await Promise.all(newest.map(async (doc) => {
    const referral = doc.data();
    const needsContactCheck = referral.state === 'counting' && tripsDone({ days: strings(referral.days) });
    const [name, contacts, confirmed] = await Promise.all([
      referral.friendDeleted ? null : usernameOf(doc.id),
      needsContactCheck ? db().collection(`users/${doc.id}/trustedContacts`).limit(1).get() : null,
      needsContactCheck ? friendConfirmed(doc.id) : null,
    ]);
    return { name, ...friendStatus(referral, contacts ? !contacts.empty : null, confirmed, nowMs) };
  }));

  const rewards = invitedDocs
    .filter((doc) => doc.get('state') === 'qualified')
    .map((doc) => ({ amount: Number(doc.get('amount') ?? 0), availableMs: ms(doc.get('availableAt')) ?? Infinity }));
  const requests = cashOutDocs.map((doc) => ({ amount: Number(doc.get('amount') ?? 0), state: doc.get('state') }));
  const balance = balanceOf(rewards, requests, nowMs);
  const open = cashOutDocs.find((doc) => doc.get('state') === 'requested');

  const own = ownReferral.data();
  const canJoin = !own && joinProblem({
    uid, accountCreatedMs: createdMs, alreadyJoined: false, inviterUid: 'someone else', nowMs, accountsFromMs: accountsFromMs(),
  }) === null;

  return {
    ok: true,
    username,
    friends,
    balance,
    cashOut: {
      opensMs: CASH_OUT_OPENS_MS,
      minimum: MIN_CASH_OUT_NAIRA,
      problem: cashOutProblem(balance, nowMs),
      request: open
        ? { amount: open.get('amount'), method: open.get('payTo')?.method ?? null, requestedMs: ms(open.get('requestedAt')) }
        : null,
    },
    invitedBy: own ? { name: own.inviterUid ? await usernameOf(own.inviterUid) : null } : null,
    canJoin,
    rules: {
      reward: REWARD_NAIRA,
      tripsNeeded: TRIPS_NEEDED,
      windowDays: WINDOW_DAYS,
      holdDays: HOLD_DAYS,
      perPersonMonthly: PER_PERSON_MONTHLY,
      monthlyRewards: MONTHLY_REWARDS,
    },
  };
}

/** Asks to be paid everything that is ready, as airtime or by bank transfer */
async function cashOut(uid: string, data: Record<string, unknown>): Promise<Result> {
  const payTo = readPayTo(data);
  if (!payTo) return { ok: false, problem: 'details' };

  const inviterRef = db().doc(`referralInviters/${uid}`);
  return db().runTransaction(async (tx) => {
    // Read first so that two presses at once are taken one after the other
    await tx.get(inviterRef);
    const [rewardsSnap, cashOutsSnap] = await Promise.all([
      tx.get(db().collection('referrals').where('inviterUid', '==', uid).where('state', '==', 'qualified')),
      tx.get(db().collection('cashOuts').where('uid', '==', uid)),
    ]);
    const nowMs = Date.now();
    const balance = balanceOf(
      rewardsSnap.docs.map((doc) => ({ amount: Number(doc.get('amount') ?? 0), availableMs: ms(doc.get('availableAt')) ?? Infinity })),
      cashOutsSnap.docs.map((doc) => ({ amount: Number(doc.get('amount') ?? 0), state: doc.get('state') })),
      nowMs,
    );
    const problem = cashOutProblem(balance, nowMs);
    if (problem) return { ok: false, problem };

    tx.set(db().collection('cashOuts').doc(), {
      uid,
      amount: balance.ready,
      state: 'requested',
      payTo,
      requestedAt: FieldValue.serverTimestamp(),
    });
    tx.set(inviterRef, { lastCashOutAt: FieldValue.serverTimestamp() }, { merge: true });
    return { ok: true, amount: balance.ready };
  });
}

/**
 * For "Get WakaGuard" on the page a contact opens from a trip link: the
 * traveller's username, but only once the trip ended with "I've arrived" (a
 * real trip, not a test). The page cannot read an ended trip itself, as its
 * last location stays private, so this answer is also how it knows to offer
 * the app at all; it is never offered while someone is late or after an SOS
 * that was not closed with "I've arrived".
 */
async function fromTrip(data: Record<string, unknown>): Promise<Result> {
  const token = data.trip;
  if (typeof token !== 'string' || !ID_PATTERN.test(token)) return { ok: false, problem: 'not_found' };
  const shared = (await db().doc(`sharedTrips/${token}`).get()).data();
  if (!shared || shared.status !== 'completed' || shared.isTest === true || typeof shared.uid !== 'string') {
    return { ok: false, problem: 'not_found' };
  }
  // Only for a while after the trip, as with the page itself (security review, 4 November 2026)
  const lastMs = ms(shared.lastUpdate) ?? ms(shared.createdAt);
  if (lastMs == null || Date.now() - lastMs > FROM_TRIP_DAYS * DAY_MS) return { ok: false, problem: 'not_found' };
  const name = await usernameOf(shared.uid);
  return name ? { ok: true, name } : { ok: false, problem: 'not_found' };
}

export const referrals = functions.https.onCall(async (data: unknown, context) => {
  const body = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  // A contact who has no account opens this from a trip link
  if (body.action === 'fromTrip') return fromTrip(body);

  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  if (context.auth.token.firebase?.sign_in_provider === 'anonymous') {
    throw new functions.https.HttpsError('permission-denied', 'Sign up to invite friends');
  }
  const uid = context.auth.uid;
  switch (body.action) {
    case 'join': return join(uid, body);
    case 'summary': return summary(uid);
    case 'cashOut': return cashOut(uid, body);
    default: throw new functions.https.HttpsError('invalid-argument', 'Unknown action');
  }
});

// ---------------------------------------------------------------- the owner's tool and deleting an account

/** Marks a cash out paid, keeping only the last 4 digits of where it went */
export async function markCashOutPaid(id: string): Promise<'paid' | 'not_requested'> {
  const ref = db().doc(`cashOuts/${id}`);
  return db().runTransaction(async (tx) => {
    const cash = (await tx.get(ref)).data();
    if (!cash || cash.state !== 'requested') return 'not_requested';
    tx.update(ref, { state: 'paid', paidAt: FieldValue.serverTimestamp(), payTo: paidDetails(cash.payTo) });
    return 'paid';
  });
}

/**
 * What deleting an account does here. As a friend: their progress goes,
 * unless it already earned the inviter a reward, which stays the inviter's
 * with the friend's phones and days removed. As an inviter: their friends'
 * progress and any unpaid request go; a paid cash out is kept for the books
 * with the account removed from it.
 */
export async function deleteReferralData(uid: string): Promise<void> {
  const ownRef = db().doc(`referrals/${uid}`);
  const own = (await ownRef.get()).data();
  if (own?.state === 'qualified') {
    await ownRef.update({ friendDeleted: true, days: [], devices: [] });
  } else if (own) {
    await ownRef.delete();
  }

  const [invited, cashOuts] = await Promise.all([
    db().collection('referrals').where('inviterUid', '==', uid).get(),
    db().collection('cashOuts').where('uid', '==', uid).get(),
  ]);
  const writes = [
    ...invited.docs.map((doc) => (batch: FirebaseFirestore.WriteBatch) => batch.delete(doc.ref)),
    ...cashOuts.docs.map((doc) => (batch: FirebaseFirestore.WriteBatch) => (doc.get('state') === 'paid'
      ? batch.update(doc.ref, { uid: FieldValue.delete(), accountDeleted: true })
      : batch.delete(doc.ref))),
  ];
  for (let i = 0; i < writes.length; i += 400) {
    const batch = db().batch();
    writes.slice(i, i + 400).forEach((write) => write(batch));
    await batch.commit();
  }
  await db().doc(`referralInviters/${uid}`).delete();
}
