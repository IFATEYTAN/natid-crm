import React from 'react';
import { createPageUrl } from '@/components/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download } from 'lucide-react';
import DataTable from '@/components/ui/DataTable';

export default function TotalsTab({
  filteredTotalsCalls,
  handleExportTotals,
  rangePreset,
  setRangePreset,
  customStart,
  setCustomStart,
  customEnd,
  setCustomEnd,
  columns,
  callsLoading,
}) {
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
                <Input type="datetime-local" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
              </div>
              <div className="flex-1">
                <label className="label-text">עד תאריך ושעה</label>
                <Input type="datetime-local" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
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
              {filteredTotalsCalls.filter((c) => ['waiting_treatment','awaiting_assignment','assigning','vendor_enroute','in_progress'].includes(c.call_status)).length}
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

        <DataTable
          columns={columns}
          data={filteredTotalsCalls}
          isLoading={callsLoading}
          onRowClick={(row) => (window.location.href = createPageUrl(`CallDetails?id=${row.id}`))}
          emptyMessage="לא נמצאו קריאות בטווח"
        />
      </CardContent>
    </Card>
  );
}