import React, { Suspense, lazy } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import {
  Plus,
  Truck,
  AlertCircle,
  Eye,
  MapPin,
  Headphones,
  List,
  CheckCircle2,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PermissionGuard } from '@/components/permissions/PermissionGuard';
import { getOperatorCallColumns, getVendorColumns } from './DashboardColumns';

const StatCard = lazy(() => import('@/components/ui/StatCard'));
const StatusBadge = lazy(() => import('@/components/ui/StatusBadge'));
const AvatarStack = lazy(() => import('@/components/ui/AvatarStack'));
const DataTableLazy = lazy(() => import('@/components/ui/DataTable'));
const VendorDelaysWidget = lazy(() => import('@/components/dashboard/VendorDelaysWidget'));

export default function DashboardOperatorTab({
  myOpenCalls,
  myCompletedToday,
  unassignedCalls,
  myUrgentCalls,
  urgentCalls,
  availableVendors,
  callsLoading,
  vendorsLoading,
  allCalls = [],
}) {
  const navigate = useNavigate();
  const operatorCallColumns = getOperatorCallColumns();
  const vendorColumns = getVendorColumns();

  return (
    <div className="space-y-6">
      {/* Operator Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Suspense fallback={<Skeleton className="h-24" />}>
          <StatCard
            title="הקריאות שלי"
            value={myOpenCalls.length}
            subtitle="בטיפול פעיל"
            icon={Headphones}
            variant="primary"
            to={createPageUrl('MyQueue')}
            className="hover:border-blue-300 cursor-pointer"
          />
        </Suspense>
        <Suspense fallback={<Skeleton className="h-24" />}>
          <StatCard
            title="הושלמו היום"
            value={myCompletedToday.length}
            subtitle="ביצוע אישי"
            icon={CheckCircle2}
            variant="success"
            to={createPageUrl('Reports')}
            className="hover:border-green-300 cursor-pointer"
          />
        </Suspense>
        <Suspense fallback={<Skeleton className="h-24" />}>
          <StatCard
            title="ממתינות לשיוך"
            value={unassignedCalls.length}
            subtitle="כללי במערכת"
            icon={Users}
            variant="warning"
            to={createPageUrl('Calls') + '?status=waiting_treatment'}
            className="hover:border-orange-300 cursor-pointer"
          />
        </Suspense>
        <Suspense fallback={<Skeleton className="h-24" />}>
          <StatCard
            title="דחופות שלי"
            value={myUrgentCalls.length}
            subtitle="נדרש טיפול"
            icon={AlertCircle}
            variant="danger"
            to={createPageUrl('Calls') + '?priority=urgent'}
            className="hover:border-red-300 cursor-pointer"
          />
        </Suspense>
        <Suspense fallback={<Skeleton className="h-24" />}>
          <StatCard
            title="ספקים זמינים"
            value={availableVendors.length}
            subtitle="בזמן אמת"
            icon={Truck}
            variant="default"
            to={createPageUrl('AllVendorsMap')}
            className="hover:border-gray-300 cursor-pointer"
          />
        </Suspense>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">פעולות מהירות</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <PermissionGuard category="calls" permission="create">
              <Link to={createPageUrl('NewCase')} className="group">
                <div className="flex flex-col items-center justify-center p-6 bg-red-50 rounded-xl border border-red-100 group-hover:border-red-300 group-hover:shadow-md transition-all cursor-pointer h-full">
                  <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm mb-3 group-hover:scale-110 transition-transform">
                    <Plus className="w-6 h-6 text-red-600" />
                  </div>
                  <span className="font-semibold text-gray-800">קריאה חדשה</span>
                </div>
              </Link>
            </PermissionGuard>
            <Link to={createPageUrl('Calls')} className="group">
              <div className="w-full flex flex-col items-center justify-center p-6 bg-gray-50 rounded-xl border border-gray-100 group-hover:border-gray-300 group-hover:shadow-md transition-all cursor-pointer h-full">
                <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm mb-3 group-hover:scale-110 transition-transform">
                  <List className="w-6 h-6 text-gray-600" />
                </div>
                <span className="font-semibold text-gray-800">רשימת קריאות</span>
              </div>
            </Link>
            <PermissionGuard category="vendors" permission="view">
              <Link to={createPageUrl('ServiceProviders')} className="group">
                <div className="flex flex-col items-center justify-center p-6 bg-blue-50 rounded-xl border border-blue-100 group-hover:border-blue-300 group-hover:shadow-md transition-all cursor-pointer h-full">
                  <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm mb-3 group-hover:scale-110 transition-transform">
                    <Truck className="w-6 h-6 text-blue-600" />
                  </div>
                  <span className="font-semibold text-gray-800">ניהול ספקים</span>
                </div>
              </Link>
            </PermissionGuard>
            <PermissionGuard category="monitoring" permission="live_map">
              <Link to={createPageUrl('AllVendorsMap')} className="group">
                <div className="flex flex-col items-center justify-center p-6 bg-green-50 rounded-xl border border-green-100 group-hover:border-green-300 group-hover:shadow-md transition-all cursor-pointer h-full">
                  <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm mb-3 group-hover:scale-110 transition-transform">
                    <MapPin className="w-6 h-6 text-green-600" />
                  </div>
                  <span className="font-semibold text-gray-800">מפת ספקים</span>
                </div>
              </Link>
            </PermissionGuard>
          </div>
        </CardContent>
      </Card>

      {/* ניהול איחורים */}
      <Suspense fallback={<Skeleton className="h-48" />}>
        <VendorDelaysWidget calls={allCalls} isLoading={callsLoading} compact />
      </Suspense>

      {/* Urgent Calls Alert */}
      {urgentCalls.length > 0 && (
        <Card className="border-e-4 border-e-red-500 bg-red-50/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-red-700">
              <AlertCircle className="w-5 h-5" />
              קריאות דחופות בטיפול ({urgentCalls.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {urgentCalls.slice(0, 5).map((call) => (
                <div
                  key={call.id}
                  className="flex items-center justify-between p-4 bg-white rounded-lg border border-red-100 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Link
                        to={createPageUrl('CallDetails') + '?id=' + call.id}
                        className="font-bold text-gray-900 hover:text-blue-600 hover:underline"
                      >
                        {call.call_number || `#${call.id?.slice(-6)}`}
                      </Link>
                      <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded-full">
                        דחוף
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 flex items-center gap-2">
                      <span className="font-medium">{call.customer_name}</span>
                      <span>•</span>
                      <span>{call.pickup_location_city}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Suspense
                      fallback={<span className="text-xs bg-gray-100 px-2 py-1 rounded">...</span>}
                    >
                      <StatusBadge status={call.call_status} size="sm" />
                    </Suspense>
                    <Link to={createPageUrl('CallDetails') + '?id=' + call.id}>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-gray-200 hover:bg-gray-50"
                      >
                        <Eye className="w-4 h-4 ms-1" />
                        צפה
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Open Calls Table */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>הקריאות שלי בטיפול</CardTitle>
            <CardDescription>קריאות המשויכות אליך וממתינות לטיפול</CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<Skeleton className="h-40" />}>
              <DataTableLazy
                columns={operatorCallColumns}
                data={myOpenCalls}
                isLoading={callsLoading}
                onRowClick={(row) => navigate(createPageUrl('CallDetails') + '?id=' + row.id)}
                emptyMessage="אין קריאות משויכות אליך כרגע"
              />
            </Suspense>
          </CardContent>
        </Card>

        {/* Available Vendors */}
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>ספקים זמינים</CardTitle>
            <Suspense fallback={null}>
              <AvatarStack users={availableVendors} max={5} size="sm" />
            </Suspense>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<Skeleton className="h-40" />}>
              <DataTableLazy
                columns={vendorColumns}
                data={availableVendors}
                isLoading={vendorsLoading}
                onRowClick={(row) => navigate(createPageUrl('VendorProfile') + '?id=' + row.id)}
                emptyMessage="אין ספקים זמינים כרגע"
              />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
