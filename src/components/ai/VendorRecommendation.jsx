import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Trophy, MapPin, Clock } from 'lucide-react';
import { getCoverageLabel } from '@/config/coverageConstants';

export default function VendorRecommendation({ callDetails, onSelectVendor }) {
  const { data, isLoading } = useQuery({
    queryKey: ['vendor-recommendation', callDetails?.id],
    queryFn: () =>
      base44.functions
        .invoke('recommendVendor', { call_details: callDetails })
        .then((res) => res.data),
    enabled: !!callDetails,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  if (isLoading) {
    return (
      <div className="space-y-3 p-4 border border-indigo-100 rounded-lg bg-indigo-50/50">
        <div className="flex items-center gap-2 text-indigo-600 mb-2">
          <Sparkles className="w-4 h-4 animate-pulse" />
          <span className="text-sm font-medium">ה-AI מחפש את הספקים המתאימים ביותר...</span>
        </div>
        <Skeleton className="h-16 w-full bg-white" />
        <Skeleton className="h-16 w-full bg-white" />
        <Skeleton className="h-16 w-full bg-white" />
      </div>
    );
  }

  if (!data?.recommendations?.length) return null;

  return (
    <div className="space-y-3" dir="rtl">
      <div className="flex items-center gap-2 mb-2">
        <div className="bg-gradient-to-l from-indigo-500 to-purple-500 text-white p-1 rounded-md">
          <Sparkles className="w-3 h-3" />
        </div>
        <h4 className="text-sm font-semibold text-gray-900">המלצות AI להקצאה</h4>
      </div>

      <div className="grid gap-3">
        {data.recommendations.map((rec, index) => (
          <div
            key={rec.vendor_id}
            className="group relative bg-white border border-gray-200 rounded-lg p-3 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer"
            onClick={() => onSelectVendor && rec.vendor && onSelectVendor(rec.vendor)}
          >
            {index === 0 && (
              <div className="absolute -top-2 -right-2 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                <Trophy className="w-3 h-3" />
                מומלץ ביותר
              </div>
            )}

            <div className="flex justify-between items-start mb-2">
              <div>
                <h5 className="font-semibold text-gray-900">{rec.vendor?.vendor_name || '-'}</h5>
                <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {rec.vendor?.coverage_areas?.slice(0, 2).map(getCoverageLabel).join(', ') ||
                      '-'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {rec.vendor?.average_response_time
                      ? `~${Math.round(rec.vendor.average_response_time)} דק'`
                      : '-'}
                  </span>
                </div>
              </div>
              <Badge
                variant="outline"
                className={`
                                ${
                                  rec.match_score >= 90
                                    ? 'bg-green-50 text-green-700 border-green-200'
                                    : rec.match_score >= 75
                                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                                      : 'bg-gray-50 text-gray-700 border-gray-200'
                                }
                            `}
              >
                {Math.round(rec.match_score)}% התאמה
              </Badge>
            </div>

            <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded border border-gray-100 group-hover:bg-indigo-50/50 group-hover:border-indigo-100 transition-colors">
              <span className="font-medium text-indigo-600">למה כדאי? </span>
              {rec.reason}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
