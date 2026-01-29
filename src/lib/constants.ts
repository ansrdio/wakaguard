import { VerificationStatus } from './types';

/**
 * Available verification statuses for reports
 */
export const VERIFICATION_STATUSES = [
  VerificationStatus.PENDING,
  VerificationStatus.VERIFIED,
  VerificationStatus.DISMISSED,
] as const;

/**
 * Display labels for verification statuses
 */
export const VERIFICATION_STATUS_LABELS: Record<VerificationStatus, string> = {
  [VerificationStatus.PENDING]: 'Pending',
  [VerificationStatus.VERIFIED]: 'Verified',
  [VerificationStatus.DISMISSED]: 'Dismissed',
};

/**
 * Colors for verification statuses
 */
export const VERIFICATION_STATUS_COLORS: Record<VerificationStatus, string> = {
  [VerificationStatus.PENDING]: 'bg-yellow-500 hover:bg-yellow-600',
  [VerificationStatus.VERIFIED]: 'bg-green-500 hover:bg-green-600',
  [VerificationStatus.DISMISSED]: 'bg-gray-500 hover:bg-gray-600',
};
