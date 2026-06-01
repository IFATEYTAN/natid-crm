import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { queryKeys } from '@/lib/queryKeys';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Phone,
  UserCheck,
  Navigation,
  MapPin,
  Wrench,
  CheckCircle2,
  Clock,
  XCircle,
  Route,
} from 'lucide-react';
import { formatDateTime } from '@/components/utils';
import { statusLabels } from '@/config/labels';

/**
 * Journey steps representing the vendor-side lifecycle of a service call.
 * Each step maps to one or more call statuses.
 */
const journeySteps = [
  {
    key: 'received',
    label: 'קריאה התקבלה',
    description: 'הקריאה שובצה לספק',
    icon: Phone,
    statuses: ['assigning'],
    color: 'blue',
  },
  {
    key: 'accepted',
    label: 'ספק אישר',
    description: 'הספק אישר את הקריאה',
    icon: UserCheck,
    statuses: ['assigned'],
    color: 'indigo',
  },
  {
    key: 'enroute',
    label: 'בדרך למקום',
    description: 'הספק יצא לכיוון הלקוח',
    icon: Navigation,
    statuses: ['vendor_enroute'],
    color: 'purple',
  },
  {
    key: 'arrived',
    label: 'הגעה למקום',
    description: 'הספק הגיע ליעד',
    icon: MapPin,
    statuses: ['vendor_arrived'],
    color: 'amber',
  },
  {
    key: 'in_progress',
    label: 'בטיפול',
    description: 'הספק מבצע את העבודה',
    icon: Wrench,
    statuses: ['in_progress'],
    color: 'orange',
  },
  {
    key: 'completed',
    label: 'סגור',
    description: 'הטיפול הסתיים בהצלחה',
    icon: CheckCircle2,
    statuses: ['completed'],
    color: 'green',
  },
];

const colorMap = {
  blue: {
    bg: 'bg-blue-100',
    text: 'text-blue-600',
    border: 'border-blue-400',
    line: 'bg-blue-400',
  },
  indigo: {
    bg: 'bg-indigo-100',
    text: 'text-indigo-600',
    border: 'border-indigo-400',
    line: 'bg-indigo-400',
  },
  purple: {
    bg: 'bg-purple-100',
    text: 'text-purple-600',
    border: 'border-purple-400',
    line: 'bg-purple-400',
  },
  amber: {
    bg: 'bg-amber-100',
    text: 'text-amber-600',
    border: 'border-amber-400',
    line: 'bg-amber-400',
  },
  orange: {
    bg: 'bg-orange-100',
    text: 'text-orange-600',
    border: 'border-orange-400',
    line: 'bg-orange-400',
  },
  green: {
    bg: 'bg-green-100',
    text: 'text-green-600',
    border: 'border-green-400',
    line: 'bg-green-400',
  },
};

/**
 * Calculate duration between two ISO date strings.
 * Returns a Hebrew-formatted string like "15 דקות" or "2 שעות ו-30 דקות".
 */
function formatDuration(startDate, endDate) {
  if (!startDate || !endDate) return null;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffMs = end - start;
  if (diffMs < 0) return null;

  const totalMinutes = Math.floor(diffMs / 60000);
  if (totalMinutes < 1) return 'פחות מדקה';

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) return `${minutes} דקות`;
  if (minutes === 0) return `${hours} שעות`;
  return `${hours} שעות ו-${minutes} דקות`;
}

/**
 * VendorCustomerJourney - displays the full customer journey timeline
 * from the vendor's perspective, from call assignment to completion.
 */
export default function VendorCustomerJourney({ callId, call }) {
  // Fetch call history for this call
  const historyQuery = useQuery({
    queryKey: queryKeys.callHistory.byCall(callId),
    queryFn: () => base44.entities.CallHistory.filter({ call_id: callId }, 'created_date', 1000),
    enabled: !!callId,
    staleTime: 1000 * 30,
  });

  const history = historyQuery.data || [];

  // Build timeline data by mapping history events to journey steps
  const journeyData = useMemo(() => {
    // Extract status change events from history
    const statusChanges = history
      .filter((h) => h.change_type === 'status')
      .sort((a, b) => new Date(a.created_date) - new Date(b.created_date));

    // Map each journey step to its timestamp from history
    return journeySteps.map((step) => {
      // Find the first history event that transitions INTO one of this step's statuses
      let historyEvent = statusChanges.find((h) => step.statuses.includes(h.new_value));

      // Special case: "received" step can also use assigned_at from the call itself
      let timestamp = historyEvent?.created_date;
      if (step.key === 'received' && !timestamp && call?.assigned_at) {
        timestamp = call.assigned_at;
      }
      // Special case: "accepted" - if no explicit "assigned" status in history,
      // use the assigning→vendor_enroute transition or assigned_at
      if (step.key === 'accepted' && !timestamp) {
        const assignEvent = statusChanges.find(
          (h) => h.change_type === 'status' && h.old_value === 'assigning'
        );
        if (assignEvent) {
          timestamp = assignEvent.created_date;
        } else if (call?.assigned_at) {
          timestamp = call.assigned_at;
        }
      }
      // Special case: "arrived" - use vendor_arrival_time_actual from call
      if (step.key === 'arrived' && !timestamp && call?.vendor_arrival_time_actual) {
        timestamp = call.vendor_arrival_time_actual;
      }
      // Special case: "in_progress" - also check vendor_arrival_time_actual
      if (step.key === 'in_progress' && !timestamp && call?.vendor_arrival_time_actual) {
        timestamp = call.vendor_arrival_time_actual;
      }
      // Special case: "completed" - use closed_at from call
      if (step.key === 'completed' && !timestamp && call?.closed_at) {
        timestamp = call.closed_at;
      }

      const notes = historyEvent?.notes || null;
      const changedBy = historyEvent?.changed_by || null;

      return {
        ...step,
        timestamp,
        notes,
        changedBy,
        isCompleted: !!timestamp,
      };
    });
  }, [history, call]);

  // Determine which step is currently active
  const currentStepIndex = useMemo(() => {
    const currentStatus = call?.call_status;
    if (currentStatus === 'cancelled') return -1;

    // Find the last completed step
    let lastCompleted = -1;
    for (let i = journeyData.length - 1; i >= 0; i--) {
      if (journeyData[i].isCompleted) {
        lastCompleted = i;
        break;
      }
    }
    return lastCompleted;
  }, [journeyData, call?.call_status]);

  const isCancelled = call?.call_status === 'cancelled';

  // Calculate total duration from first to last completed step
  const totalDuration = useMemo(() => {
    const completedSteps = journeyData.filter((s) => s.isCompleted && s.timestamp);
    if (completedSteps.length < 2) return null;
    const first = completedSteps[0].timestamp;
    const last = completedSteps[completedSteps.length - 1].timestamp;
    return formatDuration(first, last);
  }, [journeyData]);

  return (
    <Card className="bg-white">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Route className="w-4 h-4 text-[#6B778C]" />
          מסע הלקוח
        </CardTitle>
        {totalDuration && (
          <p className="text-xs text-[#6B778C] flex items-center gap-1 mt-1">
            <Clock className="w-3 h-3" />
            זמן כולל: {totalDuration}
          </p>
        )}
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {isCancelled && (
          <div className="flex items-center gap-2 mb-4 p-3 bg-red-50 rounded-lg border border-red-200">
            <XCircle className="w-5 h-5 text-red-500 shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-700">הקריאה בוטלה</p>
              <p className="text-xs text-red-600">
                {statusLabels[call?.call_status]}{' '}
                {call?.closed_at ? `• ${formatDateTime(call.closed_at)}` : ''}
              </p>
            </div>
          </div>
        )}

        {/* Vertical Timeline */}
        <div className="relative">
          {journeyData.map((step, idx) => {
            const Icon = step.icon;
            const colors = colorMap[step.color];
            const isCompleted = step.isCompleted;
            const isActive = idx === currentStepIndex && !isCancelled;
            const isFuture = !isCompleted && !isActive;
            const isLast = idx === journeyData.length - 1;

            // Duration from this step to the next completed step
            const nextCompleted = journeyData[idx + 1];
            const stepDuration =
              isCompleted && nextCompleted?.isCompleted
                ? formatDuration(step.timestamp, nextCompleted.timestamp)
                : null;

            return (
              <div key={step.key} className="flex gap-3">
                {/* Timeline column */}
                <div className="flex flex-col items-center">
                  {/* Icon circle */}
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 shrink-0 transition-all ${
                      isCompleted
                        ? `${colors.bg} ${colors.text} ${colors.border}`
                        : isActive
                          ? `${colors.bg} ${colors.text} ${colors.border} ring-2 ring-offset-2 ring-${step.color}-300`
                          : 'bg-gray-50 text-gray-300 border-gray-200'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  {/* Connecting line */}
                  {!isLast && (
                    <div className="flex flex-col items-center flex-1 min-h-[24px]">
                      <div
                        className={`w-0.5 flex-1 ${
                          isCompleted && nextCompleted?.isCompleted ? colors.line : 'bg-gray-200'
                        }`}
                      />
                      {stepDuration && (
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0 my-1 text-[#6B778C] border-gray-200 whitespace-nowrap"
                        >
                          <Clock className="w-2.5 h-2.5 me-1" />
                          {stepDuration}
                        </Badge>
                      )}
                      <div
                        className={`w-0.5 flex-1 ${
                          isCompleted && nextCompleted?.isCompleted ? colors.line : 'bg-gray-200'
                        }`}
                      />
                    </div>
                  )}
                </div>

                {/* Content column */}
                <div className={`pb-6 ${isLast ? 'pb-0' : ''}`}>
                  <div className="flex items-center gap-2">
                    <h4
                      className={`text-sm font-semibold ${
                        isFuture ? 'text-gray-400' : 'text-[#172B4D]'
                      }`}
                    >
                      {step.label}
                    </h4>
                    {isActive && !isCancelled && (
                      <Badge className="bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0">
                        כעת
                      </Badge>
                    )}
                  </div>
                  <p className={`text-xs ${isFuture ? 'text-gray-300' : 'text-[#6B778C]'}`}>
                    {step.description}
                  </p>
                  {step.timestamp && (
                    <p className="text-xs text-[#6B778C] mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDateTime(step.timestamp)}
                    </p>
                  )}
                  {step.changedBy && (
                    <p className="text-xs text-[#6B778C] mt-0.5">ע״י {step.changedBy}</p>
                  )}
                  {step.notes && (
                    <p className="text-xs text-[#6B778C] mt-1 bg-gray-50 rounded px-2 py-1">
                      {step.notes}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
