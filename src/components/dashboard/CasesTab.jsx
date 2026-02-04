import React from 'react';
import { createPageUrl } from '@/components/utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import DataTable from '@/components/ui/DataTable';

export default function CasesTab({
  filteredCalls,
  callsLoading,
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  openStatuses,
  columns,
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>ניהול קריאות שירות</CardTitle>
        <CardDescription>צפייה וסינון כלל הקריאות במערכת</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Input
              placeholder="חיפוש לפי שם, מספר קריאה או טלפון..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="סינון לפי סטטוס" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל הסטטוסים</SelectItem>
              <SelectItem value="waiting_treatment">ממתין לטיפול</SelectItem>
              <SelectItem value="awaiting_assignment">ממתין לשיוך</SelectItem>
              <SelectItem value="assigning">בשיוך</SelectItem>
              <SelectItem value="vendor_enroute">ספק בדרך</SelectItem>
              <SelectItem value="in_progress">בטיפול</SelectItem>
              <SelectItem value="completed">הושלם</SelectItem>
              <SelectItem value="cancelled">בוטל</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 p-4 rounded-lg text-center border border-gray-100">
            <div className="text-2xl font-bold text-gray-900">{filteredCalls.length}</div>
            <div className="text-xs text-gray-500 uppercase tracking-wide">סה״כ רשומות</div>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg text-center border border-blue-100">
            <div className="text-2xl font-bold text-blue-600">
              {filteredCalls.filter((c) => openStatuses.includes(c.call_status)).length}
            </div>
            <div className="text-xs text-blue-500 uppercase tracking-wide">פתוחות</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg text-center border border-green-100">
            <div className="text-2xl font-bold text-green-600">
              {filteredCalls.filter((c) => c.call_status === 'completed').length}
            </div>
            <div className="text-xs text-green-500 uppercase tracking-wide">הושלמו</div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg text-center border border-red-100">
            <div className="text-2xl font-bold text-red-600">
              {filteredCalls.filter((c) => c.call_status === 'cancelled').length}
            </div>
            <div className="text-xs text-red-500 uppercase tracking-wide">בוטלו</div>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={filteredCalls}
          isLoading={callsLoading}
          onRowClick={(row) => (window.location.href = createPageUrl('CallDetails') + '?id=' + row.id)}
          emptyMessage="לא נמצאו קריאות התואמות לחיפוש"
        />
      </CardContent>
    </Card>
  );
}