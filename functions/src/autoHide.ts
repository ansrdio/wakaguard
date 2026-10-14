/**
 * Hiding a post that several people have reported, until someone has looked at it.
 *
 * "Report this post" used to do nothing by itself: a report or comment stayed
 * up, however many people reported it, until it was taken down by hand on the
 * moderation page. Now, once HIDE_AT_REPORTERS different accounts have
 * reported the same post, it is hidden from everyone at once and waits on the
 * moderation page, where it is put back or removed for good.
 *
 * - A road report is hidden by giving it the status 'flagged'. The map and
 *   the lists only ask for 'active' reports, so it drops off every screen.
 * - A comment is hidden by giving it the status 'hidden', which the comment
 *   list does not show.
 *
 * Only reports of a post that are still waiting ('pending') count. Putting a
 * post back marks them as dealt with, so it takes three new people to hide it
 * again. One person reporting the same post many times counts once, and the
 * author's own report of their post does not count.
 */

import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

/** How many different accounts must report a post before it is hidden */
export const HIDE_AT_REPORTERS = 3;

export interface PendingFlag {
  reporterId?: unknown;
  status?: unknown;
}

/** How many different people, other than the author, have a report of this post waiting */
export function countReporters(flags: PendingFlag[], authorUid?: string | null): number {
  const reporters = new Set<string>();
  for (const flag of flags) {
    if (flag.status !== 'pending') continue;
    if (typeof flag.reporterId !== 'string' || !flag.reporterId) continue;
    if (authorUid && flag.reporterId === authorUid) continue;
    reporters.add(flag.reporterId);
  }
  return reporters.size;
}

export type FlagOutcome = 'hidden' | 'counted' | 'already_hidden' | 'gone' | 'ignored';

/** Counts the reports of one post and hides it when enough different people have reported it. */
export async function weighReportsOf(targetType: unknown, targetId: unknown): Promise<FlagOutcome> {
  if ((targetType !== 'report' && targetType !== 'comment') || typeof targetId !== 'string' || !targetId) return 'ignored';

  const db = admin.firestore();
  const ref = db.collection(targetType === 'report' ? 'reports' : 'comments').doc(targetId);

  return db.runTransaction(async (tx) => {
    const post = await tx.get(ref);
    if (!post.exists) return 'gone';
    const flags = await tx.get(db.collection('flags').where('targetId', '==', targetId));
    const reporters = countReporters(
      flags.docs.map((doc) => doc.data()).filter((flag) => flag.targetType === targetType),
      post.get('uid'),
    );

    const status = post.get('status');
    const hiddenStatus = targetType === 'report' ? 'flagged' : 'hidden';
    // A report keeps a count of who has reported it; a comment's fields are fixed by the database rules
    const count = targetType === 'report' ? { flagCount: reporters } : {};

    if (status !== 'active' && status !== undefined) {
      if (targetType === 'report') tx.update(ref, count);
      return 'already_hidden';
    }
    if (reporters < HIDE_AT_REPORTERS) {
      if (targetType === 'report') tx.update(ref, count);
      return 'counted';
    }
    tx.update(ref, { ...count, status: hiddenStatus, hiddenAt: FieldValue.serverTimestamp(), hiddenBy: 'reports' });
    return 'hidden';
  });
}

export const onFlagCreated = functions.firestore
  .document('flags/{flagId}')
  .onCreate(async (snapshot, context) => {
    const flag = snapshot.data();
    const outcome = await weighReportsOf(flag?.targetType, flag?.targetId);
    if (outcome === 'hidden') {
      console.log(`Hidden for review after ${HIDE_AT_REPORTERS} reports: ${flag.targetType} ${flag.targetId} (flag ${context.params.flagId})`);
    }
  });
