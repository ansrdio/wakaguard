/**
 * @fileoverview Type definitions for WakaGuard
 * 
 * This file contains all TypeScript interfaces and enums used throughout the application.
 * 
 * @module types
 */

import { Timestamp } from 'firebase/firestore';
import { NigerianState } from './nigerianStates';

// =============================================================================
// REPORT TYPES
// =============================================================================

/**
 * Types of road hazard reports that users can submit.
 * Each type has specific UI treatment and validation rules.
 */
export enum ReportType {
  POTHOLE = 'pothole',
  TRAFFIC = 'traffic',
  ACCIDENT = 'accident',
  ROADWORK = 'roadwork',
  HAZARD = 'hazard',
  CLOSURE = 'closure',
  CHECKPOINT = 'checkpoint',
  OTHER = 'other',
}

/**
 * Nigerian checkpoint authority types.
 * Used when report type is CHECKPOINT to identify the agency.
 */
export enum CheckpointType {
  POLICE = 'police',
  FRSC = 'frsc',           // Federal Road Safety Corps
  LASTMA = 'lastma',       // Lagos State Traffic Management Authority
  VIO = 'vio',             // Vehicle Inspection Officer
  ARMY = 'army',
  CUSTOMS = 'customs',
  TASK_FORCE = 'task_force',
  OTHER = 'other',
}

export enum CheckpointCheck {
  LICENSE = 'license',
  VEHICLE_PAPERS = 'vehicle_papers',
  INSURANCE = 'insurance',
  ROAD_WORTHINESS = 'road_worthiness',
  TINTED_GLASS = 'tinted_glass',
  EXPIRED_TAGS = 'expired_tags',
  RANDOM_SEARCH = 'random_search',
  PARTICULARS = 'particulars',
}

export enum WaitTime {
  FIVE_MIN = '5min',
  FIFTEEN_MIN = '15min',
  THIRTY_MIN = '30min',
  ONE_HOUR = '1hr+',
}

/**
 * Severity levels for road hazard reports.
 * Affects UI display and sorting priority.
 */
export enum Severity {
  LOW = 'low',             // Minor inconvenience
  MEDIUM = 'medium',       // Significant hazard
  HIGH = 'high',           // Dangerous condition
  CRITICAL = 'critical',   // Immediate danger to life
}

export enum ReportStatus {
  ACTIVE = 'active',
  RESOLVED = 'resolved',
  EXPIRED = 'expired',
  FLAGGED = 'flagged',
}

export enum VerificationStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  DISMISSED = 'dismissed',
}

/**
 * Road hazard report document stored in Firestore.
 * 
 * @collection reports
 * @example
 * {
 *   id: 'abc123',
 *   uid: 'user456',
 *   type: ReportType.POTHOLE,
 *   severity: Severity.MEDIUM,
 *   status: ReportStatus.ACTIVE,
 *   location: { lat: 6.5244, lng: 3.3792 },
 *   description: 'Large pothole on Third Mainland Bridge',
 *   upvotes: 15,
 *   downvotes: 2
 * }
 */
export interface Report {
  /** Firestore document ID */
  id: string;
  /** Creator's Firebase Auth UID */
  uid: string;
  /** Type of road hazard */
  type: ReportType;
  /** Hazard severity level */
  severity: Severity;
  /** Current report status */
  status: ReportStatus;
  /** Nigerian state where hazard is located */
  state: NigerianState;
  /** Community verification status */
  verification: VerificationStatus;
  /** GPS coordinates and optional address */
  location: {
    lat: number;
    lng: number;
    address?: string;
  };
  /** User-provided description of the hazard */
  description: string;
  /** @deprecated Use photoUrls instead */
  imageUrl?: string;
  /** Array of Firebase Storage URLs for photos */
  photoUrls?: string[];
  /** When the report was created */
  createdAt: Timestamp;
  /** Auto-expiry timestamp (default 24h) */
  expiresAt: Timestamp;
  /** Number of upvotes received */
  upvotes: number;
  /** Number of downvotes received */
  downvotes: number;
  /** Number of comments on this report */
  commentCount: number;
  /** Number of moderation flags */
  flagCount: number;
  
  // Checkpoint-specific fields (only when type === CHECKPOINT)
  /** Type of checkpoint authority */
  checkpointType?: CheckpointType;
  /** What documents are being checked */
  checkpointChecks?: CheckpointCheck[];
  /** Estimated wait time at checkpoint */
  estimatedWaitTime?: WaitTime;
  /** User tip for passing checkpoint */
  checkpointTip?: string;
}

/**
 * User vote on a report. Document ID format: {userId}_{reportId}
 * @collection votes
 */
export interface Vote {
  id: string;
  reportId: string;
  uid: string;
  /** 1 for upvote, -1 for downvote */
  value: 1 | -1;
  createdAt: Timestamp;
}

export enum CommentStatus {
  ACTIVE = 'active',
  REMOVED = 'removed',
}

export interface Comment {
  id: string;
  reportId: string;
  uid: string;
  text: string;
  status: CommentStatus;
  createdAt: Timestamp;
}

// =============================================================================
// SAFETY FEATURE TYPES
// =============================================================================

/**
 * Safety timer for check-in reminders.
 * If not acknowledged before expiry, contacts are notified.
 * 
 * @collection safetyTimers
 */
export interface SafetyTimer {
  id: string;
  /** Owner's Firebase Auth UID */
  uid: string;
  /** Timer duration in minutes */
  duration: number;
  /** When timer was started */
  startTime: Timestamp;
  /** When timer expires and alerts trigger */
  expiresAt: Timestamp;
  /** Whether user checked in safely */
  acknowledged: boolean;
  /** When user acknowledged (if they did) */
  acknowledgedAt?: Timestamp;
  /** Contact IDs that were notified on expiry */
  notifiedContacts: string[];
  createdAt: Timestamp;
  
  // Safe Trip integration
  /** Associated trip ID (links timer to trip) */
  tripId?: string | null;
  /** Flag for Cloud Functions to send notifications */
  shouldNotifyContacts?: boolean;
  /** Timestamp of last notification sent */
  lastContactNotificationAt?: Timestamp | null;
}
export interface SharedTrip {
  uid: string;
  tripId: string;
  status: TripStatus;
  expiresAt: Timestamp;
  lastLocation?: { lat: number; lng: number; accuracy?: number };
  lastUpdate?: Timestamp;
  destination?: string;
  createdAt: Timestamp;
}

export enum FlagTargetType {
  REPORT = 'report',
  COMMENT = 'comment',
}

export enum FlagReason {
  SPAM = 'spam',
  INAPPROPRIATE = 'inappropriate',
  INCORRECT = 'incorrect',
  DUPLICATE = 'duplicate',
  OTHER = 'other',
}

export interface Flag {
  id: string;
  targetType: FlagTargetType;
  targetId: string;
  reporterId: string;
  reason: FlagReason;
  details: string;
  status: 'pending' | 'resolved' | 'dismissed';
  createdAt: Timestamp;
}

/**
 * Trusted contact for emergency notifications.
 * These contacts receive alerts during SOS or missed check-ins.
 * 
 * @collection trustedContacts
 */
export interface TrustedContact {
  id: string;
  /** Owner's Firebase Auth UID */
  uid: string;
  /** Contact's display name */
  name: string;
  /** Contact's phone number (Nigerian format) - deprecated, use phoneE164 */
  phone?: string;
  /** Contact's phone number in E.164 format (e.g., +2348012345678) */
  phoneE164: string;
  /** Optional email address */
  email?: string;
  /** Notify on SOS alerts (default: true) */
  notifyOnSOS?: boolean;
  /** Notify on check-ins (default: true) */
  notifyOnCheckIn?: boolean;
  /** Notify on trip shares (default: true) */
  notifyOnTripShare?: boolean;
  createdAt: Timestamp;
}

/**
 * Trip lifecycle status.
 */
export enum TripStatus {
  ACTIVE = 'active',         // Trip in progress
  COMPLETED = 'completed',   // User ended trip safely
  CANCELLED = 'cancelled',   // User cancelled before completion
  EMERGENCY = 'emergency',   // SOS triggered during trip
}

/**
 * Live trip sharing session.
 * Document ID is the shareToken for secure public access.
 * 
 * @collection trips
 * @security List operations denied; only GET by token allowed for public
 */
export interface Trip {
  id: string;
  /** Owner's Firebase Auth UID */
  uid: string;
  /** Cryptographically random token for sharing (used as doc ID) */
  shareToken: string;
  /** Current trip status */
  status: TripStatus;
  /** When trip was started */
  startTime: Timestamp;
  /** When trip was ended (if completed) */
  endTime?: Timestamp;
  /** Auto-expiry for abandoned trips (max 24h) */
  expiresAt: Timestamp;
  /** Most recent GPS location */
  lastLocation?: {
    lat: number;
    lng: number;
    accuracy?: number;
    updatedAt?: Timestamp;
  };
  /** Timestamp of last location update */
  lastUpdate?: Timestamp;
  /** User-provided destination label */
  destination?: string;
  /** Contact IDs that were notified about this trip */
  notifiedContacts: string[];
  createdAt: Timestamp;
  
  // Safe Trip enhancements
  /** Expected trip duration in minutes (user-selected) */
  expectedDurationMinutes?: number;
  /** Calculated end time: startTime + expectedDurationMinutes */
  endsAt?: Timestamp;
  /** IDs of trusted contacts to notify */
  trustedContactIds?: string[];
  /** Flag for Cloud Functions to send notifications */
  shouldNotifyContacts?: boolean;
  /** Timestamp of last notification sent */
  lastContactNotificationAt?: Timestamp | null;

  cancellationReason?: string;
}

/**
 * Types of safety alerts that can be triggered.
 */
export enum AlertType {
  SOS = 'sos',                       // Emergency SOS button pressed
  TIMER_EXPIRED = 'timer_expired',   // Safety timer expired without check-in
  CHECK_IN_MISSED = 'check_in_missed', // Scheduled check-in was missed
  CHECKPOINT_STOP = 'checkpoint_stop', // Nigeria-specific: stopped at checkpoint
}

/**
 * Safety alert record.
 * Created when SOS is triggered or timer expires.
 * 
 * @collection alerts
 */
export interface Alert {
  id: string;
  /** User who triggered or is associated with alert */
  uid: string;
  /** Type of alert */
  type: AlertType;
  /** Associated trip ID (if during a trip) */
  tripId?: string;
  /** Location when alert was triggered */
  location?: {
    lat: number;
    lng: number;
  };
  /** Optional message from user */
  message?: string;
  /** Whether alert has been acknowledged/resolved */
  acknowledged: boolean;
  /** When alert was acknowledged */
  acknowledgedAt?: Timestamp;
  /** Contacts that were notified */
  notifiedContacts: string[];
  createdAt: Timestamp;
}

/**
 * User profile stored in Firestore.
 * Contains username and other user preferences.
 * 
 * @collection users
 */
export interface UserProfile {
  /** Unique username chosen by user (lowercase, alphanumeric + underscore) */
  username?: string;
  /** Display name (can be different from username) */
  displayName?: string;
  /** When the user account was created */
  createdAt: Timestamp;
  /** List of blocked user IDs */
  blockedUids: string[];
  /** When username was last changed */
  usernameUpdatedAt?: Timestamp;
  safetyChecklist?: string[];
}

/**
 * Username reservation document.
 * Used to ensure username uniqueness across users.
 * 
 * @collection usernames
 */
export interface UsernameDoc {
  /** The user ID who owns this username */
  uid: string;
  /** Lowercase version of username for case-insensitive lookup */
  usernameLower: string;
  /** When the username was claimed */
  createdAt: Timestamp;
}

/**
 * User check-in record.
 * Created when user confirms they are safe.
 * 
 * @collection checkIns
 */
export interface CheckIn {
  id: string;
  /** User who checked in */
  uid: string;
  /** Associated trip ID (if during a trip) */
  tripId?: string;
  /** Location at time of check-in */
  location?: {
    lat: number;
    lng: number;
  };
  /** Optional status message */
  message?: string;
  createdAt: Timestamp;
}

/**
 * Point action types for gamification.
 */
export enum PointAction {
  CREATE_REPORT = 'CREATE_REPORT',
  REPORT_UPVOTED = 'REPORT_UPVOTED',
  REPORT_VERIFIED = 'REPORT_VERIFIED',
  FIRST_REPORT_OF_DAY = 'FIRST_REPORT_OF_DAY',
  ADD_COMMENT = 'ADD_COMMENT',
  SAFETY_CHECKIN = 'SAFETY_CHECKIN',
  COMPLETE_TRIP = 'COMPLETE_TRIP',
  DAILY_LOGIN = 'DAILY_LOGIN',
}

/**
 * Point values for each action.
 */
export const POINT_VALUES: Record<PointAction, number> = {
  [PointAction.CREATE_REPORT]: 10,
  [PointAction.REPORT_UPVOTED]: 2,
  [PointAction.REPORT_VERIFIED]: 25,
  [PointAction.FIRST_REPORT_OF_DAY]: 5,
  [PointAction.ADD_COMMENT]: 1,
  [PointAction.SAFETY_CHECKIN]: 3,
  [PointAction.COMPLETE_TRIP]: 5,
  [PointAction.DAILY_LOGIN]: 2,
};

/**
 * User level definitions.
 */
export const USER_LEVELS = [
  { level: 1, points: 0, title: 'Road Observer' },
  { level: 2, points: 50, title: 'Community Helper' },
  { level: 3, points: 150, title: 'Safety Scout' },
  { level: 4, points: 300, title: 'Road Guardian' },
  { level: 5, points: 500, title: 'Safety Champion' },
  { level: 6, points: 1000, title: 'Road Legend' },
];

/**
 * Badge types for achievements.
 */
export enum BadgeType {
  FIRST_REPORT = 'FIRST_REPORT',
  VERIFIED_REPORTER = 'VERIFIED_REPORTER',
  COMMUNITY_VOICE = 'COMMUNITY_VOICE',
  SAFETY_FIRST = 'SAFETY_FIRST',
  WEEKLY_WARRIOR = 'WEEKLY_WARRIOR',
}

/**
 * Badge definitions.
 */
export const BADGES: Record<BadgeType, { name: string; description: string; icon: string }> = {
  [BadgeType.FIRST_REPORT]: {
    name: 'First Report',
    description: 'Submit your first report',
    icon: '🎯',
  },
  [BadgeType.VERIFIED_REPORTER]: {
    name: 'Verified Reporter',
    description: 'Get 5 reports verified',
    icon: '✅',
  },
  [BadgeType.COMMUNITY_VOICE]: {
    name: 'Community Voice',
    description: '10 helpful comments',
    icon: '💬',
  },
  [BadgeType.SAFETY_FIRST]: {
    name: 'Safety First',
    description: 'Complete 10 safe trips',
    icon: '🛡️',
  },
  [BadgeType.WEEKLY_WARRIOR]: {
    name: 'Weekly Warrior',
    description: '7-day login streak',
    icon: '🔥',
  },
};

/**
 * User gamification stats stored in Firestore.
 */
export interface UserStats {
  points: number;
  level: number;
  badges: BadgeType[];
  totalReports: number;
  totalUpvotes: number;
  totalComments: number;
  tripsCompleted: number;
  loginStreak: number;
  lastLoginDate: string;
  lastReportDate?: string;
}

/**
 * Point transaction record.
 */
export interface PointTransaction {
  id: string;
  action: PointAction;
  points: number;
  referenceId?: string;
  createdAt: Timestamp;
}
