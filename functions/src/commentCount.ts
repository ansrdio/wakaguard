/**
 * The number of comments a road report shows ("Comments" on the report).
 *
 * The app does not keep this number itself: the database rules stop it from
 * changing it. Two functions written before this code was on GitHub did, and
 * they drifted. One added a comment's arrival and the other took its removal
 * away, so a report whose comments were older than the functions went below
 * zero (one live report said -1 on 13 October 2026), and a comment hidden or
 * removed by moderation still counted.
 *
 * These replace them under the same names and triggers (so a deploy updates
 * them instead of adding a second set), plus one for a comment whose status
 * changes. Each one counts the report's shown comments afresh, so the number
 * is right after every change whatever it said before. A comment is shown, as
 * in src/hooks/useComments.ts, when its status is 'active' or it has none.
 */

import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';

/** True for a comment the report's list shows */
export function isShownComment(status: unknown): boolean {
  return status === 'active' || status === undefined || status === null || status === '';
}

/**
 * Counts a report's shown comments and writes the number on the report.
 * Returns the number, or null when there is no report to write it on (it was
 * deleted, and its comments are being cleared away after it).
 */
export async function recountComments(reportId: unknown): Promise<number | null> {
  if (typeof reportId !== 'string' || !reportId) return null;
  const db = admin.firestore();
  const reportRef = db.doc(`reports/${reportId}`);
  const comments = db.collection('comments').where('reportId', '==', reportId).select('status');
  // Counted and written together, so two changes at once cannot leave the older count last
  return db.runTransaction(async (tx) => {
    const [shown, report] = await Promise.all([tx.get(comments), tx.get(reportRef)]);
    if (!report.exists) return null; // the report is gone; its comments are being cleared after it
    const count = shown.docs.filter((doc) => isShownComment(doc.get('status'))).length;
    if (report.get('commentCount') !== count) tx.update(reportRef, { commentCount: count });
    return count;
  });
}

export const onCommentCreate = functions.firestore
  .document('comments/{commentId}')
  .onCreate((snapshot) => recountComments(snapshot.get('reportId')));

export const onCommentDelete = functions.firestore
  .document('comments/{commentId}')
  .onDelete((snapshot) => recountComments(snapshot.get('reportId')));

/** Hidden by reports, removed by its author or by moderation, or put back */
export const onCommentUpdate = functions.firestore
  .document('comments/{commentId}')
  .onUpdate(async (change) => {
    const before = change.before.data();
    const after = change.after.data();
    if (isShownComment(before.status) === isShownComment(after.status) && before.reportId === after.reportId) return null;
    if (before.reportId !== after.reportId) await recountComments(before.reportId);
    return recountComments(after.reportId);
  });
