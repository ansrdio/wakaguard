/**
 * Tidying up after a road report is deleted.
 *
 * A person can delete their own report in the app (the database rules allow
 * the author and nobody else). The app removes the report itself, so it is
 * off everyone's screen at once. What it cannot remove is what other people
 * attached to it: their comments, their votes, and anyone's report of it to
 * us. Those go here, with the photos in case the app was closed before it
 * got to them.
 *
 * Every step finds what is left and deletes it, so running it twice does no
 * harm. Deleting an account also deletes each of the person's reports, and
 * this then runs for each one and finds nothing to do.
 */

import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';

// A Firestore batch takes 500 writes at most
const BATCH_SIZE = 400;

async function deleteAll(query: FirebaseFirestore.Query): Promise<number> {
  const db = admin.firestore();
  let deleted = 0;
  for (;;) {
    const found = await query.limit(BATCH_SIZE).get();
    if (found.empty) return deleted;
    const batch = db.batch();
    found.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    deleted += found.size;
  }
}

export interface ReportLeftovers {
  comments: number;
  votes: number;
  flags: number;
}

/** Removes everything that hung off a road report. `authorUid` is whose photos to remove, when it is known. */
export async function removeReportLeftovers(reportId: string, authorUid?: string | null): Promise<ReportLeftovers> {
  const db = admin.firestore();
  const comments = await deleteAll(db.collection('comments').where('reportId', '==', reportId));
  const votes = await deleteAll(db.collection('votes').where('reportId', '==', reportId));
  const flags = await deleteAll(db.collection('flags').where('targetId', '==', reportId));
  // The "resolved" and "still there" votes are kept under the report itself
  await db.recursiveDelete(db.collection('reports').doc(reportId));
  if (authorUid) {
    await admin.storage().bucket().deleteFiles({ prefix: `report_photos/${authorUid}/${reportId}/` });
  }
  return { comments, votes, flags };
}

export const onReportDeleted = functions.firestore
  .document('reports/{reportId}')
  .onDelete(async (snapshot, context) => {
    const { reportId } = context.params;
    const authorUid = snapshot.data()?.uid;
    const gone = await removeReportLeftovers(reportId, typeof authorUid === 'string' ? authorUid : null);
    console.log(`Report ${reportId} deleted: ${gone.comments} comments, ${gone.votes} votes, ${gone.flags} flags removed with it`);
  });
