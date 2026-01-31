'use client';

import { 
  doc, 
  runTransaction, 
  collection, 
  addDoc, 
  serverTimestamp,
  query,
  where,
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { FlagTargetType, FlagReason } from './types';
import { makeVoteId } from './rules';

// Voting System
export async function voteOnReport(
  reportId: string, 
  userId: string, 
  voteType: 'up' | 'down'
) {
  const voteRef = doc(db, 'votes', makeVoteId(reportId, userId));
  const value = voteType === 'up' ? 1 : -1;

  try {
    await runTransaction(db, async (transaction) => {
      const voteDoc = await transaction.get(voteRef);

      if (voteDoc.exists()) {
        throw new Error('Vote already exists');
      }

      transaction.set(voteRef, {
        uid: userId,
        reportId,
        value,
        createdAt: serverTimestamp(),
      });
    });

    return { success: true };
  } catch (error) {
    console.error('Error voting on report:', error);
    return { success: false, error: (error as Error).message };
  }
}

// Flagging System
export async function flagReport(
  reportId: string,
  userId: string,
  reason: FlagReason,
  details?: string
) {
  try {
    // Check if user already flagged this report
    const existingFlagsQuery = query(
      collection(db, 'flags'),
      where('targetId', '==', reportId),
      where('reporterId', '==', userId),
      where('targetType', '==', FlagTargetType.REPORT)
    );
    
    const existingFlags = await getDocs(existingFlagsQuery);
    
    if (!existingFlags.empty) {
      return { success: false, error: 'You have already flagged this report' };
    }

    await addDoc(collection(db, 'flags'), {
      targetType: FlagTargetType.REPORT,
      targetId: reportId,
      reporterId: userId,
      reason,
      details: details || '',
      status: 'pending',
      createdAt: serverTimestamp(),
    });

    return { success: true };
  } catch (error) {
    console.error('Error flagging report:', error);
    return { success: false, error: (error as Error).message };
  }
}

// Duplicate Detection
export async function checkForDuplicates(
  userId: string,
  reportType: string,
  lat: number,
  lng: number,
  radiusMeters: number = 100,
  timeWindowMinutes: number = 60
) {
  try {
    const timeThreshold = new Date();
    timeThreshold.setMinutes(timeThreshold.getMinutes() - timeWindowMinutes);

    // Query recent reports by this user of the same type
    const recentReportsQuery = query(
      collection(db, 'reports'),
      where('uid', '==', userId),
      where('type', '==', reportType),
      where('createdAt', '>', Timestamp.fromDate(timeThreshold))
    );

    const recentReports = await getDocs(recentReportsQuery);

    // Check distance for each report
    for (const doc of recentReports.docs) {
      const report = doc.data();
      const distance = calculateDistance(
        lat,
        lng,
        report.location.lat,
        report.location.lng
      );

      if (distance <= radiusMeters) {
        return {
          isDuplicate: true,
          existingReportId: doc.id,
          distance: Math.round(distance),
          minutesAgo: Math.round(
            (Date.now() - report.createdAt.toMillis()) / 60000
          ),
        };
      }
    }

    return { isDuplicate: false };
  } catch (error) {
    console.error('Error checking duplicates:', error);
    return { isDuplicate: false, error: (error as Error).message };
  }
}

// Rate Limiting
export async function checkRateLimit(
  userId: string,
  hourlyLimit: number = 5,
  dailyLimit: number = 20
) {
  try {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Check hourly limit
    const hourlyQuery = query(
      collection(db, 'reports'),
      where('uid', '==', userId),
      where('createdAt', '>', Timestamp.fromDate(oneHourAgo))
    );
    const hourlyReports = await getDocs(hourlyQuery);

    if (hourlyReports.size >= hourlyLimit) {
      return {
        allowed: false,
        reason: `You can only create ${hourlyLimit} reports per hour. Please try again later.`,
        type: 'hourly',
      };
    }

    // Check daily limit
    const dailyQuery = query(
      collection(db, 'reports'),
      where('uid', '==', userId),
      where('createdAt', '>', Timestamp.fromDate(oneDayAgo))
    );
    const dailyReports = await getDocs(dailyQuery);

    if (dailyReports.size >= dailyLimit) {
      return {
        allowed: false,
        reason: `You can only create ${dailyLimit} reports per day. Please try again tomorrow.`,
        type: 'daily',
      };
    }

    return { allowed: true };
  } catch (error) {
    console.error('Error checking rate limit:', error);
    // Allow on error to avoid blocking legitimate users
    return { allowed: true };
  }
}

// Helper: Calculate distance between two lat/lng points (Haversine formula)
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}
