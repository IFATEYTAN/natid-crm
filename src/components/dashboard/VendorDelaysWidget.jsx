import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl, safeParseISO } from '@/components/utils';
import { Clock, Timer, Eye, TrendingDown, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { openStatuses } from '@/components/dashboard/dashboardConstants';
import { differenceInMinutes } from 'date-fns';

/**
 * Calculates delay info for a call
 * Returns: { isDelayed, delayMinutes, delayType, severity }
 */
function getCallDelayInfo(call) {
  const now = new Date();
  const result = { isDelayed: false, delayMinutes: 0, delayType: '', severity: 'none' };

  // Only check open calls that have a vendor assigned
  if (!openStatuses.includes(call.call_status)) return result;

  // Check 1: Vendor assigned but hasn't arrived yet - compare to estimated arrival
  if (
    call.assigned_at &&
    call.call_status !== 'vendor_arrived' &&
    call.call_status !== 'in_progress' &&
    call.call_status !== 'completed'
  ) {
    // Check against estimated_arrival_time
    const estimatedArrival = safeParseISO(call.estimated_arrival_time);
    if (estimatedArrival) {
      if (now > estimatedArrival) {
        const minutes = differenceInMinutes(now, estimatedArrival);
        if (minutes > 0) {
          result.isDelayed = true;
          result.delayMinutes = minutes;
          result.delayType = 'arrival';
        }
      }
    }

    // Check against vendor_arrival_time_estimated
    const vendorEta = safeParseISO(call.vendor_arrival_time_estimated);
    if (!result.isDelayed && vendorEta) {
      if (now > vendorEta) {
        const minutes = differenceInMinutes(now, vendorEta);
        if (minutes > 0) {
          result.isDelayed = true;
          result.delayMinutes = minutes;
          result.delayType = 'vendor_eta';
        }
      }
    }
  }

  // Check 2: SLA breach - time since creation vs SLA target
  const assignedTime = safeParseISO(call.assigned_at);
  if (assignedTime && call.sla_target) {
    const minutesSinceAssignment = differenceInMinutes(now, assignedTime);
    if (
      minutesSinceAssignment > call.sla_target &&
      call.call_status !== 'completed' &&
      call.call_status !== 'cancelled'
    ) {
      const slaDelay = minutesSinceAssignment - call.sla_target;
      if (slaDelay > result.delayMinutes) {
        result.isDelayed = true;
        result.delayMinutes = slaDelay;
        result.delayType = 'sla_breach';
      }
    }
  }

  // Check 3: Waiting too long without assignment
  if (
    !call.assigned_vendor_id &&
    call.created_date &&
    (call.call_status === 'waiting_treatment' || call.call_status === 'awaiting_assignment')
  ) {
    const createdTime = safeParseISO(call.created_date);
    const waitMinutes = createdTime ? differenceInMinutes(now, createdTime) : 0;
    if (waitMinutes > 15) {
      result.isDelayed = true;
      result.delayMinutes = waitMinutes;
      result.delayType = 'no_assignment';
    }
  }

  // Determine severity
  if (result.isDelayed) {
    if (result.delayMinutes >= 30) {
      result.severity = 'critical';
    } else if (result.delayMinutes >= 15) {
      result.severity = 'high';
    } else {
      result.severity = 'medium';
    }
  }

  return result;
}

const severityConfig = {
  critical: { label: 'קריטי', color: 'bg-red-600 text-white', border: 'border-red-500' },
  high: { label: 'גבוה', color: 'bg-orange-500 text-white', border: 'border-orange-400' },
  medium: { label: 'בינוני', color: 'bg-yellow-500 text-white', border: 'border-yellow-400' },
};

const delayTypeLabels = {
  arrival: 'חריגה מזמן הגעה',
  vendor_eta: 'חריגה מ-ETA ספק',
  sla_breach: 'חריגת SLA',
  no_assignment: 'ללא שיבוץ',
};

function formatDelay(minutes) {
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours} שע׳ ${mins > 0 ? `ו-${mins} דק׳` : ''}`;
  }
  return `${minutes} דקות`;
}

export default function VendorDelaysWidget({ calls, isLoading, compact = false }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const delayedCalls = useMemo(() => {
    if (!calls || calls.length === 0) return [];

    return calls
      .map((call) => ({
        ...call,
        delayInfo: getCallDelayInfo(call),
      }))
      .filter((c) => c.delayInfo.isDelayed)
      .sort((a, b) => b.delayInfo.delayMinutes - a.delayInfo.delayMinutes);
  }, [calls]);

  const criticalCount = delayedCalls.filter((c) => c.delayInfo.severity === 'critical').length;
  const highCount = delayedCalls.filter((c) => c.delayInfo.severity === 'high').length;
  const mediumCount = delayedCalls.filter((c) => c.delayInfo.severity === 'medium').length;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-5 w-40 bg-gray-200 rounded" />
            <div className="h-20 bg-gray-100 rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={delayedCalls.length > 0 ? 'border-e-4 border-e-orange-500' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Timer className="w-5 h-5 text-orange-500" />
            ניהול איחורים
            {delayedCalls.length > 0 && (
              <Badge className="bg-orange-500 text-white me-2">{delayedCalls.length}</Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {delayedCalls.length > 0 && !isCollapsed && (
              <div className="flex gap-2">
                {criticalCount > 0 && (
                  <Badge className="bg-red-600 text-white text-xs">{criticalCount} קריטי</Badge>
                )}
                {highCount > 0 && (
                  <Badge className="bg-orange-500 text-white text-xs">{highCount} גבוה</Badge>
                )}
                {mediumCount > 0 && (
                  <Badge className="bg-yellow-500 text-white text-xs">{mediumCount} בינוני</Badge>
                )}
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setIsCollapsed(!isCollapsed)}
            >
              {isCollapsed ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronUp className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      {!isCollapsed && (
        <CardContent>
          {delayedCalls.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mb-3">
                <Clock className="w-6 h-6 text-green-500" />
              </div>
              <p className="text-sm font-medium text-green-700">אין איחורים כרגע</p>
              <p className="text-xs text-gray-500 mt-1">כל הקריאות עומדות בלוח הזמנים</p>
            </div>
          ) : (
            <div className="space-y-3">
              {delayedCalls.slice(0, compact ? 5 : 10).map((call) => {
                const { delayInfo } = call;
                const config = severityConfig[delayInfo.severity];
                return (
                  <div
                    key={call.id}
                    className={`flex items-center justify-between p-3 bg-white rounded-lg border ${config.border} shadow-sm hover:shadow-md transition-shadow`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Link
                          to={createPageUrl('CallDetails') + '?id=' + call.id}
                          className="font-bold text-gray-900 hover:text-blue-600 hover:underline text-sm"
                        >
                          {call.call_number || `#${call.id?.slice(-6)}`}
                        </Link>
                        <Badge className={`${config.color} text-[10px] px-1.5 py-0`}>
                          {config.label}
                        </Badge>
                        <span className="text-[10px] text-gray-400">
                          {delayTypeLabels[delayInfo.delayType]}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-600">
                        <span className="font-medium">{call.customer_name}</span>
                        <span>•</span>
                        <span>{call.pickup_location_city || '—'}</span>
                        {call.assigned_vendor_name && (
                          <>
                            <span>•</span>
                            <span className="text-blue-600">{call.assigned_vendor_name}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 me-3">
                      <div className="text-start">
                        <div className="flex items-center gap-1">
                          <TrendingDown className="w-3.5 h-3.5 text-red-500" />
                          <span className="text-sm font-bold text-red-600">
                            {formatDelay(delayInfo.delayMinutes)}
                          </span>
                        </div>
                        <span className="text-[10px] text-gray-400">איחור</span>
                      </div>
                      <Link to={createPageUrl('CallDetails') + '?id=' + call.id}>
                        <Button size="sm" variant="outline" className="border-gray-200 h-8 text-xs">
                          <Eye className="w-3.5 h-3.5 ms-1" />
                          צפה
                        </Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
              {delayedCalls.length > (compact ? 5 : 10) && (
                <p className="text-xs text-center text-gray-500 pt-2">
                  ועוד {delayedCalls.length - (compact ? 5 : 10)} קריאות נוספות עם איחור...
                </p>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export { getCallDelayInfo, formatDelay };
