/**
 * @fileoverview Turning what a person picked when reporting a post into one
 * of the fixed reasons the database accepts
 *
 * @module flagReasons
 */

import { FlagReason } from './types';

/** The choices shown when reporting a post, and the fixed reason each one is filed under */
export const FLAG_CHOICES: { label: string; reason: FlagReason }[] = [
  { label: 'Spam or misleading', reason: FlagReason.SPAM },
  { label: 'Inappropriate content', reason: FlagReason.INAPPROPRIATE },
  { label: 'Harassment or hate speech', reason: FlagReason.INAPPROPRIATE },
  { label: 'False information', reason: FlagReason.INCORRECT },
  { label: 'Duplicate report', reason: FlagReason.DUPLICATE },
  { label: 'Other', reason: FlagReason.OTHER },
];

/** Anything the person typed themselves is filed under "other", with their words kept as the details. */
export function flagReasonFor(chosen: string): FlagReason {
  const wanted = chosen.trim().toLowerCase();
  return FLAG_CHOICES.find((choice) => choice.label.toLowerCase() === wanted)?.reason ?? FlagReason.OTHER;
}
