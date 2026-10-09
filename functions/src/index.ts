import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { migrateLegacyData } from './migrateLegacyData';

export { sendSafetySms } from './safetySms';
export { deleteMyAccount } from './accountDeletion';
export { tripLocation } from './tripLocation';
export {
  checkOverdueTrips,
  onTripUpdated,
  onSafetyTimerUpdated,
  onSOSAlert,
} from './tripMonitor';

admin.initializeApp();

const db = admin.firestore();
const messaging = admin.messaging();

const RESOLUTION_THRESHOLD = 3;
const STILL_THERE_EXTENSION_HOURS = 24;

// Helper to calculate distance between two coordinates (in km)
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Cloud Function triggered when a new report is created.
 * Sends push notifications to users based on:
 * - GPS location (subscription.location) and/or
 * - user-defined alert zones (subscription.zones)
 *
 * Includes a cheap pre-filter by state to avoid distance checks for irrelevant subscriptions.
 */
export const onReportCreate = functions.firestore
  .document('reports/{reportId}')
  .onCreate(async (snapshot, context) => {
    const reportId = context.params.reportId;
    const reportData = snapshot.data();

    if (!reportData || !reportData.location) {
      console.error(`Invalid report data for reportId: ${reportId}`);
      return null;
    }

    const { location, type, state, severity } = reportData;

    // Default notification radius for GPS mode (km)
    const DEFAULT_RADIUS_KM = 10;

    // For zones, allow per-zone radius; if missing use this
    const DEFAULT_ZONE_RADIUS_KM = 10;

    // Safety cap to protect function runtime
    const MAX_ZONES_TO_CHECK = 5;

    // Helpers
    const isValidLatLng = (loc: any) =>
      loc && typeof loc.lat === 'number' && typeof loc.lng === 'number';

    const normalizeState = (s: any) =>
      typeof s === 'string' ? s.trim().toLowerCase() : null;

    const reportState = normalizeState(state);

    // Decide if a subscription should be notified
    const shouldNotify = (sub: any): boolean => {
      if (!sub || !sub.fcmToken) return false;

      const alertMode: 'gps' | 'zones' | 'both' =
        sub.alertMode === 'zones' || sub.alertMode === 'both' ? sub.alertMode : 'gps';

      // ---------
      // State pre-filter (cheap)
      // ---------
      // Prefer explicit subscription.states, else derive from zones[].state
      const subStates: string[] = Array.isArray(sub.states)
        ? sub.states.map(normalizeState).filter(Boolean)
        : Array.isArray(sub.zones)
          ? sub.zones
              .map((z: any) => normalizeState(z?.state))
              .filter(Boolean)
          : [];

      // If we have a reportState AND the subscription has states AND reportState not included => skip
      if (reportState && subStates.length > 0 && !subStates.includes(reportState)) {
        return false;
      }

      // ---------
      // GPS mode check
      // ---------
      if ((alertMode === 'gps' || alertMode === 'both') && isValidLatLng(sub.location)) {
        const d = calculateDistance(location.lat, location.lng, sub.location.lat, sub.location.lng);
        if (d <= DEFAULT_RADIUS_KM) return true;
      }

      // ---------
      // Zones mode check
      // ---------
      if (alertMode === 'zones' || alertMode === 'both') {
        const zones = Array.isArray(sub.zones) ? sub.zones.slice(0, MAX_ZONES_TO_CHECK) : [];
        for (const z of zones) {
          if (!z || !isValidLatLng(z.center)) continue;

          const radiusKm =
            typeof z.radiusKm === 'number' && z.radiusKm > 0 ? z.radiusKm : DEFAULT_ZONE_RADIUS_KM;

          const d = calculateDistance(location.lat, location.lng, z.center.lat, z.center.lng);
          if (d <= radiusKm) return true;
        }
      }

      return false;
    };

    try {
      const subscriptionsSnapshot = await db.collection('pushSubscriptions').get();

      const notifications: Promise<string>[] = [];

      for (const docSnap of subscriptionsSnapshot.docs) {
        const sub = docSnap.data();

        if (!shouldNotify(sub)) continue;

        // Optional: compute a "closest distance" for the notification body (best effort)
        let distanceKm: number | null = null;

        if (sub.location && typeof sub.location.lat === 'number' && typeof sub.location.lng === 'number') {
          distanceKm = calculateDistance(location.lat, location.lng, sub.location.lat, sub.location.lng);
        } else if (Array.isArray(sub.zones) && sub.zones.length > 0) {
          let best: number | null = null;
          for (const z of sub.zones.slice(0, MAX_ZONES_TO_CHECK)) {
            if (z?.center?.lat == null || z?.center?.lng == null) continue;
            const d = calculateDistance(location.lat, location.lng, z.center.lat, z.center.lng);
            if (best == null || d < best) best = d;
          }
          distanceKm = best;
        }

        const distanceText =
          typeof distanceKm === 'number' ? `${distanceKm.toFixed(1)}km` : `near you`;

        const message: admin.messaging.Message = {
          token: sub.fcmToken,
          notification: {
            title: `New ${type} Report Nearby`,
            body: `A ${severity} ${type} was reported ${distanceText} in ${state}`,
          },
          webpush: {
            fcmOptions: { link: `https://wakaguard.com/r/${reportId}` },
            notification: {
              icon: '/icons/icon-192x192.svg',
              badge: '/icons/icon-72x72.png',
              tag: `report-${reportId}`,
              requireInteraction: true,
            },
          },
          data: {
            reportId,
            type,
            state: String(state ?? ''),
            lat: String(location.lat),
            lng: String(location.lng),
          },
        };

        notifications.push(
          messaging.send(message)
            .then(() => `Sent to ${docSnap.id}`)
            .catch((err) => {
              console.error(`Failed to send to ${docSnap.id}:`, err);
              if (
                err.code === 'messaging/invalid-registration-token' ||
                err.code === 'messaging/registration-token-not-registered'
              ) {
                db.collection('pushSubscriptions').doc(docSnap.id).delete();
              }
              return `Failed: ${docSnap.id}`;
            })
        );
      }

      const results = await Promise.all(notifications);
      console.log(`Sent ${results.length} notifications for report ${reportId}`);
      return { sent: results.length };
    } catch (error) {
      console.error(`Error sending notifications for report ${reportId}:`, error);
      return null;
    }
  });

/**
 * Aggregate resolution votes and update report confirmations/status.
 * Each user writes to reports/{reportId}/resolutionVotes/{uid}.
 */
export const onResolutionVoteWrite = functions.firestore
  .document('reports/{reportId}/resolutionVotes/{uid}')
  .onWrite(async (change, context) => {
    if (!change.after.exists) {
      return null;
    }

    const { reportId } = context.params;
    const afterData = change.after.data();
    const beforeData = change.before.exists ? change.before.data() : null;

    if (!afterData || !afterData.voteType) {
      return null;
    }

    const reportRef = db.collection('reports').doc(reportId);
    const votesSnap = await reportRef.collection('resolutionVotes').get();

    let resolvedCount = 0;
    let stillThereCount = 0;

    votesSnap.forEach((doc) => {
      const vote = doc.data();
      if (vote.voteType === 'resolved') {
        resolvedCount += 1;
      } else if (vote.voteType === 'still_there') {
        stillThereCount += 1;
      }
    });

    const updates: Record<string, any> = {
      confirmations: {
        resolved: resolvedCount,
        still_there: stillThereCount,
      },
      lastConfirmedAt: FieldValue.serverTimestamp(),
    };

    if (resolvedCount >= RESOLUTION_THRESHOLD) {
      updates.status = 'resolved';
      updates.resolvedAt = FieldValue.serverTimestamp();
    }

    if (afterData.voteType === 'still_there' && (!beforeData || beforeData.voteType !== 'still_there')) {
      const reportSnap = await reportRef.get();
      const reportData = reportSnap.data();
      const expiresAt = reportData?.expiresAt?.toDate ? reportData.expiresAt.toDate() : null;

      if (expiresAt) {
        const extended = new Date(expiresAt.getTime() + STILL_THERE_EXTENSION_HOURS * 60 * 60 * 1000);
        updates.expiresAt = Timestamp.fromDate(extended);
      }
    }

    await reportRef.update(updates);
    return null;
  });

/**
 * Cloud Function to update user location for push notifications
 */
export const updateUserLocation = functions.https.onCall(
  async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Must be authenticated'
      );
    }

    const { lat, lng } = data;
    const uid = context.auth.uid;

    if (typeof lat !== 'number' || typeof lng !== 'number') {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'lat and lng are required numbers'
      );
    }

    try {
      // Update all subscriptions for this user with new location
      const subscriptionsSnapshot = await db
        .collection('pushSubscriptions')
        .where('uid', '==', uid)
        .get();

      const batch = db.batch();
      subscriptionsSnapshot.forEach((doc) => {
        batch.update(doc.ref, {
          location: { lat, lng },
          locationUpdatedAt: FieldValue.serverTimestamp(),
        });
      });

      await batch.commit();

      return { success: true, updated: subscriptionsSnapshot.size };
    } catch (error) {
      console.error(`Error updating location for user ${uid}:`, error);
      throw new functions.https.HttpsError('internal', 'Failed to update location');
    }
  }
);

/**
 * Cloud Function triggered when a new vote is created.
 * Increments the corresponding count on the report document with idempotency.
 * 
 * Idempotency: Uses the `appliedAt` field on the vote document to ensure
 * the count is only incremented once, even if the function is triggered multiple times.
 */
export const onVoteCreate = functions.firestore
  .document('votes/{voteId}')
  .onCreate(async (snapshot, context) => {
    const voteId = context.params.voteId;
    const voteData = snapshot.data();

    // Validate vote data
    if (!voteData || !voteData.reportId || !voteData.value) {
      console.error(`Invalid vote data for voteId: ${voteId}`, voteData);
      return null;
    }

    const { reportId, value } = voteData;

    try {
      // Use transaction to ensure atomicity and check idempotency
      await db.runTransaction(async (transaction) => {
        const voteRef = db.collection('votes').doc(voteId);
        const reportRef = db.collection('reports').doc(reportId);

        // Re-read the vote document within the transaction
        const voteDoc = await transaction.get(voteRef);

        if (!voteDoc.exists) {
          console.warn(`Vote document ${voteId} no longer exists`);
          return;
        }

        const currentVoteData = voteDoc.data()!;

        // Check if this function has already processed this vote (idempotency)
        if (currentVoteData.appliedAt) {
          console.log(`Vote ${voteId} already applied at ${currentVoteData.appliedAt.toDate()}`);
          return; // Already processed, exit early
        }

        // Get the report document
        const reportDoc = await transaction.get(reportRef);

        if (!reportDoc.exists) {
          console.error(`Report ${reportId} not found for vote ${voteId}`);
          return;
        }

        const reportData = reportDoc.data()!;

        // Determine which count to increment based on vote value
        if (value === 1) {
          // Upvote: increment upvotes
          const newUpvotes = (reportData.upvotes || 0) + 1;
          transaction.update(reportRef, { upvotes: newUpvotes });
          console.log(`Incremented upvotes for report ${reportId}: ${newUpvotes}`);
        } else if (value === -1) {
          // Downvote: increment downvotes
          const newDownvotes = (reportData.downvotes || 0) + 1;
          transaction.update(reportRef, { downvotes: newDownvotes });
          console.log(`Incremented downvotes for report ${reportId}: ${newDownvotes}`);
        } else {
          console.error(`Invalid vote value ${value} for vote ${voteId}`);
          return;
        }

        // Mark the vote as applied (idempotency marker)
        transaction.update(voteRef, {
          appliedAt: FieldValue.serverTimestamp(),
        });

        console.log(`Vote ${voteId} processed successfully`);
      });

      return null;
    } catch (error) {
      console.error(`Error processing vote ${voteId}:`, error);
      
      // Throw error to trigger Cloud Functions retry mechanism
      throw new functions.https.HttpsError(
        'internal',
        `Failed to process vote: ${error}`
      );
    }
  });

/**
 * Optional: Cloud Function to fix inconsistent vote counts
 * This can be called manually if you suspect counts are out of sync
 */
export const recalculateReportCounts = functions.https.onCall(
  async (data, context) => {
    // Require authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Must be authenticated to recalculate counts'
      );
    }

    const { reportId } = data;

    if (!reportId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'reportId is required'
      );
    }

    try {
      // Query all votes for this report
      const votesSnapshot = await db
        .collection('votes')
        .where('reportId', '==', reportId)
        .get();

      let upvotes = 0;
      let downvotes = 0;

      votesSnapshot.forEach((doc) => {
        const vote = doc.data();
        if (vote.value === 1) {
          upvotes++;
        } else if (vote.value === -1) {
          downvotes++;
        }
      });

      // Update the report with recalculated counts
      await db.collection('reports').doc(reportId).update({
        upvotes,
        downvotes,
      });

      console.log(
        `Recalculated counts for report ${reportId}: upvotes=${upvotes}, downvotes=${downvotes}`
      );

      return {
        success: true,
        upvotes,
        downvotes,
      };
    } catch (error) {
      console.error(`Error recalculating counts for report ${reportId}:`, error);
      throw new functions.https.HttpsError(
        'internal',
        `Failed to recalculate counts: ${error}`
      );
    }
  }
);

// =============================================================================
// ADMIN FUNCTIONS
// =============================================================================

/**
 * List of admin UIDs (should match src/config/admins.ts)
 * In production, consider storing this in Firestore or environment config
 */
const ADMIN_UIDS: string[] = [
  // Add admin UIDs here - keep in sync with client-side config
];

/**
 * Cloud Function to set admin custom claims on a user
 * Can only be called by existing admins or during initial setup
 */
export const setAdminClaim = functions.https.onCall(
  async (data, context) => {
    // Check if caller is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Must be authenticated'
      );
    }

    const callerUid = context.auth.uid;
    const callerClaims = context.auth.token;
    const { targetUid, isAdmin } = data;

    // Only existing admins or users in ADMIN_UIDS can set admin claims
    const isCallerAdmin = callerClaims.admin === true || ADMIN_UIDS.includes(callerUid);
    
    if (!isCallerAdmin) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Only admins can modify admin status'
      );
    }

    if (!targetUid || typeof isAdmin !== 'boolean') {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'targetUid and isAdmin are required'
      );
    }

    try {
      // Set the custom claim
      await admin.auth().setCustomUserClaims(targetUid, { admin: isAdmin });
      
      console.log(`Admin claim set for ${targetUid}: admin=${isAdmin} by ${callerUid}`);
      
      return { success: true, targetUid, isAdmin };
    } catch (error) {
      console.error(`Error setting admin claim for ${targetUid}:`, error);
      throw new functions.https.HttpsError(
        'internal',
        'Failed to set admin claim'
      );
    }
  }
);

/**
 * Cloud Function to check if current user has admin privileges
 * Returns the admin status from custom claims
 */
export const checkAdminStatus = functions.https.onCall(
  async (data, context) => {
    if (!context.auth) {
      return { isAdmin: false };
    }

    const uid = context.auth.uid;
    const claims = context.auth.token;
    
    // Check custom claims first, then fallback to ADMIN_UIDS list
    const isAdminUser = claims.admin === true || ADMIN_UIDS.includes(uid);
    
    return { isAdmin: isAdminUser, uid };
  }
);

// =============================================================================
// SCHEDULED CLEANUP FUNCTIONS
// =============================================================================

/**
 * Scheduled function to clean up expired reports
 * Runs every hour to mark expired reports
 */
export const cleanupExpiredReports = functions.pubsub
  .schedule('every 1 hours')
  .onRun(async (context) => {
    const now = Timestamp.now();
    
    try {
      // Query for expired active reports
      const expiredReports = await db
        .collection('reports')
        .where('status', '==', 'active')
        .where('expiresAt', '<', now)
        .limit(500) // Process in batches
        .get();

      if (expiredReports.empty) {
        console.log('No expired reports to clean up');
        return null;
      }

      const batch = db.batch();
      let count = 0;

      expiredReports.forEach((doc) => {
        batch.update(doc.ref, {
          status: 'expired',
          expiredAt: now,
        });
        count++;
      });

      await batch.commit();
      console.log(`Marked ${count} reports as expired`);
      
      return { cleaned: count };
    } catch (error) {
      console.error('Error cleaning up expired reports:', error);
      return null;
    }
  });

/**
 * Scheduled function to clean up expired trips
 * Runs every hour to mark abandoned trips as cancelled
 */
export const cleanupExpiredTrips = functions.pubsub
  .schedule('every 1 hours')
  .onRun(async (context) => {
    const now = Timestamp.now();
    
    try {
      // Query for expired active trips
      const expiredTrips = await db
        .collectionGroup('trips')
        .where('status', '==', 'active')
        .where('expiresAt', '<', now)
        .limit(500)
        .get();

      if (expiredTrips.empty) {
        console.log('No expired trips to clean up');
        return null;
      }

      const batch = db.batch();
      let count = 0;

      expiredTrips.forEach((tripDoc) => {
        batch.update(tripDoc.ref, {
          status: 'cancelled',
          endTime: now,
          cancellationReason: 'auto_expired',
        });
        count++;
      });

      await batch.commit();

      const shareBatch = db.batch();
      expiredTrips.forEach((tripDoc) => {
        const token = tripDoc.id;
        shareBatch.set(db.collection('sharedTrips').doc(token), { status: 'cancelled' }, { merge: true });
      });

      await shareBatch.commit();
      console.log(`Cancelled ${count} expired trips`);
      
      return { cleaned: count };
    } catch (error) {
      console.error('Error cleaning up expired trips:', error);
      return null;
    }
  });

/**
 * Cloud Function to run data migration (admin only)
 */
export const runMigration = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }

  if (context.auth.token.admin !== true) {
    throw new functions.https.HttpsError('permission-denied', 'Admin only');
  }

  const collection = typeof data?.collection === 'string' ? data.collection : '';
  const dryRun = !!data?.dryRun;
  const limit = typeof data?.limit === 'number' ? data.limit : 200;
  const cursor = typeof data?.cursor === 'string' ? data.cursor : null;

  try {
    const result = await migrateLegacyData(db, { collection, dryRun, limit, cursor });
    return result;
  } catch (error: any) {
    throw new functions.https.HttpsError('invalid-argument', error.message || 'Migration failed');
  }
});
