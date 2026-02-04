import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/lib/api';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Clock, Loader2 } from 'lucide-react';

export default function PredictionBadge({ call }) {
  const { data, isLoading } = useQuery({
    queryKey: ['prediction', call.id],
    queryFn: () =>
      base44.functions
        .invoke('predictCallTimes', {
          location: call.location_city || call.pickup_location_city,
          service_type: call.service_type || call.issue_type,
          time_of_day: new Date().toLocaleTimeString('he-IL', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          vehicle_type: call.vehicle_type,
        })
        .then((res) => res.data),
    enabled: !!call,
    staleTime: 1000 * 60 * 30, // 30 minutes
  });

  if (isLoading) {
    return <Loader2 className="w-3 h-3 animate-spin text-gray-400" />;
  }

  if (!data) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-medium border border-indigo-100 cursor-help">
            <Clock className="w-3 h-3" />
            <span>צפי: {Math.round(data.estimated_response_minutes)} דק'</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs p-3 text-right" dir="rtl">
          <p className="font-semibold mb-1">תחזית AI:</p>
          <ul className="list-disc list-inside space-y-1 text-gray-300">
            <li>זמן הגעה משוער: {data.estimated_response_minutes} דקות</li>
            <li>זמן טיפול כולל: {data.estimated_completion_minutes} דקות</li>
          </ul>
          <div className="mt-2 pt-2 border-t border-gray-700">
            <p className="text-gray-400 mb-1">גורמים משפיעים:</p>
            {data.factors?.map((f, i) => (
              <p key={i} className="text-[10px] text-gray-300">
                • {f}
              </p>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
