/**
 * @fileoverview The words for a road report, in one place
 *
 * The report form said Construction, Roadblock and Heavy Traffic while Filters
 * said Roadwork, Closure and Traffic, and severity had four levels and four
 * colours. The owner's choices of 1 November 2026: one set of names, and a
 * report is either serious or it is not. What is stored has not changed, so
 * older reports read correctly: high and critical are serious.
 *
 * No Firebase access (functions/test/reportWords.test.ts).
 *
 * @module reportWords
 */

const TYPE_WORDS: Record<string, string> = {
  checkpoint: 'Checkpoint',
  pothole: 'Pothole',
  accident: 'Accident',
  traffic: 'Heavy traffic',
  roadwork: 'Construction',
  closure: 'Roadblock',
  hazard: 'Hazard',
  other: 'Other',
};

/** What to call a kind of report. One from an older version keeps its own name, tidied. */
export function reportTypeWord(type: string): string {
  if (TYPE_WORDS[type]) return TYPE_WORDS[type];
  const words = String(type || '').replace(/_/g, ' ').trim();
  return words ? words[0].toUpperCase() + words.slice(1) : 'Report';
}

export function isSerious(severity: string): boolean {
  return severity === 'high' || severity === 'critical';
}

/** The longest "Where is it?" a report carries, in the reporter's own words (build 27) */
export const MAX_REPORT_PLACE_LENGTH = 80;

/**
 * Where a report is, for lists and details: the reporter's own words, or the
 * report's state when they left it blank. Reports from before build 27 carry
 * an address OpenStreetMap gave, which still shows until they are deleted.
 */
export function reportPlace(report: { location?: { address?: string } | null; state?: string | null }): string {
  const words = report.location?.address?.trim();
  if (words) return words;
  return report.state ? `${report.state} State`.replace(/^FCT State$/, 'Abuja (FCT)') : 'Place not given';
}
