import { ReportType, Severity, VerificationStatus } from './types';

export interface ReportFilters {
  type?: ReportType;
  severity?: Severity;
  verification?: VerificationStatus;
  recency?: number;
  searchQuery?: string;
  radiusKm?: number;
  userLocation?: { lat: number; lng: number };
}
