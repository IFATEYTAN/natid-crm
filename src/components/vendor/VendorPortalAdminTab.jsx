import { lazyRetry } from '@/lib/lazyRetry';
import React, { useMemo, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { queryKeys } from '@/lib/queryKeys';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import StatusBadge from '@/components/ui/StatusBadge';
import { MapPin } from 'lucide-react';
import VendorEmailLinker from './VendorEmailLinker';
import { format } from 'date-fns';
import { issueTypeLabels } from '@/config/labels';

const DataTableLazy = lazyRetry(() => import('@/components/ui/DataTable'));

export default function VendorPortalAdminTab({ onSelectVendor }) {
  const [selectedVendorId, setSelectedVendorId] = React.useState('');

  const allVendorsQuery = useQuery({
    queryKey: queryKeys.vendors.all(),
    queryFn: () => base44.entities.Vendor.list('-vendor_name', 500),
  });

  const adminCallsQuery = useQuery({
    queryKey: queryKeys.adminCalls.all(),
    queryFn: () => base44.entities.Call.list('-created_date', 500),
    refetchInterval: 30000,
    staleTime: 1000 * 15, // 15 seconds
  });

  const adminCalls = adminCallsQuery.data || [];

  const adminActiveCalls = useMemo(
    () =>
      adminCalls.filter((c) =>
        ['vendor_enroute', 'in_progress', 'assigned', 'assigning'].includes(c.call_status)
      ),
    [adminCalls]
  );

  const adminCompletedCalls = adminCalls.filter((c) => c.call_status === 'completed');

  const adminColumns = [
    {
      header: 'מספר קריאה',
      accessor: 'call_number',
      cell: (call) => (
        <Link
          to={createPageUrl(`VendorCallManagement?id=${call.id}`)}
          className="font-medium text-blue-600 hover:underline"
        >
          {call.call_number}
        </Link>
      ),
    },
    {
      header: 'לקוח',
      accessor: 'customer_name',
      cell: (call) => (
        <div>
          <div className="font-medium">{call.customer_name}</div>
          <div className="text-xs text-[#6B778C]" dir="ltr">
            {call.customer_phone}
          </div>
        </div>
      ),
    },
    {
      header: 'ספק',
      accessor: 'assigned_vendor_name',
      cell: (call) => call.assigned_vendor_name || '-',
    },
    {
      header: 'סוג תקלה',
      accessor: 'issue_type',
      cell: (call) => issueTypeLabels[call.issue_type] || call.issue_type,
    },
    {
      header: 'מיקום',
      accessor: 'pickup_location_address',
      cell: (call) => (
        <div className="flex items-center gap-1 text-sm max-w-[200px]">
          <MapPin className="w-3 h-3 text-[#6B778C] shrink-0" />
          <span className="truncate">{call.pickup_location_address}</span>
        </div>
      ),
    },
    {
      header: 'סטטוס',
      accessor: 'call_status',
      cell: (call) => <StatusBadge status={call.call_status} />,
    },
    {
      header: 'תאריך',
      accessor: 'created_date',
      cell: (call) => {
        const d = call?.created_date ? new Date(call.created_date) : null;
        return d && !isNaN(d) ? format(d, 'dd/MM HH:mm') : '-';
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#172B4D]">סקירה אדמינית - פורטל ספקים</h1>
          <p className="text-[#6B778C] text-sm">צפייה בכל הקריאות וכל הספקים</p>
        </div>
      </div>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle className="text-lg">פתח פורטל לספק</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="label-text">בחר ספק</label>
            <Select value={selectedVendorId} onValueChange={setSelectedVendorId}>
              <SelectTrigger>
                <SelectValue placeholder="בחר ספק" />
              </SelectTrigger>
              <SelectContent>
                {(allVendorsQuery.data || []).map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.vendor_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            className="w-full"
            disabled={!selectedVendorId}
            onClick={() => {
              const v = (allVendorsQuery.data || []).find((x) => x.id === selectedVendorId);
              if (v) onSelectVendor(v);
            }}
          >
            פתח פורטל לספק
          </Button>
        </CardContent>
      </Card>

      <VendorEmailLinker vendors={allVendorsQuery.data || []} />

      <Card className="bg-white">
        <CardHeader>
          <Tabs defaultValue="all" className="w-full" dir="rtl">
            <TabsList>
              <TabsTrigger value="all">כל הקריאות</TabsTrigger>
              <TabsTrigger value="active">פעילות ({adminActiveCalls.length})</TabsTrigger>
              <TabsTrigger value="completed">הושלמו ({adminCompletedCalls.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="all" className="mt-4">
              <Suspense fallback={<Skeleton className="h-40" />}>
                <DataTableLazy
                  columns={adminColumns}
                  data={adminCalls}
                  emptyMessage="אין קריאות להצגה"
                />
              </Suspense>
            </TabsContent>
            <TabsContent value="active" className="mt-4">
              <Suspense fallback={<Skeleton className="h-40" />}>
                <DataTableLazy
                  columns={adminColumns}
                  data={adminActiveCalls}
                  emptyMessage="אין קריאות פעילות"
                />
              </Suspense>
            </TabsContent>
            <TabsContent value="completed" className="mt-4">
              <Suspense fallback={<Skeleton className="h-40" />}>
                <DataTableLazy
                  columns={adminColumns}
                  data={adminCompletedCalls}
                  emptyMessage="אין קריאות שהושלמו"
                />
              </Suspense>
            </TabsContent>
          </Tabs>
        </CardHeader>
      </Card>
    </div>
  );
}