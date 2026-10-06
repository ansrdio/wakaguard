import * as admin from 'firebase-admin';
import { getNumberSetting } from './config';

/**
 * Per-user SMS limits, counted in messages (one per recipient), so that the
 * service cannot be used to send bulk SMS at WakaGuard's cost.
 */
export interface RateLimitConfig {
  /** Max messages per rolling hour window */
  maxPerHour: number;
  /** Max messages of one type per hour window */
  maxPerTypePerHour: number;
  /** Max messages per day window */
  maxPerDay: number;
}

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export function getRateLimitConfig(): RateLimitConfig {
  return {
    maxPerHour: getNumberSetting('SMS_MAX_PER_HOUR', 30),
    maxPerTypePerHour: getNumberSetting('SMS_MAX_PER_TYPE_PER_HOUR', 15),
    maxPerDay: getNumberSetting('SMS_MAX_PER_DAY', 50),
  };
}

export interface RateLimitResult {
  allowed: boolean;
  /**
   * Why a request was not allowed:
   * - 'limit': the user is over a limit
   * - 'error': the check itself failed (callers sending safety-critical
   *   messages may choose to send anyway)
   */
  reason?: 'limit' | 'error';
  error?: string;
}

interface Window {
  start: number;
  count: number;
}

function currentWindow(start: unknown, count: unknown, lengthMs: number, now: number): Window {
  const startMs = (start as any)?.toMillis?.() ?? 0;
  if (now >= startMs + lengthMs) return { start: now, count: 0 };
  return { start: startMs, count: typeof count === 'number' ? count : 0 };
}

/**
 * Check the user's limits and, if allowed, record `units` messages.
 */
export async function checkAndIncrementRateLimit(
  uid: string,
  messageType: string,
  units: number = 1,
  config: RateLimitConfig = getRateLimitConfig()
): Promise<RateLimitResult> {
  const db = admin.firestore();
  const ref = db.doc(`users/${uid}/rateLimits/sms`);
  const now = Date.now();

  try {
    return await db.runTransaction(async (tx): Promise<RateLimitResult> => {
      const data = (await tx.get(ref)).data() || {};

      const hour = currentWindow(data.windowStart, data.count, HOUR_MS, now);
      const day = currentWindow(data.dayStart, data.dayCount, DAY_MS, now);
      // perType belongs to the hour window and resets with it
      const perType: Record<string, number> = hour.count === 0 && hour.start === now ? {} : (data.perType || {});
      const typeCount = perType[messageType] || 0;

      if (day.count + units > config.maxPerDay) {
        return { allowed: false, reason: 'limit', error: 'Daily message limit reached. Try again tomorrow.' };
      }
      if (hour.count + units > config.maxPerHour) {
        return { allowed: false, reason: 'limit', error: 'Too many messages this hour. Try again later.' };
      }
      if (typeCount + units > config.maxPerTypePerHour) {
        return { allowed: false, reason: 'limit', error: `Too many ${messageType} messages. Try again later.` };
      }

      tx.set(ref, {
        windowStart: admin.firestore.Timestamp.fromMillis(hour.start),
        count: hour.count + units,
        perType: { ...perType, [messageType]: typeCount + units },
        dayStart: admin.firestore.Timestamp.fromMillis(day.start),
        dayCount: day.count + units,
        lastSentAt: admin.firestore.Timestamp.fromMillis(now),
      });
      return { allowed: true };
    });
  } catch (err: any) {
    console.error('Rate limit check failed:', err);
    return { allowed: false, reason: 'error', error: 'Rate limit check failed' };
  }
}
