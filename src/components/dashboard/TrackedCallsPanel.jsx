import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl, formatWaitTime } from '@/components/utils';
import { usePermissions } from '@/components/permissions/PermissionsContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import CollapsibleCard from '@/components/dashboard/CollapsibleCard';
import { Eye, ChevronLeft, PhoneCall, Car } from 'lucide-react';

const ACTIVE_STATUSES = [
  'waiting_treatment',
  'awaiting_assignment',
  'assigning',
  'vendor_enroute',
  'in_progress',
  'vendor_arrived',
];

const SERVICE_TYPE_LABELS = {
  towing: 'גרירה',
  flat_tire: "פנצ'ר",
  battery: 'מצבר',
  lockout: 'פתיחת רכב',
  fuel: 'דלק',
  accident: 'תאונה',
  mechanical: 'תקלה מכנית',
  other: 'אחר',
};

const STATUS_LABELS = {
  waiting_treatment: 'ממתין לטיפול',
  awaiting_assignment: 'ממתין לשיוך',
  assigning: 'ספק שובץ',
  vendor_enroute: 'ספק בדרך',
  in_progress: 'בטיפול',
  vendor_arrived: 'נותן השירות הגיע',
};

const STATUS_COLORS = {
  waiting_treatment: 'bg-red-100 text-red-700 border-red-200',
  awaiting_assignment: 'bg-orange-100 text-orange-700 border-orange-200',
  assigning: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  vendor_enroute: 'bg-blue-100 text-blue-700 border-blue-200',
  in_progress: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  vendor_arrived: 'bg-green-100 text-green-700 border-green-200',
};

/**
 * Calculate the elapsed time from a given date and return a human-readable Hebrew string.
 * Also returns a severity level for SLA warnings.
 */
function getElapsedTime(createdDate) {
  if (!createdDate) return { label: '-', minutes: 0 };

  const now = new Date();
  const created = new Date(createdDate);
  const diffMs = now - created;
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  return { label: formatWaitTime(diffMinutes) ?? '-', minutes: diffMinutes };
}

/**
 * Returns the SLA warning class based on elapsed minutes.
 * > 2 hours (120 min) = red, > 1 hour (60 min) = orange
 */
function getSlaRowClass(minutes) {
  if (minutes > 120) return 'bg-red-50 border-e-4 border-e-red-400';
  if (minutes > 60) return 'bg-orange-50 border-e-4 border-e-orange-400';
  return '';
}

export default function TrackedCallsPanel({ calls = [], isLoading, onCallClick }) {
  const { isAdmin } = usePermissions();

  const activeCalls = useMemo(
    () => calls.filter((c) => ACTIVE_STATUSES.includes(c.call_status)),
    [calls]
  );

  if (isLoading) {
    return <Skeleton className="h-64" />;
  }

  return (
    <CollapsibleCard
      title={
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-gray-800">קריאות במעקב</span>
          <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs">
            {activeCalls.length}
          </Badge>
        </div>
      }
      headerRight={
        <Link
          to={createPageUrl('Calls')}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium hover:underline flex items-center gap-1 transition-colors"
        >
          לכל הקריאות
          <ChevronLeft className="w-4 h-4" />
        </Link>
      }
    >
      {activeCalls.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 bg-gray-50 rounded-lg border border-dashed border-gray-200">
          <PhoneCall className="w-8 h-8 text-gray-300 mb-3" />
          <p className="text-sm text-gray-500">אין קריאות פעילות כרגע</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/80">
                <TableHead className="text-end font-semibold text-gray-600">מספר רכב</TableHead>
                <TableHead className="text-end font-semibold text-gray-600">מספר קריאה</TableHead>
                <TableHead className="text-end font-semibold text-gray-600">לקוח</TableHead>
                <TableHead className="text-end font-semibold text-gray-600">סוג שירות</TableHead>
                <TableHead className="text-end font-semibold text-gray-600">ספק משובץ</TableHead>
                <TableHead className="text-end font-semibold text-gray-600">סטטוס</TableHead>
                <TableHead className="text-end font-semibold text-gray-600">זמן שעבר</TableHead>
                <TableHead className="text-end font-semibold text-gray-600">פעולות</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeCalls.map((call) => {
                const elapsed = getElapsedTime(call.created_date);
                const slaClass = getSlaRowClass(elapsed.minutes);
                const statusColor = STATUS_COLORS[call.call_status] || '';

                return (
                  <TableRow key={call.id} className={`${slaClass} transition-colors`}>
                    <TableCell className="font-bold text-gray-900">
                      {call.vehicle_plate ? (
                        <span className="inline-flex items-center gap-1 tabular-nums" dir="ltr">
                          <Car className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          {call.vehicle_plate}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="font-medium text-gray-900">
                      {call.call_number || '-'}
                    </TableCell>
                    <TableCell className="text-gray-700">{call.customer_name || '-'}</TableCell>
                    <TableCell className="text-gray-700">
                      {SERVICE_TYPE_LABELS[call.service_type] || call.service_type || '-'}
                    </TableCell>
                    <TableCell className="text-gray-700">
                      {call.assigned_vendor_name || (
                        <span className="text-gray-400 text-xs">לא שובץ</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`${statusColor} text-xs whitespace-nowrap`}
                        variant="outline"
                      >
                        {STATUS_LABELS[call.call_status] || call.call_status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`text-sm font-medium ${
                          elapsed.minutes > 120
                            ? 'text-red-600'
                            : elapsed.minutes > 60
                              ? 'text-orange-600'
                              : 'text-gray-600'
                        }`}
                      >
                        {elapsed.label}
                      </span>
                    </TableCell>
                    <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-gray-500 hover:text-blue-600 hover:bg-blue-50"
                              onClick={() => onCallClick?.(call.id)}
                              aria-label="צפה"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>צפייה בפרטי הקריאה</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </CollapsibleCard>
  );
}
