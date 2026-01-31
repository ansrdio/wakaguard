import * as admin from 'firebase-admin';

export interface RateLimitConfig {
  windowMs: number;      // Time window in milliseconds
  maxRequests: number;   // Max requests per window
  perTypeLimit?: number; // Max per type within window
}

const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 10,          // 10 SMS per hour
  perTypeLimit: 5,          // 5 per type per hour
};

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  error?: string;
}

export async function checkAndIncrementRateLimit(
  uid: string,
  messageType: string,
  config: RateLimitConfig = DEFAULT_CONFIG
): Promise<RateLimitResult> {
  const db = admin.firestore();
  const rateLimitRef = db.doc(`users/${uid}/rateLimits/sms`);
  const now = Date.now();

  try {
    const result = await db.runTransaction(async (transaction: FirebaseFirestore.Transaction) => {
      const doc = await transaction.get(rateLimitRef);
      const data = doc.data() || {};

      const windowStart = data.windowStart?.toMillis?.() || 0;
      const windowEnd = windowStart + config.windowMs;

      // Check if we're in a new window
      if (now > windowEnd) {
        // Start new window
        const newData = {
          windowStart: admin.firestore.Timestamp.fromMillis(now),
          count: 1,
          lastSentAt: admin.firestore.Timestamp.fromMillis(now),
          perType: { [messageType]: 1 },
        };
        transaction.set(rateLimitRef, newData);
        return {
          allowed: true,
          remaining: config.maxRequests - 1,
          resetAt: new Date(now + config.windowMs),
        };
      }

      // Within current window
      const currentCount = data.count || 0;
      const perType = data.perType || {};
      const typeCount = perType[messageType] || 0;

      // Check global limit
      if (currentCount >= config.maxRequests) {
        return {
          allowed: false,
          remaining: 0,
          resetAt: new Date(windowEnd),
          error: `Rate limit exceeded. Try again after ${new Date(windowEnd).toISOString()}`,
        };
      }

      // Check per-type limit
      if (config.perTypeLimit && typeCount >= config.perTypeLimit) {
        return {
          allowed: false,
          remaining: config.maxRequests - currentCount,
          resetAt: new Date(windowEnd),
          error: `Too many ${messageType} messages. Try again later.`,
        };
      }

      // Increment counters
      transaction.update(rateLimitRef, {
        count: admin.firestore.FieldValue.increment(1),
        lastSentAt: admin.firestore.Timestamp.fromMillis(now),
        [`perType.${messageType}`]: admin.firestore.FieldValue.increment(1),
      });

      return {
        allowed: true,
        remaining: config.maxRequests - currentCount - 1,
        resetAt: new Date(windowEnd),
      };
    });

    return result;
  } catch (err: any) {
    console.error('Rate limit check failed:', err);
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(now + config.windowMs),
      error: 'Rate limit check failed',
    };
  }
}
