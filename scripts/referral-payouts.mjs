/**
 * Invite friends, for the owner: who has asked to be paid, the month's
 * budget, and a way to mark payments made (functions/src/referrals.ts).
 *
 *   node scripts/referral-payouts.mjs --emulator
 *   node scripts/referral-payouts.mjs --live
 *   node scripts/referral-payouts.mjs --live --paid <id>,<id>
 *
 * Without --paid it only reads. Against the live project it reads personal
 * data, so run it there only when the owner has asked for that run; --paid
 * writes, and needs the owner's word for each run. It needs a Google sign-in
 * on this computer first: gcloud auth application-default login
 *
 * The screen shows usernames, amounts and the last 4 digits only. The full
 * airtime numbers and bank details, which the owner needs to pay, go into a
 * file in ranking/ (kept out of git) and nowhere else. Once a payment is
 * marked paid, the server keeps only the last 4 digits.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const LIVE_PROJECT = 'routepulse-5701f';
const EMULATOR_PROJECT = 'demo-wakaguard';
const MONTHLY_BUDGET_NAIRA = 200_000;
const LAGOS_OFFSET_MS = 60 * 60 * 1000;

const at = (value) => (typeof value?.toMillis === 'function' ? value.toMillis() : null);
const lagosDay = (ms) => new Date(ms + LAGOS_OFFSET_MS).toISOString().slice(0, 10);
const lagosMonth = (ms) => lagosDay(ms).slice(0, 7);
const naira = (n) => `N${Number(n).toLocaleString('en-NG')}`;
const ending = (digits) => (digits ? `...${String(digits).slice(-4)}` : '');

/** How a request is to be paid, in a few words, with the last 4 digits only */
export function payToShort(payTo) {
  if (payTo?.method === 'airtime') return `airtime to ${ending(payTo.phone ?? payTo.phoneEnding)}`;
  if (payTo?.method === 'bank') return `bank transfer, ${payTo.bankName ?? '?'} ${ending(payTo.accountNumber ?? payTo.accountEnding)}`;
  return 'unknown';
}

/** Several people asking to be paid to the same number or account is worth a look */
export function sharedDestinations(requests) {
  const byPlace = new Map();
  for (const request of requests) {
    const key = request.payTo?.method === 'airtime' ? `airtime ${request.payTo.phone}`
      : request.payTo?.method === 'bank' ? `bank ${request.payTo.accountNumber}` : null;
    if (!key) continue;
    if (!byPlace.has(key)) byPlace.set(key, new Set());
    byPlace.get(key).add(request.name);
  }
  return [...byPlace.values()].filter((names) => names.size > 1).map((names) => [...names]);
}

const csvCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;

async function main() {
  const args = process.argv.slice(2);
  const live = args.includes('--live');
  const emulator = args.includes('--emulator');
  const paidAt = args.indexOf('--paid');
  const toMark = paidAt >= 0 ? (args[paidAt + 1] || '').split(',').map((id) => id.trim()).filter(Boolean) : [];
  if (live === emulator) throw new Error('Say where to read from: --emulator or --live.');
  if (paidAt >= 0 && toMark.length === 0) throw new Error('--paid needs the ids of the requests paid, separated by commas.');

  let projectId = LIVE_PROJECT;
  if (emulator) {
    projectId = EMULATOR_PROJECT;
    process.env.FIRESTORE_EMULATOR_HOST ||= '127.0.0.1:8080';
  } else if (process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error('FIRESTORE_EMULATOR_HOST is set, so --live would use the emulator. Unset it first.');
  }

  // firebase-admin is installed for the Cloud Functions, so load it from there
  const require = createRequire(new URL('../functions/package.json', import.meta.url));
  const admin = require('firebase-admin');
  admin.initializeApp({ projectId });
  const db = admin.firestore();

  if (toMark.length > 0) {
    for (const id of toMark) {
      const ref = db.doc(`cashOuts/${id}`);
      const done = await db.runTransaction(async (tx) => {
        const cash = (await tx.get(ref)).data();
        if (!cash || cash.state !== 'requested') return false;
        const payTo = cash.payTo || {};
        // The same as paidDetails in functions/src/referralPlan.ts
        const kept = payTo.method === 'airtime'
          ? { method: 'airtime', phoneEnding: String(payTo.phone || '').slice(-4) }
          : { method: 'bank', bankName: payTo.bankName || '', accountEnding: String(payTo.accountNumber || '').slice(-4) };
        tx.update(ref, { state: 'paid', paidAt: admin.firestore.FieldValue.serverTimestamp(), payTo: kept });
        return true;
      });
      console.log(done ? `Marked paid: ${id}` : `Not marked: ${id} is not a request waiting to be paid.`);
    }
    await admin.app().delete();
    return;
  }

  const nowMs = Date.now();
  const month = lagosMonth(nowMs);
  const [requested, referrals, monthDoc] = await Promise.all([
    db.collection('cashOuts').where('state', '==', 'requested').get(),
    db.collection('referrals').select('state', 'inviterUid', 'month', 'refusal').get(),
    db.doc(`referralMonths/${month}`).get(),
  ]);
  const uids = new Set([...requested.docs.map((doc) => doc.get('uid')), ...referrals.docs.map((doc) => doc.get('inviterUid'))]);
  const names = new Map();
  await Promise.all([...uids].filter(Boolean).map(async (uid) => {
    names.set(uid, (await db.doc(`users/${uid}`).get()).get('username') || uid.slice(0, 6));
  }));

  const requests = requested.docs
    .map((doc) => ({ id: doc.id, name: names.get(doc.get('uid')) || '?', amount: doc.get('amount'), payTo: doc.get('payTo'), requestedMs: at(doc.get('requestedAt')) }))
    .sort((a, b) => (a.requestedMs ?? 0) - (b.requestedMs ?? 0));

  console.log(`Invite friends: ${emulator ? `local emulator (${projectId})` : `live project ${projectId}`}`);
  console.log();
  console.log(`A. WAITING TO BE PAID (${requests.length}, ${naira(requests.reduce((sum, r) => sum + r.amount, 0))})`);
  for (const r of requests) {
    console.log(`  ${r.id}  ${r.name}  ${naira(r.amount)}  ${payToShort(r.payTo)}  asked ${r.requestedMs ? lagosDay(r.requestedMs) : '?'}`);
  }
  for (const names of sharedDestinations(requests)) {
    console.log(`  CHECK: ${names.join(', ')} asked to be paid to the same number or account.`);
  }
  if (requests.length > 0) {
    mkdirSync(new URL('../ranking/', import.meta.url), { recursive: true });
    const file = new URL(`../ranking/payouts-${lagosDay(nowMs)}.csv`, import.meta.url);
    const rows = [['id', 'username', 'amount', 'method', 'phone', 'bank', 'account number', 'account name']]
      .concat(requests.map((r) => [r.id, r.name, r.amount, r.payTo?.method, r.payTo?.phone, r.payTo?.bankName,
        r.payTo?.accountNumber, r.payTo?.accountName]));
    writeFileSync(file, `${rows.map((row) => row.map(csvCell).join(',')).join('\n')}\n`, { mode: 0o600 });
    console.log(`  Full details to pay with: ranking/payouts-${lagosDay(nowMs)}.csv (on this computer only)`);
    console.log('  When paid: node scripts/referral-payouts.mjs --live --paid <id>,<id>');
  }

  const states = {};
  for (const doc of referrals.docs) states[doc.get('state')] = (states[doc.get('state')] || 0) + 1;
  const rewardsThisMonth = Number(monthDoc.get('rewards') || 0);
  console.log();
  console.log('B. FRIENDS');
  console.log(`  Counting ${states.counting || 0}, earned a reward ${states.qualified || 0}, ended ${states.expired || 0}, `
    + `refused ${states.refused || 0}`);
  console.log(`  Rewards in ${month}: ${rewardsThisMonth} (${naira(rewardsThisMonth * 500)} of the ${naira(MONTHLY_BUDGET_NAIRA)} budget)`);

  const byInviter = new Map();
  for (const doc of referrals.docs) {
    const name = names.get(doc.get('inviterUid')) || '?';
    const row = byInviter.get(name) || { friends: 0, earned: 0, refused: 0 };
    row.friends++;
    if (doc.get('state') === 'qualified') row.earned++;
    if (doc.get('state') === 'refused') row.refused++;
    byInviter.set(name, row);
  }
  const top = [...byInviter].sort((a, b) => b[1].friends - a[1].friends).slice(0, 10);
  if (top.length > 0) {
    console.log('  Most friends invited:');
    for (const [name, row] of top) {
      console.log(`    ${name}: ${row.friends} friends, ${row.earned} earned${row.refused ? `, ${row.refused} refused (same phone)` : ''}`);
    }
  }
  await admin.app().delete();
}

// Run as a script
if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  main().catch((error) => {
    const message = error?.message || String(error);
    console.error(message);
    if (/default credentials|invalid_grant|reauth|UNAUTHENTICATED/i.test(message)) {
      console.error('\nSign in on this computer first: gcloud auth application-default login');
    }
    process.exit(1);
  });
}
