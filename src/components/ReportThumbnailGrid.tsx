'use client';

import { MapPin, ThumbsUp, MessageCircle, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Report, ReportStatus, ReportType } from '@/lib/types';
import Image from 'next/image';

interface ReportThumbnailGridProps {
  reports: Report[];
  onSelectReport: (reportId: string) => void;
  selectedReportId: string | null;
}

const typeColors: Record<ReportType, string> = {
  [ReportType.CHECKPOINT]: 'bg-blue-600',
  [ReportType.POTHOLE]: 'bg-amber-500',
  [ReportType.ACCIDENT]: 'bg-red-500',
  [ReportType.TRAFFIC]: 'bg-yellow-500',
  [ReportType.ROADWORK]: 'bg-orange-500',
  [ReportType.HAZARD]: 'bg-rose-500',
  [ReportType.CLOSURE]: 'bg-gray-500',
  [ReportType.OTHER]: 'bg-slate-500',
};

const typeIcons: Record<ReportType, string> = {
  [ReportType.CHECKPOINT]: '🚔',
  [ReportType.POTHOLE]: '🕳️',
  [ReportType.ACCIDENT]: '🚗',
  [ReportType.TRAFFIC]: '🚦',
  [ReportType.ROADWORK]: '🏗️',
  [ReportType.HAZARD]: '⚠️',
  [ReportType.CLOSURE]: '🚧',
  [ReportType.OTHER]: '📍',
};

export function ReportThumbnailGrid({ reports, onSelectReport, selectedReportId }: ReportThumbnailGridProps) {
  const getTimeAgo = (timestamp: any) => {
    if (!timestamp?.toDate) return 'Recently';
    const now = Date.now();
    const time = timestamp.toDate().getTime();
    const diff = now - time;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  if (reports.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertTriangle className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-4" />
        <p className="text-slate-500 dark:text-slate-400">No reports in this area</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 p-3">
      {reports.map((report) => (
        <button
          key={report.id}
          onClick={() => onSelectReport(report.id)}
          className={`relative bg-white dark:bg-dark-card rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all text-left group ${
            selectedReportId === report.id ? 'ring-2 ring-blue-500' : ''
          }`}
        >
          {/* Thumbnail Image or Placeholder */}
          <div className="relative h-28 bg-slate-100 dark:bg-slate-800 overflow-hidden">
            {report.imageUrl ? (
              <Image
                src={report.imageUrl}
                alt={report.type}
                fill
                className="object-cover group-hover:scale-105 transition-transform"
                sizes="(max-width: 768px) 50vw, 200px"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-4xl opacity-50">{typeIcons[report.type]}</span>
              </div>
            )}
            
            {/* Type Badge */}
            <div className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-medium text-white ${typeColors[report.type]}`}>
              {report.type.replace('_', ' ')}
            </div>

            {/* Status Indicator */}
            {report.status === ReportStatus.RESOLVED && (
              <div className="absolute top-2 right-2 p-1 bg-emerald-500 rounded-full">
                <CheckCircle2 className="w-3 h-3 text-white" />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-2.5">
            {/* Location */}
            <div className="flex items-start gap-1 mb-1.5">
              <MapPin className="w-3 h-3 text-slate-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-tight">
                {report.location.address || 'Unknown location'}
              </p>
            </div>

            {/* Stats Row */}
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-0.5">
                  <ThumbsUp className="w-3 h-3" />
                  {report.upvotes || 0}
                </span>
                <span className="flex items-center gap-0.5">
                  <MessageCircle className="w-3 h-3" />
                  {report.commentCount || 0}
                </span>
              </div>
              <span className="flex items-center gap-0.5">
                <Clock className="w-3 h-3" />
                {getTimeAgo(report.createdAt)}
              </span>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
