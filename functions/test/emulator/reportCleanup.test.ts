/**
 * What goes with a deleted road report, against the Firestore and Storage emulators.
 * Run with: npm run test:monitor
 */
// Outside the Functions runtime nothing says which bucket holds the photos
process.env.FIREBASE_CONFIG ??= JSON.stringify({
  projectId: process.env.GCLOUD_PROJECT,
  storageBucket: `${process.env.GCLOUD_PROJECT}.appspot.com`,
});

import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import * as admin from 'firebase-admin';
import '../../src/index';
import { removeReportLeftovers } from '../../src/reportCleanup';

const db = () => admin.firestore();
const bucket = () => admin.storage().bucket();
const now = () => admin.firestore.FieldValue.serverTimestamp();
const count = async (query: FirebaseFirestore.Query) => (await query.get()).size;
let seq = 0;

before(() => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'Firestore emulator must be running');
  assert.ok(process.env.FIREBASE_STORAGE_EMULATOR_HOST, 'Storage emulator must be running');
});

/** A report with comments, votes and a flag from other people, and one photo. Returns its id and its author. */
async function reportWithEverything() {
  seq += 1;
  const reportId = `cleanup-report-${Date.now()}-${seq}`;
  const author = `cleanup-author-${seq}`;
  await db().doc(`reports/${reportId}`).set({ uid: author, type: 'pothole', status: 'active', createdAt: now() });
  await db().doc(`reports/${reportId}/resolutionVotes/someone`).set({ voteType: 'resolved', createdAt: now() });
  await db().collection('comments').add({ reportId, uid: 'someone-else', text: 'Still there', status: 'active', createdAt: now() });
  await db().collection('comments').add({ reportId, uid: author, text: 'Thanks', status: 'active', createdAt: now() });
  await db().collection('votes').add({ reportId, uid: 'someone-else', type: 'up', createdAt: now() });
  await db().collection('flags').add({ targetType: 'report', targetId: reportId, reporterId: 'a-third', reason: 'incorrect', details: '', status: 'pending', createdAt: now() });
  await bucket().file(`report_photos/${author}/${reportId}/one.jpg`).save(Buffer.from('not really a photo'));
  return { reportId, author };
}

test('everything that hung off a deleted report goes with it', async () => {
  const { reportId, author } = await reportWithEverything();
  const other = await reportWithEverything();

  // The app deletes the report itself; the server is told afterwards
  await db().doc(`reports/${reportId}`).delete();
  const gone = await removeReportLeftovers(reportId, author);

  assert.deepEqual(gone, { comments: 2, votes: 1, flags: 1 });
  assert.equal(await count(db().collection('comments').where('reportId', '==', reportId)), 0);
  assert.equal(await count(db().collection('votes').where('reportId', '==', reportId)), 0);
  assert.equal(await count(db().collection('flags').where('targetId', '==', reportId)), 0);
  assert.equal(await count(db().collection(`reports/${reportId}/resolutionVotes`)), 0);
  const [photos] = await bucket().getFiles({ prefix: `report_photos/${author}/${reportId}/` });
  assert.equal(photos.length, 0);

  // Another report, and what hangs off it, is not touched
  assert.ok((await db().doc(`reports/${other.reportId}`).get()).exists);
  assert.equal(await count(db().collection('comments').where('reportId', '==', other.reportId)), 2);
  const [otherPhotos] = await bucket().getFiles({ prefix: `report_photos/${other.author}/${other.reportId}/` });
  assert.equal(otherPhotos.length, 1);
});

test('running it again, or with no author known, finds nothing and does no harm', async () => {
  const { reportId, author } = await reportWithEverything();
  await db().doc(`reports/${reportId}`).delete();
  await removeReportLeftovers(reportId, author);

  assert.deepEqual(await removeReportLeftovers(reportId, author), { comments: 0, votes: 0, flags: 0 });
  assert.deepEqual(await removeReportLeftovers(reportId, null), { comments: 0, votes: 0, flags: 0 });
});
