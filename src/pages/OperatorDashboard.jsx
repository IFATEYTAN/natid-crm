import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import StatusBadge from '@/components/ui/StatusBadge';
import StatCard from '@/components/ui/StatCard';
import DataTable from '@/components/ui/DataTable';
import {
  Plus,
  Phone,
  Truck,
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  Users,
  MapPin,
  Eye,
  Navigation
} from 'lucide-react';
import { format, parseISO, startOfDay, endOfDay } from 'date-fns';
import { he } from 'date-fns/locale';

const issueTypeLabels = {
  mechanical: 'תקלה מכנית',
  stopped_driving: 'נעצר בנסיעה',
  flat_tire: 'פנצ\'ר',
  stuck_wheel: 'גלגל תקוע',
  accident: 'תאונה',
  no_fuel: 'אזל דלק',
  dead_battery: 'מצבר מת',
  locked_keys: 'מפתחות נעולים',
  other: 'אחר'
};

export default function OperatorDashboard() {
  const today = new Date();

  // Fetch open calls
  const { data: openCalls = [], isLoading: callsLoading } = useQuery({
    queryKey: ['openCalls'],
    queryFn: () => base44.entities.Call.filter({
      call_status: { $in: ['waiting_treatment', 'awaiting_assignment', 'assigning', 'vendor_enroute', 'in_progress'] }
    }),
    refetchInterval: 30000,
  });

  // Fetch today's completed calls
  const { data: completedToday = [] } = useQuery({
    queryKey: ['completedToday'],
    queryFn: async () => {
      const calls = await base44.entities.Call.filter({
        call_status: 'completed'
      }, '-created_date', 100);
      return calls.filter(call => {
        const callDate = new Date(call.created_date);
        return callDate >= startOfDay(today) && callDate <= endOfDay(today);
      });
    },
  });

  // Fetch available vendors
  const { data: availableVendors = [], isLoading: vendorsLoading } = useQuery({
    queryKey: ['availableVendors'],
    queryFn: () => base44.entities.Vendor.filter({
      is_active: true,
      availability_status: 'available'
    }),
    refetchInterval: 30000,
  });

  // Calculate stats
  const stats = {
    openCalls: openCalls.length,
    completedToday: completedToday.length,
    unassigned: openCalls.filter(c => !c.assigned_vendor_id).length,
    urgent: openCalls.filter(c => c.call_priority === 'urgent' || c.call_priority === 'critical').length,
    availableVendors: availableVendors.length,
  };

  // Urgent calls for quick view
  const urgentCalls = openCalls
    .filter(c => c.call_priority === 'urgent' || c.call_priority === 'critical')
    .slice(0, 5);

  // Open calls table columns
  const callColumns = [
    {
      header: 'קריאה',
      accessor: 'call_number',
      cell: (row) => (
        <Link to={createPageUrl('CaseDetails') + '?id=' + row.id} className="font-medium text-[#0078D4] hover:underline">
          {row.call_number || `#${row.id?.slice(-6)}`}
        </Link>
      )
    },
    {
      header: 'לקוח',
      accessor: 'customer_name',
      cell: (row) => (
        <div>
          <div className="font-medium">{row.customer_name}</div>
          <a href={`tel:${row.customer_phone}`} className="text-xs text-[#0078D4] flex items-center gap-1">
            <Phone className="w-3 h-3" />
            {row.customer_phone}
          </a>
        </div>
      )
    },
    {
      header: 'סוג תקלה',
      accessor: 'issue_type',
      cell: (row) => issueTypeLabels[row.issue_type] || row.issue_type
    },
    {
      header: 'מיקום',
      accessor: 'pickup_location_city',
      cell: (row) => row.pickup_location_city || row.pickup_location_address?.substring(0, 30)
    },
    {
      header: 'סטטוס',
      accessor: 'call_status',
      cell: (row) => <StatusBadge status={row.call_status} size="sm" />
    },
    {
      header: 'ספק',
      accessor: 'assigned_vendor_name',
      cell: (row) => row.assigned_vendor_name ? (
        <span className="text-sm text-[#2E7D32]">{row.assigned_vendor_name}</span>
      ) : (
        <span className="text-xs text-[#D32F2F]">לא שובץ</span>
      )
    },
    {
      header: 'פעולות',
      cell: (row) => (
        <Link to={createPageUrl('CaseDetails') + '?id=' + row.id}>
          <Button variant="ghost" size="sm">
            <Eye className="w-4 h-4" />
          </Button>
        </Link>
      )
    },
  ];

  // Available vendors table columns
  const vendorColumns = [
    {
      header: 'ספק',
      accessor: 'vendor_name',
      cell: (row) => (
        <Link to={createPageUrl('VendorProfile') + '?id=' + row.id} className="font-medium text-[#0078D4] hover:underline flex items-center gap-2">
          <Truck className="w-4 h-4" />
          {row.vendor_name}
        </Link>
      )
    },
    {
      header: 'טלפון',
      accessor: 'phone',
      cell: (row) => (
        <a href={`tel:${row.phone}`} className="text-[#0078D4] flex items-center gap-1">
          <Phone className="w-3 h-3" />
          {row.phone}
        </a>
      )
    },
    {
      header: 'אזורים',
      accessor: 'coverage_areas',
      cell: (row) => (
        <div className="flex flex-wrap gap-1">
          {(row.coverage_areas || []).slice(0, 2).map((area, idx) => (
            <span key={idx} className="text-xs bg-[#E3F2FD] text-[#0078D4] px-2 py-1 rounded">
              {area}
            </span>
          ))}
        </div>
      )
    },
    {
      header: 'קריאות',
      accessor: 'total_calls_completed',
      cell: (row) => (
        <div className="text-center">
          <div className="font-medium">{row.total_calls_completed || 0}</div>
          <div className="text-xs text-[#616161]">
            {row.average_rating ? `⭐ ${row.average_rating.toFixed(1)}` : '-'}
          </div>
        </div>
      )
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0078D4] mb-1">תפריט מוקדן</h1>
          <p className="text-[#616161]">סקירה מהירה וניהול קריאות שירות</p>
        </div>
        <div className="flex gap-2">
          <Link to={createPageUrl('NewCase')}>
            <Button className="bg-[#0078D4] hover:bg-[#1976D2] gap-2">
              <Plus className="w-5 h-5" />
              קריאה חדשה
            </Button>
          </Link>
          <Link to={createPageUrl('Cases')}>
            <Button variant="outline" className="gap-2">
              <Eye className="w-4 h-4" />
              כל הקריאות
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="קריאות פתוחות"
          value={stats.openCalls}
          icon={AlertCircle}
          variant="primary"
        />
        <StatCard
          title="הושלמו היום"
          value={stats.completedToday}
          icon={CheckCircle}
          variant="success"
        />
        <StatCard
          title="ממתינות לשיוך"
          value={stats.unassigned}
          icon={Clock}
          variant="warning"
        />
        <StatCard
          title="דחופות"
          value={stats.urgent}
          icon={TrendingUp}
          variant="error"
        />
        <StatCard
          title="ספקים זמינים"
          value={stats.availableVendors}
          icon={Truck}
          variant="success"
        />
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Navigation className="w-5 h-5 text-[#0078D4]" />
            קיצורי דרך
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Link to={createPageUrl('NewCase')}>
              <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                <Plus className="w-6 h-6 text-[#0078D4]" />
                <span className="text-sm">קריאה חדשה</span>
              </Button>
            </Link>
            <Link to={createPageUrl('Cases')}>
              <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                <AlertCircle className="w-6 h-6 text-[#ED6C02]" />
                <span className="text-sm">קריאות פתוחות</span>
              </Button>
            </Link>
            <Link to={createPageUrl('ServiceProviders')}>
              <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                <Truck className="w-6 h-6 text-[#2E7D32]" />
                <span className="text-sm">ספקים</span>
              </Button>
            </Link>
            <Link to={createPageUrl('AllVendorsMap')}>
              <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                <MapPin className="w-6 h-6 text-[#0078D4]" />
                <span className="text-sm">מפת ספקים</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Urgent Calls Alert */}
      {urgentCalls.length > 0 && (
        <Card className="border-[#D32F2F] border-2">
          <CardHeader className="bg-[#FFEBEE]">
            <CardTitle className="text-base flex items-center gap-2 text-[#D32F2F]">
              <AlertCircle className="w-5 h-5" />
              קריאות דחופות ({urgentCalls.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-3">
              {urgentCalls.map(call => (
                <div key={call.id} className="flex items-center justify-between p-3 bg-[#FAFAFA] rounded-lg">
                  <div className="flex-1">
                    <Link to={createPageUrl('CaseDetails') + '?id=' + call.id} className="font-medium text-[#0078D4] hover:underline">
                      {call.call_number || `#${call.id?.slice(-6)}`}
                    </Link>
                    <p className="text-sm text-[#616161]">{call.customer_name} - {call.pickup_location_city}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={call.call_status} size="sm" />
                    <Link to={createPageUrl('CaseDetails') + '?id=' + call.id}>
                      <Button size="sm" variant="outline">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Open Calls Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-[#0078D4]" />
            קריאות פתוחות ({openCalls.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={callColumns}
            data={openCalls}
            isLoading={callsLoading}
            onRowClick={(row) => window.location.href = createPageUrl('CaseDetails') + '?id=' + row.id}
            emptyMessage="אין קריאות פתוחות"
          />
        </CardContent>
      </Card>

      {/* Available Vendors */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Truck className="w-5 h-5 text-[#2E7D32]" />
            ספקים זמינים ({availableVendors.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={vendorColumns}
            data={availableVendors}
            isLoading={vendorsLoading}
            onRowClick={(row) => window.location.href = createPageUrl('VendorProfile') + '?id=' + row.id}
            emptyMessage="אין ספקים זמינים כרגע"
          />
        </CardContent>
      </Card>
    </div>
  );
}