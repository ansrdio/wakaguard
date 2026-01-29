'use client';

import { Report } from '@/lib/types';
import { Clock, MapPin, ThumbsUp, ThumbsDown, MessageCircle, Navigation2 } from 'lucide-react';
import { calculateDistance, formatDistance } from '@/lib/geo';

interface ReportListProps {
  reports: Report[];
  selectedReportId: string | null;
  onReportClick: (reportId: string) => void;
  userLocation?: { lat: number; lng: number } | null;
}

export function ReportList({ reports, selectedReportId, onReportClick, userLocation }: ReportListProps) {
  const formatTimeAgo = (timestamp: any) => {
    if (!timestamp?.toMillis) return 'Just now';
    const now = Date.now();
    const diff = now - timestamp.toMillis();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  return (
    <div className="space-y-3">
      {reports.map((report) => {
        const isSelected = report.id === selectedReportId;
        
        return (
          <div
            key={report.id}
            onClick={() => onReportClick(report.id)}
            className={`
              relative p-4 border rounded-2xl cursor-pointer transition-all
              ${isSelected 
                ? 'border-blue-500 bg-blue-50 shadow-md ring-1 ring-blue-500/30' 
                : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 hover:shadow-sm'
              }
            `}
          >
            {/* Left Accent Bar for Selected */}
            {isSelected && (
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600 rounded-l-2xl" />
            )}
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold capitalize text-slate-900">
                {report.type}
              </h3>
              <span className={`text-xs px-2 py-1 rounded font-medium ${
                report.severity === 'critical' ? 'bg-red-100 text-red-700' :
                report.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                report.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                'bg-green-100 text-green-700'
              }`}>
                {report.severity}
              </span>
            </div>
            
            <p className="text-sm text-slate-600 mb-2 line-clamp-2 leading-relaxed">
              {report.description}
            </p>
            
            {/* Location and Distance */}
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-xs text-slate-400 flex items-center gap-1 truncate flex-1 min-w-0">
                <MapPin className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">
                  {report.location.address || 
                    `${report.location.lat.toFixed(4)}, ${report.location.lng.toFixed(4)}`}
                </span>
              </p>
              {userLocation && (
                <span className="text-xs font-medium text-blue-600 flex items-center gap-1 shrink-0">
                  <Navigation2 className="w-3 h-3" />
                  {formatDistance(
                    calculateDistance(
                      userLocation.lat,
                      userLocation.lng,
                      report.location.lat,
                      report.location.lng
                    )
                  )}
                </span>
              )}
            </div>
            
            <div className="flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <ThumbsUp className="w-3 h-3 text-green-600" />
                  <span>{report.upvotes}</span>
                </span>
                <span className="flex items-center gap-1">
                  <ThumbsDown className="w-3 h-3 text-red-600" />
                  <span>{report.downvotes}</span>
                </span>
                <span className="flex items-center gap-1">
                  <MessageCircle className="w-3 h-3 text-blue-600" />
                  <span>{report.commentCount}</span>
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{formatTimeAgo(report.createdAt)}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
