import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import StatCard from '@/components/ui/StatCard';
import StatusBadge from '@/components/ui/StatusBadge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Headphones, CheckCircle2, Users, AlertCircle, Truck, Eye } from 'lucide-react';
import DataTable from '@/components/ui/DataTable';

export default function OperatorTab({
  stats,
  myOpenCalls,
  callsLoading,
  availableVendors,
  vendorsLoading,
  operatorCallColumns,
  vendorColumns,
}) {
  const { myOpenCallsCount, myCompletedTodayCount, unassignedCallsCount, myUrgentCallsCount, availableVendorsCount } = stats || {};

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard title="הקריאות שלי" value={myOpenCallsCount} subtitle="בטיפול פעיל" icon={Headphones} variant="primary" to={createPageUrl('MyQueue')} className="hover:border-blue-300 cursor-pointer" />
        <StatCard title="הושלמו היום" value={myCompletedTodayCount} subtitle="ביצוע אישי" icon={CheckCircle2} variant="success" to={createPageUrl('Reports')} className="hover:border-green-300 cursor-pointer" />
        <StatCard title="ממתינות לשיוך" value={unassignedCallsCount} subtitle="כללי במערכת" icon={Users} variant="warning" to={createPageUrl('Calls') + '?status=waiting_treatment'} className="hover:border-orange-300 cursor-pointer" />
        <StatCard title="דחופות שלי" value={myUrgentCallsCount} subtitle="נדרש טיפול" icon={AlertCircle} variant="danger" to={createPageUrl('Calls') + '?priority=urgent'} className="hover:border-red-300 cursor-pointer" />
        <StatCard title="ספקים זמינים" value={availableVendorsCount} subtitle="בזמן אמת" icon={Truck} variant="default" to={createPageUrl('AllVendorsMap')} className="hover:border-gray-300 cursor-pointer" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>הקריאות שלי בטיפול</CardTitle>
            <CardDescription>קריאות המשויכות אליך וממתינות לטיפול</CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={operatorCallColumns}
              data={myOpenCalls}
              isLoading={callsLoading}
              onRowClick={(row) => (window.location.href = createPageUrl('CallDetails') + '?id=' + row.id)}
              emptyMessage="אין קריאות משויכות אליך כרגע"
            />
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>ספקים זמינים</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={vendorColumns}
              data={availableVendors}
              isLoading={vendorsLoading}
              onRowClick={(row) => (window.location.href = createPageUrl('VendorProfile') + '?id=' + row.id)}
              emptyMessage="אין ספקים זמינים כרגע"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}