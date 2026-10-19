/**
 * The daily deletion of records past their time (retentionPlan.ts has how
 * long each kind is kept), so that nothing is kept for ever by default.
 *
 * Each kind is found by a date the record already carries, so records kept
 * from before this ran are covered too, with nothing to stamp on them. A road
 * report deleted here takes its photos, comments and votes with it
 * (reportCleanup.ts runs on its deletion), and a deleted comment leaves its
 * report's count right (commentCount.ts counts afresh). Fault reports and
 * the kept weather areas have their own deletion and are not repeated here.
 * Counts only go to the log, never what a record held.
 *
 * @module recordRetention
 */

import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { cutoffMs, DELETE_BATCH, isInAccount, KEEP_DAYS, MAX_DELETED_PER_KIND } from './retentionPlan';

type Query = FirebaseFirestore.Query;
type Doc = FirebaseFirestore.QueryDocumentSnapshot;

interface Kind {
  name: string;
  query: (db: FirebaseFirestore.Firestore, nowMs: number) => Query;
  /** Only these of what the query finds are deleted */
  only?: (doc: Doc) => boolean;
}

const before = (nowMs: number, days: number) => Timestamp.fromMillis(cutoffMs(nowMs, days));

export const KINDS: Kind[] = [
  {
    name: 'endedTrips',
    query: (db, nowMs) => db.collectionGroup('trips')
      .where('status', 'in', ['completed', 'cancelled'])
      .where('expiresAt', '<', before(nowMs, KEEP_DAYS.endedTrip)),
    only: (doc) => isInAccount(doc.ref.path, 'trips'),
  },
  {
    name: 'tripPages',
    query: (db, nowMs) => db.collection('sharedTrips').where('expiresAt', '<', before(nowMs, KEEP_DAYS.tripPage)),
  },
  {
    name: 'sosAlerts',
    query: (db, nowMs) => db.collectionGroup('alerts').where('createdAt', '<', before(nowMs, KEEP_DAYS.sosAndCheckIns)),
    only: (doc) => isInAccount(doc.ref.path, 'alerts'),
  },
  {
    name: 'checkIns',
    query: (db, nowMs) => db.collectionGroup('checkIns').where('createdAt', '<', before(nowMs, KEEP_DAYS.sosAndCheckIns)),
    only: (doc) => isInAccount(doc.ref.path, 'checkIns'),
  },
  {
    name: 'safetyTimers',
    query: (db, nowMs) => db.collectionGroup('safetyTimers').where('createdAt', '<', before(nowMs, KEEP_DAYS.sosAndCheckIns)),
    only: (doc) => isInAccount(doc.ref.path, 'safetyTimers'),
  },
  {
    name: 'textLogs',
    query: (db, nowMs) => db.collection('safetyMessageLogs').where('createdAt', '<', before(nowMs, KEEP_DAYS.textLog)),
  },
  {
    name: 'oldReports',
    query: (db, nowMs) => db.collection('reports')
      .where('status', 'in', ['expired', 'resolved'])
      .where('expiresAt', '<', before(nowMs, KEEP_DAYS.oldReport)),
  },
  {
    name: 'removedComments',
    query: (db, nowMs) => db.collection('comments')
      .where('status', '==', 'removed')
      .where('createdAt', '<', before(nowMs, KEEP_DAYS.removedComment)),
  },
  {
    name: 'stopTextTries',
    query: (db, nowMs) => db.collection('textOptOutTries').where('startMs', '<', cutoffMs(nowMs, KEEP_DAYS.workingRecord)),
  },
  {
    name: 'placeNameTries',
    query: (db, nowMs) => db.collection('placeNameTries').where('startMs', '<', cutoffMs(nowMs, KEEP_DAYS.workingRecord)),
  },
  {
    name: 'weatherForecasts',
    query: (db, nowMs) => db.collection('weatherForecasts').where('fetchedMs', '<', cutoffMs(nowMs, KEEP_DAYS.workingRecord)),
  },
];

/** Deletes what one kind's query finds, page by page, up to the most one run deletes */
async function deleteKind(db: FirebaseFirestore.Firestore, kind: Kind, nowMs: number): Promise<number> {
  let deleted = 0;
  let last: Doc | undefined;
  while (deleted < MAX_DELETED_PER_KIND) {
    let page = kind.query(db, nowMs).limit(DELETE_BATCH);
    if (last) page = page.startAfter(last);
    const found = await page.get();
    if (found.empty) break;
    last = found.docs[found.docs.length - 1];
    const due = kind.only ? found.docs.filter(kind.only) : found.docs;
    if (due.length > 0) {
      const batch = db.batch();
      due.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
      deleted += due.length;
    }
    if (found.size < DELETE_BATCH) break;
  }
  return deleted;
}

/** One run over every kind; a kind that fails does not stop the others */
export async function runRecordDeletion(nowMs: number): Promise<Record<string, number>> {
  const db = admin.firestore();
  const counts: Record<string, number> = {};
  for (const kind of KINDS) {
    try {
      counts[kind.name] = await deleteKind(db, kind, nowMs);
    } catch (error) {
      counts[kind.name] = -1;
      console.error(`Record deletion: could not delete old ${kind.name}: ${String(error)}`);
    }
  }
  console.log(`Record deletion: ${Object.entries(counts).map(([name, n]) => `${name}=${n}`).join(', ')}`);
  return counts;
}

export const deleteOldRecords = functions
  .runWith({ timeoutSeconds: 300, memory: '256MB' })
  .pubsub.schedule('0 3 * * *')
  .timeZone('Africa/Lagos')
  .onRun(async () => {
    await runRecordDeletion(Date.now());
    return null;
  });
