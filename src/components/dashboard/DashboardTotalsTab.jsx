import { lazyRetry } from '@/lib/lazyRetry';
import React, { useState, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { parseISO, subDays, startOfDay, endOfDay } from 'date-fns';
import { openStatuses } from './dashboardConstants';
import { getCallColumns } from './DashboardColumns';

const DataTableLazy = lazyRetry(() => import('@/components/ui/DataTable'));

export default function DashboardTotalsTab({ calls, callsLoading }) {
  const navigate = useNavigate();
  const [rangePreset, setRangePreset] = useState('last7');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const columns = getCallColumns();

  // Compute date range
  const now = new Date();
  let startDate = startOfDay(now);
  let endDate = endOfDay(now);
  switch (rangePreset) {
    case 'today':
      startDate = startOfDay(now);
      endDate = endOfDay(now);
      break;
    case 'yesterday':
      startDate = startOfDay(subDays(now, 1));
      endDate = endOfDay(subDays(now, 1));
      break;
    case 'last7':
      startDate = startOfDay(subDays(now, 6));
      endDate = endOfDay(now);
      break;
    case 'last30':
      startDate = startOfDay(subDays(now, 29));
      endDate = endOfDay(now);
      break;
    case 'custom':
      if (customStart) startDate = new Date(customStart);
      if (customEnd) endDate = new Date(customEnd);
      break;
    default:
      break;
  }

  const filteredTotalsCalls = calls.filter(
    (c) =>
      c.created_date && parseISO(c.created_date) >= startDate && parseISO(c.created_date) <= endDate
  );

  const handleExportTotals = () => {
    const headers = ['call_number', 'customer_name', 'call_status', 'created_date'];
    const rows = filteredTotalsCalls.map((c) => [
      c.call_number || `#${c.id?.slice(-6)}`,
      c.customer_name || '',
      c.call_status || '',
      c.created_date || '',
    ]);
    const csv = [
      headers.join(','),
      ...rows.map((r) => r.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'calls_totals.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>סה"כ קריאות</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row gap-3 md:items-end mb-4">
          <div className="w-full md:w-48">
            <Select value={rangePreset} onValueChange={setRangePreset}>
              <SelectTrigger>
                <SelectValue placeholder="טווח תאריכים" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">היום</SelectItem>
                <SelectItem value="yesterday">אתמול</SelectItem>
                <SelectItem value="last7">7 ימים אחרונים</SelectItem>
                <SelectItem value="last30">30 ימים אחרונים</SelectItem>
                <SelectItem value="custom">מותאם אישית</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {rangePreset === 'custom' && (
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <div className="flex-1">
                <label className="label-text">מתאריך ושעה</label>
                <Input
                  type="datetime-local"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                />
              </div>
              <div className="flex-1">
                <label className="label-text">עד תאריך ושעה</label>
                <Input
                  type="datetime-local"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                />
              </div>
            </div>
          )}
          <div className="md:ml-auto">
            <Button variant="outline" className="gap-2" onClick={handleExportTotals}>
              <Download className="w-4 h-4" /> יצוא
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-gray-50 p-4 rounded-lg text-center border border-gray-100">
            <div className="text-2xl font-bold text-gray-900">{filteredTotalsCalls.length}</div>
            <div className="text-xs text-gray-500">סה"כ קריאות בטווח</div>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg text-center border border-blue-100">
            <div className="text-2xl font-bold text-blue-600">
              {filteredTotalsCalls.filter((c) => openStatuses.includes(c.call_status)).length}
            </div>
            <div className="text-xs text-blue-500">פתוחות</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg text-center border border-green-100">
            <div className="text-2xl font-bold text-green-600">
              {filteredTotalsCalls.filter((c) => c.call_status === 'completed').length}
            </div>
            <div className="text-xs text-green-500">הושלמו</div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg text-center border border-red-100">
            <div className="text-2xl font-bold text-red-600">
              {filteredTotalsCalls.filter((c) => c.call_status === 'cancelled').length}
            </div>
            <div className="text-xs text-red-500">בוטלו</div>
          </div>
        </div>

        <Suspense fallback={<Skeleton className="h-40" />}>
          <DataTableLazy
            columns={columns}
            data={filteredTotalsCalls}
            isLoading={callsLoading}
            onRowClick={(row) => navigate(createPageUrl('CallDetails') + '?id=' + row.id)}
            emptyMessage="לא נמצאו קריאות בטווח"
          />
        </Suspense>
      </CardContent>
    </Card>
  );
}
