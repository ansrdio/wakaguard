import { ReportType } from './types';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export function computeExpiry(type: ReportType): number {
  const expiryMap: Record<ReportType, number> = {
    [ReportType.POTHOLE]: 7 * DAY,
    [ReportType.TRAFFIC]: 2 * HOUR,
    [ReportType.ACCIDENT]: 4 * HOUR,
    [ReportType.ROADWORK]: 30 * DAY,
    [ReportType.HAZARD]: 24 * HOUR,
    [ReportType.CLOSURE]: 14 * DAY,
    [ReportType.CHECKPOINT]: 4 * HOUR,
    [ReportType.OTHER]: 3 * DAY,
  };

  const expiryDuration = expiryMap[type] || 3 * DAY;
  return Date.now() + expiryDuration;
}

export function makeVoteId(reportId: string, uid: string): string {
  return `${reportId}_${uid}`;
}

export function makeFlagId(targetType: string, targetId: string, uid: string): string {
  return `${targetType}_${targetId}_${uid}`;
}
