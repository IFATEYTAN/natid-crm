import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, subDays } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import QueryErrorState from '@/components/ui/QueryErrorState';
import DataTable from '@/components/ui/DataTable';
import ExportMenu from '@/components/ui/ExportMenu';
import { RefreshCw } from 'lucide-react';
import { statusLabels, issueTypeLabels } from '@/config/labels';
import { satisfactionLabels, satisfactionColors } from '@/config/satisfaction';
import { queryKeys } from '@/lib/queryKeys';
import { cn } from '@/lib/utils';

const todayStr = () => format(new Date(), 'yyyy-MM-dd');
const monthAgoStr = () => format(subDays(new Date(), 30), 'yyyy-MM-dd');

const COLUMNS = [
  { header: 'ק"מ בקריאה', accessor: 'distance_km' },
  { header: 'יעד', accessor: 'destination' },
  { header: 'מקור', accessor: 'source' },
  { header: "מס' פוליסה", accessor: 'policy_number' },
  { header: 'שם חברה', accessor: 'insurance_company' },
  { header: "מס' רכב", accessor: 'vehicle_plate' },
  { header: "משך זמן הגעה ללקוח (דק')", accessor: 'arrival_duration_minutes' },
  {
    header: 'זמן הגעה ללקוח',
    accessor: 'arrival_time',
    cell: (row) => (row.arrival_time ? format(new Date(row.arrival_time), 'dd/MM/yy HH:mm') : '—'),
  },
  {
    header: 'שעת הגעה ליעד פריקה',
    accessor: 'dropoff_arrival_time',
    cell: (row) =>
      row.dropoff_arrival_time ? format(new Date(row.dropoff_arrival_time), 'dd/MM/yy HH:mm') : '—',
  },
  { header: 'סוג שירות', accessor: 'service_type' },
  {
    header: 'תקלה מדווחת',
    accessor: 'reported_issue',
    cell: (row) => issueTypeLabels[row.reported_issue] || row.reported_issue || '—',
  },
  { header: "ביצועים (מס' ספקים)", accessor: 'vendor_count' },
  { header: 'תאריך דיווח', accessor: 'report_date' },
  { header: 'שעת דיווח', accessor: 'report_time' },
  {
    header: 'סטטוס',
    accessor: 'status',
    cell: (row) => statusLabels[row.status] || row.status || '—',
  },
  { header: 'שם מקבל הקריאה', accessor: 'taken_by' },
  { header: "מס' קריאה", accessor: 'call_number' },
  { header: 'שם לקוח פונה', accessor: 'customer_name' },
  { header: 'טלפון לקוח', accessor: 'customer_phone' },
  { header: 'אינדיקציית אחסנת לילה', accessor: 'overnight_storage' },
  {
    header: 'שביעות רצון לקוח',
    accessor: 'satisfaction_status',
    cell: (row) => (
      <Badge
        variant="outline"
        className={cn('text-xs', satisfactionColors[row.satisfaction_status])}
      >
        {satisfactionLabels[row.satisfaction_status] || row.satisfaction_status}
      </Badge>
    ),
  },
];

export default function CallUsageReport() {
  const [from, setFrom] = useState(monthAgoStr());
  const [to, setTo] = useState(todayStr());

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: queryKeys.reports.usageReport(from, to),
    queryFn: () =>
      base44.functions.invoke('getUsageReport', {
        from: new Date(from).toISOString(),
        to: new Date(`${to}T23:59:59`).toISOString(),
      }),
    staleTime: 1000 * 60 * 2,
  });

  const rows = useMemo(() => data?.data?.rows || [], [data]);

  if (isError) {
    return <QueryErrorState error={error} onRetry={refetch} entityName="Call" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#172B4D]">דוח שימושים</h1>
          <p className="text-[#6B778C] text-sm">
            שורה אחת לכל קריאה (גם כשיש כמה ספקים) — {rows.length} קריאות בטווח שנבחר
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportMenu data={rows} columns={COLUMNS} filename="usage-report" title="דוח שימושים" />
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
            <RefreshCw className={cn('w-4 h-4', isFetching && 'animate-spin')} />
            רענן
          </Button>
        </div>
      </div>

      <Card className="bg-white">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">טווח תאריכים</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-4">
          <div>
            <Label htmlFor="usage-report-from">מתאריך</Label>
            <Input
              id="usage-report-from"
              type="date"
              value={from}
              max={to}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="usage-report-to">עד תאריך</Label>
            <Input
              id="usage-report-to"
              type="date"
              value={to}
              min={from}
              max={todayStr()}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white">
        <CardContent className="pt-6">
          <DataTable
            columns={COLUMNS}
            data={rows}
            isLoading={isLoading}
            emptyMessage="אין קריאות בטווח התאריכים שנבחר"
            pageSize={50}
          />
        </CardContent>
      </Card>
    </div>
  );
}
