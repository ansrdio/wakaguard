/**
 * @fileoverview Server writes to a trip's contact page (sharedTrips/{tripId})
 *
 * A page's id is its trip's id, and trip ids are chosen by the app. Until
 * 4 November 2026 the server wrote to sharedTrips/{tripId} for whatever trip
 * it was working on, so someone holding another traveller's link (its token
 * is the page's id) could give a trip or an SOS of their own that id, and the
 * server would put their positions on that page, end it, or reopen it as an
 * emergency (security review). Every server write to a page now checks first
 * that the page is the same traveller's. A page's uid never changes
 * (firestore.rules), so a check read just before a write stays true.
 *
 * @module tripPage
 */

import * as admin from 'firebase-admin';

/** Whether this page, already read, is this traveller's own */
export function isOwnPage(page: FirebaseFirestore.DocumentSnapshot, uid: string): boolean {
  return page.exists && page.get('uid') === uid;
}

/** The trip's contact page if it is this traveller's own, otherwise null: nothing is written */
export async function ownPage(uid: string, tripId: string): Promise<FirebaseFirestore.DocumentReference | null> {
  const ref = admin.firestore().doc(`sharedTrips/${tripId}`);
  return isOwnPage(await ref.get(), uid) ? ref : null;
}
