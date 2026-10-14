/**
 * The comment count on a road report, against the Firestore emulator.
 * Run with: npm run test:monitor
 */
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import * as admin from 'firebase-admin';
import '../../src/index';
import { recountComments } from '../../src/commentCount';

const db = () => admin.firestore();
const now = () => admin.firestore.FieldValue.serverTimestamp();
let seq = 0;

before(() => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'Firestore emulator must be running');
});

async function report(commentCount: number) {
  seq += 1;
  const id = `count-report-${Date.now()}-${seq}`;
  await db().doc(`reports/${id}`).set({ uid: 'the-author', type: 'pothole', status: 'active', commentCount, createdAt: now() });
  return id;
}

const comment = (reportId: string, status?: string) =>
  db().collection('comments').add({ uid: 'someone', reportId, text: 'A comment', ...(status === undefined ? {} : { status }), createdAt: now() });

const countOn = async (id: string) => (await db().doc(`reports/${id}`).get()).get('commentCount');

test('the count is the comments the report shows, whatever it said before', async () => {
  const id = await report(-1);
  await comment(id, 'active');
  await comment(id); // an old comment with no status still shows
  await comment(id, 'hidden');
  await comment(id, 'removed');
  assert.equal(await recountComments(id), 2);
  assert.equal(await countOn(id), 2);
});

test('a hidden comment comes off the count, and back on when it is put back', async () => {
  const id = await report(0);
  const first = await comment(id, 'active');
  await comment(id, 'active');
  assert.equal(await recountComments(id), 2);
  await first.update({ status: 'hidden' });
  assert.equal(await recountComments(id), 1);
  await first.update({ status: 'active' });
  assert.equal(await recountComments(id), 2);
  await first.delete();
  assert.equal(await recountComments(id), 1);
});

test('a report that has been deleted is left alone, without an error', async () => {
  const id = await report(3);
  await comment(id, 'active');
  await db().doc(`reports/${id}`).delete();
  assert.equal(await recountComments(id), null);
  assert.equal((await db().doc(`reports/${id}`).get()).exists, false);
});

test('a comment with no report is ignored', async () => {
  assert.equal(await recountComments(undefined), null);
  assert.equal(await recountComments(''), null);
});
