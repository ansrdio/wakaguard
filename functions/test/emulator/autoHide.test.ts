/**
 * Hiding a post that several people reported, against the Firestore emulator.
 * Run with: npm run test:monitor
 */
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import * as admin from 'firebase-admin';
import '../../src/index';
import { weighReportsOf } from '../../src/autoHide';

const db = () => admin.firestore();
const now = () => admin.firestore.FieldValue.serverTimestamp();
let seq = 0;

before(() => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'Firestore emulator must be running');
});

async function post(kind: 'report' | 'comment', author = 'the-author') {
  seq += 1;
  const id = `hide-${kind}-${Date.now()}-${seq}`;
  const path = `${kind === 'report' ? 'reports' : 'comments'}/${id}`;
  await db().doc(path).set(kind === 'report'
    ? { uid: author, type: 'pothole', status: 'active', flagCount: 0, createdAt: now() }
    : { uid: author, reportId: 'some-report', text: 'A comment', status: 'active', createdAt: now() });
  return { id, path };
}

const reportedBy = (kind: 'report' | 'comment', targetId: string, reporterId: string, status = 'pending') =>
  db().collection('flags').add({ targetType: kind, targetId, reporterId, reason: 'incorrect', details: '', status, createdAt: now() });

const get = async (path: string) => (await db().doc(path).get()).data() ?? {};

test('a road report stays up for two reporters and is hidden by the third', async () => {
  const { id, path } = await post('report');

  await reportedBy('report', id, 'person-1');
  assert.equal(await weighReportsOf('report', id), 'counted');
  await reportedBy('report', id, 'person-2');
  assert.equal(await weighReportsOf('report', id), 'counted');
  assert.equal((await get(path)).status, 'active');
  assert.equal((await get(path)).flagCount, 2);

  await reportedBy('report', id, 'person-3');
  assert.equal(await weighReportsOf('report', id), 'hidden');
  const hidden = await get(path);
  assert.equal(hidden.status, 'flagged');
  assert.equal(hidden.hiddenBy, 'reports');
  assert.equal(hidden.flagCount, 3);
  assert.ok(hidden.hiddenAt);
});

test('one person cannot hide a post alone, nor can its author', async () => {
  const { id, path } = await post('report', 'the-author');
  for (let i = 0; i < 5; i++) await reportedBy('report', id, 'one-person');
  await reportedBy('report', id, 'the-author');
  assert.equal(await weighReportsOf('report', id), 'counted');
  assert.equal((await get(path)).status, 'active');
  assert.equal((await get(path)).flagCount, 1);
});

test('a comment is hidden the same way, and only its status changes', async () => {
  const { id, path } = await post('comment');
  for (const who of ['person-1', 'person-2', 'person-3']) await reportedBy('comment', id, who);
  assert.equal(await weighReportsOf('comment', id), 'hidden');
  const hidden = await get(path);
  assert.equal(hidden.status, 'hidden');
  assert.equal(hidden.text, 'A comment');
  assert.equal(hidden.flagCount, undefined);
});

test('a post that was put back needs three new people to hide it again', async () => {
  const { id, path } = await post('report');
  for (const who of ['person-1', 'person-2', 'person-3']) await reportedBy('report', id, who, 'dismissed');
  await reportedBy('report', id, 'person-4');
  assert.equal(await weighReportsOf('report', id), 'counted');
  assert.equal((await get(path)).status, 'active');
});

test('reports of a comment do not hide a road report with the same id, and a deleted post is left alone', async () => {
  const { id, path } = await post('report');
  for (const who of ['person-1', 'person-2', 'person-3']) await reportedBy('comment', id, who);
  assert.equal(await weighReportsOf('report', id), 'counted');
  assert.equal((await get(path)).status, 'active');

  assert.equal(await weighReportsOf('report', 'no-such-report'), 'gone');
  assert.equal(await weighReportsOf('trip', id), 'ignored');
});

test('a post already hidden or resolved is not touched again', async () => {
  const { id, path } = await post('report');
  await db().doc(path).update({ status: 'resolved' });
  for (const who of ['person-1', 'person-2', 'person-3']) await reportedBy('report', id, who);
  assert.equal(await weighReportsOf('report', id), 'already_hidden');
  assert.equal((await get(path)).status, 'resolved');
});
