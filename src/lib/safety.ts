/**
 * @fileoverview Safety feature utilities for WakaGuard
 * 
 * This module provides helper functions for the Safe Trip feature including:
 * - Token generation for secure trip sharing
 * - Time calculations and formatting
 * - Rate limiting for safety actions
 * - Night mode detection
 * 
 * @module safety
 */

import { Timestamp } from 'firebase/firestore';

// =============================================================================
// TOKEN & EXPIRY UTILITIES
// =============================================================================

/**
 * Generate an unguessable token for a trip's share link.
 * 128 random bits as 22 URL-safe characters: short enough to keep an SMS
 * with the link inside two segments.
 * @returns A random token string
 */
export function generateShareToken(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  const base64 = btoa(String.fromCharCode(...array));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Generate a 256-bit secret as 64 hex characters.
 * Used for values that are never shown or sent in a message.
 */
export function generateSecretKey(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Check if a trip is expired
 * @param expiresAt Trip expiry timestamp
 * @returns true if expired
 */
export function isTripExpired(expiresAt: Timestamp): boolean {
  return Date.now() > expiresAt.toMillis();
}

/**
 * Calculate expiry time for a trip (default 24 hours)
 * @param hours Hours until expiry (default 24)
 * @returns Timestamp for expiry
 */
export function calculateTripExpiry(hours: number = 24): Date {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

/**
 * Calculate expiry time for a safety timer
 * @param minutes Minutes until expiry
 * @returns Timestamp for expiry
 */
export function calculateTimerExpiry(minutes: number): Date {
  return new Date(Date.now() + minutes * 60 * 1000);
}

/**
 * Format time remaining in a human-readable way
 * @param expiresAt Expiry timestamp
 * @returns Formatted string like "2h 30m remaining"
 */
export function formatTimeRemaining(expiresAt: Timestamp): string {
  const now = Date.now();
  const diff = expiresAt.toMillis() - now;
  
  if (diff <= 0) return 'Expired';
  
  const hours = Math.floor(diff / (60 * 60 * 1000));
  const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
  
  if (hours > 0) {
    return `${hours}h ${minutes}m remaining`;
  }
  return `${minutes}m remaining`;
}

/**
 * Rate limiting check for safety actions
 * Store last action timestamp in localStorage
 */
const RATE_LIMIT_MS = 60000; // 1 minute between actions

export function checkRateLimit(actionKey: string): { allowed: boolean; retryAfter?: number } {
  const lastActionKey = `safety_${actionKey}_last`;
  const lastAction = localStorage.getItem(lastActionKey);
  
  if (lastAction) {
    const lastTime = parseInt(lastAction);
    const timeSince = Date.now() - lastTime;
    
    if (timeSince < RATE_LIMIT_MS) {
      return { 
        allowed: false, 
        retryAfter: Math.ceil((RATE_LIMIT_MS - timeSince) / 1000) 
      };
    }
  }
  
  localStorage.setItem(lastActionKey, Date.now().toString());
  return { allowed: true };
}

// ============================================
// Safe Trip Helper Functions
// ============================================

/**
 * Calculate the trip end time based on start time and expected duration
 * @param startedAt Trip start timestamp
 * @param expectedDurationMinutes Expected trip duration in minutes
 * @returns Date for trip end, or null if no duration set
 */
export function calculateTripEnd(startedAt: Date | Timestamp, expectedDurationMinutes?: number): Date | null {
  if (!expectedDurationMinutes) return null;
  
  const startMs = startedAt instanceof Date 
    ? startedAt.getTime() 
    : startedAt.toMillis();
  
  return new Date(startMs + expectedDurationMinutes * 60 * 1000);
}

/**
 * Get remaining time for a Safe Trip in minutes
 * @param endsAt Trip end timestamp
 * @returns Minutes remaining, or 0 if expired/no end time
 */
export function getTripRemainingMinutes(endsAt?: Timestamp | null): number {
  if (!endsAt) return 0;
  
  const diff = endsAt.toMillis() - Date.now();
  return Math.max(0, Math.floor(diff / (60 * 1000)));
}

/**
 * Format remaining time for display (e.g., "45 min left", "1h 30m left")
 * @param endsAt Trip end timestamp
 * @returns Human-readable remaining time string
 */
export function formatTripRemainingTime(endsAt?: Timestamp | null): string {
  if (!endsAt) return 'No time limit';
  
  const remainingMs = endsAt.toMillis() - Date.now();
  
  if (remainingMs <= 0) return 'Time expired';
  
  const hours = Math.floor(remainingMs / (60 * 60 * 1000));
  const minutes = Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000));
  
  if (hours > 0) {
    return `${hours}h ${minutes}m left`;
  }
  return `${minutes} min left`;
}

/**
 * Determine Safe Trip status based on remaining time
 * @param endsAt Trip end timestamp
 * @returns Status: 'active' | 'endingSoon' | 'expired'
 */
export function getSafeTripTimeStatus(endsAt?: Timestamp | null): 'active' | 'endingSoon' | 'expired' {
  if (!endsAt) return 'active'; // No time limit means always active
  
  const remainingMinutes = getTripRemainingMinutes(endsAt);
  
  if (remainingMinutes <= 0) return 'expired';
  if (remainingMinutes <= 10) return 'endingSoon'; // Less than 10 min = ending soon
  return 'active';
}

/**
 * Build default configuration for a new Safe Trip
 * @returns Default Safe Trip configuration
 */
export function buildDefaultSafeTripConfig(): {
  expectedDurationMinutes: number;
  shouldNotifyContacts: boolean;
} {
  return {
    expectedDurationMinutes: 45, // 45 minutes is a sensible default for city trips
    shouldNotifyContacts: true,
  };
}

/**
 * Duration presets for Safe Trip selection UI
 */
export const SAFE_TRIP_DURATION_PRESETS = [
  { label: '30 min', value: 30 },
  { label: '45 min', value: 45 },
  { label: '1 hour', value: 60 },
  { label: '1.5 hours', value: 90 },
  { label: '2 hours', value: 120 },
  { label: 'No limit', value: 0 },
] as const;

/**
 * Check if it's currently night time (for night drive mode hints)
 * Night is defined as 6 PM to 6 AM
 * @returns true if current time is considered night
 */
export function isNightTime(): boolean {
  const hour = new Date().getHours();
  return hour >= 18 || hour < 6;
}
