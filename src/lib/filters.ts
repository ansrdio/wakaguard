import { ReportType } from './types';

export interface ReportFilters {
  type?: ReportType;
  recency?: number;
  searchQuery?: string;
}
