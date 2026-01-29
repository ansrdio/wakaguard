import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

const db = admin.firestore();
const messaging = admin.messaging();

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
 * Sends push notifications to users within a certain radius.
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
    const NOTIFICATION_RADIUS_KM = 10; // Notify users within 10km

    try {
      // Get all push subscriptions
      const subscriptionsSnapshot = await db.collection('pushSubscriptions').get();
      
      const notifications: Promise<string>[] = [];
      
      for (const doc of subscriptionsSnapshot.docs) {
        const subscription = doc.data();
        
        // Check if user has location and is within radius
        if (subscription.location && subscription.fcmToken) {
          const distance = calculateDistance(
            location.lat,
            location.lng,
            subscription.location.lat,
            subscription.location.lng
          );
          
          if (distance <= NOTIFICATION_RADIUS_KM) {
            // Send notification
            const message: admin.messaging.Message = {
              token: subscription.fcmToken,
              notification: {
                title: `New ${type} Report Nearby`,
                body: `A ${severity} ${type} was reported ${distance.toFixed(1)}km from you in ${state}`,
              },
              webpush: {
                fcmOptions: {
                  link: `https://roadpulse.app/r/${reportId}`,
                },
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
                state,
                lat: String(location.lat),
                lng: String(location.lng),
              },
            };
            
            notifications.push(
              messaging.send(message)
                .then(() => `Sent to ${doc.id}`)
                .catch((err) => {
                  console.error(`Failed to send to ${doc.id}:`, err);
                  // If token is invalid, remove the subscription
                  if (err.code === 'messaging/invalid-registration-token' ||
                      err.code === 'messaging/registration-token-not-registered') {
                    db.collection('pushSubscriptions').doc(doc.id).delete();
                  }
                  return `Failed: ${doc.id}`;
                })
            );
          }
        }
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
          locationUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
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
          appliedAt: admin.firestore.FieldValue.serverTimestamp(),
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
    const now = admin.firestore.Timestamp.now();
    
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
    const now = admin.firestore.Timestamp.now();
    
    try {
      // Query for expired active trips
      const expiredTrips = await db
        .collection('trips')
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

      expiredTrips.forEach((doc) => {
        batch.update(doc.ref, {
          status: 'cancelled',
          endTime: now,
          cancellationReason: 'auto_expired',
        });
        count++;
      });

      await batch.commit();
      console.log(`Cancelled ${count} expired trips`);
      
      return { cleaned: count };
    } catch (error) {
      console.error('Error cleaning up expired trips:', error);
      return null;
    }
  });

// =============================================================================
// SAFETY NOTIFICATION STUBS
// =============================================================================

/**
 * Cloud Function triggered when a safety timer expires
 * Placeholder for future SMS/WhatsApp notification integration
 */
export const onTimerExpired = functions.firestore
  .document('safetyTimers/{timerId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const timerId = context.params.timerId;

    // Check if timer just expired (was not acknowledged and time passed)
    const wasActive = !before.acknowledged;
    const isExpired = after.expiresAt.toMillis() < Date.now() && !after.acknowledged;
    
    if (wasActive && isExpired && after.shouldNotifyContacts) {
      console.log(`Timer ${timerId} expired - notification would be sent here`);
      
      // TODO: Implement actual notification sending
      // - Fetch trusted contacts for user
      // - Send SMS via Twilio/Africa's Talking
      // - Send WhatsApp via Twilio/WhatsApp Business API
      // - Log notification in alerts collection
      
      // For now, just log the alert
      await db.collection('alerts').add({
        uid: after.uid,
        type: 'timer_expired',
        timerId,
        tripId: after.tripId || null,
        acknowledged: false,
        notifiedContacts: [],
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        message: 'Safety timer expired without check-in',
      });
      
      console.log(`Created timer_expired alert for user ${after.uid}`);
    }
    
    return null;
  });

/**
 * Cloud Function triggered when an SOS alert is created
 * Placeholder for future emergency notification integration
 */
export const onSOSAlert = functions.firestore
  .document('alerts/{alertId}')
  .onCreate(async (snapshot, context) => {
    const alertData = snapshot.data();
    const alertId = context.params.alertId;

    if (alertData.type !== 'sos') {
      return null;
    }

    console.log(`SOS Alert ${alertId} created for user ${alertData.uid}`);
    
    // TODO: Implement emergency notification
    // - Fetch trusted contacts for user
    // - Send SMS with location link
    // - Send WhatsApp message
    // - Potentially notify emergency services API
    
    // For now, just log
    console.log(`SOS location: ${alertData.location?.lat}, ${alertData.location?.lng}`);
    
    return null;
  });
