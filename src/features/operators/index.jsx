import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/lib/api';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";

import StatCard from '@/components/ui/StatCard';
import StatusBadge from '@/components/ui/StatusBadge';
import DataTable from '@/components/ui/DataTable';
import AvatarStack from '@/components/ui/AvatarStack';

import {
  Plus,
  Phone,
  Truck,
  AlertCircle,
  Eye,
  Navigation,
  Activity,
  MapPin
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
        <Link to={createPageUrl('CaseDetails') + '?id=' + row.id} className="font-semibold text-[#212121] hover:text-[#FF0000]">
          {row.call_number || `#${row.id?.slice(-6)}`}
        </Link>
      )
    },
    {
      header: 'לקוח',
      accessor: 'customer_name',
      cell: (row) => (
        <div>
          <div className="font-medium text-[#212121]">{row.customer_name}</div>
          <a href={`tel:${row.customer_phone}`} className="text-xs text-[#616161] flex items-center gap-1">
            <Phone className="w-3 h-3" />
            {row.customer_phone}
          </a>
        </div>
      )
    },
    {
      header: 'סוג תקלה',
      accessor: 'issue_type',
      cell: (row) => (
        <span className="text-[#616161]">{issueTypeLabels[row.issue_type] || row.issue_type}</span>
      )
    },
    {
      header: 'מיקום',
      accessor: 'pickup_location_city',
      cell: (row) => (
        <span className="text-[#616161]">{row.pickup_location_city || row.pickup_location_address?.substring(0, 30)}</span>
      )
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
        <span className="text-sm text-[#2E7D32] font-medium">{row.assigned_vendor_name}</span>
      ) : (
        <span className="text-xs text-[#D32F2F] font-medium">לא שובץ</span>
      )
    },
    {
      header: 'פעולות',
      cell: (row) => (
        <Link to={createPageUrl('CaseDetails') + '?id=' + row.id}>
          <Button variant="ghost" size="sm" className="hover:bg-[#FFF5F5]">
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
        <Link to={createPageUrl('VendorProfile') + '?id=' + row.id} className="font-medium text-[#212121] hover:text-[#FF0000] flex items-center gap-2">
          <Truck className="w-4 h-4" />
          {row.vendor_name}
        </Link>
      )
    },
    {
      header: 'טלפון',
      accessor: 'phone',
      cell: (row) => (
        <a href={`tel:${row.phone}`} className="text-[#616161] flex items-center gap-1">
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
            <span key={idx} className="text-xs bg-[#FAFAFA] text-[#616161] px-2 py-1 rounded border border-[#E0E0E0]">
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
          <div className="font-medium text-[#212121]">{row.total_calls_completed || 0}</div>
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
          <h1>תפריט מוקדן</h1>
          <p className="text-[var(--color-text-secondary)]">סקירה מהירה וניהול קריאות שירות</p>
        </div>
        <div className="flex gap-2">
          <Link to={createPageUrl('NewCase')}>
            <Button className="bg-[#FF0000] hover:bg-[#CC0000] gap-2 font-bold">
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

      {/* Stats Cards - Elegant Minimal Design */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="קריאות פתוחות"
          value={stats.openCalls}
        />
        <StatCard
          title="הושלמו היום"
          value={stats.completedToday}
        />
        <StatCard
          title="ממתינות לשיוך"
          value={stats.unassigned}
        />
        <StatCard
          title="דחופות"
          value={stats.urgent}
        />
        <StatCard
          title="ספקים זמינים"
          value={stats.availableVendors}
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg p-5">
        <h3 className="text-[15px] font-semibold text-[#111827] mb-4">קיצורי דרך</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link to={createPageUrl('NewCase')}>
            <Button variant="outline" className="w-full h-20 flex flex-col gap-2 border border-[#E5E7EB] hover:border-[#D1D5DB] hover:bg-[#F9FAFB]">
              <Plus className="w-6 h-6 text-[#374151]" />
              <span className="text-[13px] font-medium text-[#374151]">קריאה חדשה</span>
            </Button>
          </Link>
          <Link to={createPageUrl('Cases')}>
            <Button variant="outline" className="w-full h-20 flex flex-col gap-2 border border-[#E5E7EB] hover:border-[#D1D5DB] hover:bg-[#F9FAFB]">
              <AlertCircle className="w-6 h-6 text-[#374151]" />
              <span className="text-[13px] font-medium text-[#374151]">קריאות פתוחות</span>
            </Button>
          </Link>
          <Link to={createPageUrl('ServiceProviders')}>
            <Button variant="outline" className="w-full h-20 flex flex-col gap-2 border border-[#E5E7EB] hover:border-[#D1D5DB] hover:bg-[#F9FAFB]">
              <Truck className="w-6 h-6 text-[#374151]" />
              <span className="text-[13px] font-medium text-[#374151]">ספקים</span>
            </Button>
          </Link>
          <Link to={createPageUrl('AllVendorsMap')}>
            <Button variant="outline" className="w-full h-20 flex flex-col gap-2 border border-[#E5E7EB] hover:border-[#D1D5DB] hover:bg-[#F9FAFB]">
              <MapPin className="w-6 h-6 text-[#374151]" />
              <span className="text-[13px] font-medium text-[#374151]">מפת ספקים</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Urgent Calls Alert */}
      {urgentCalls.length > 0 && (
        <div className="bg-white border border-[#E5E7EB] rounded-lg p-5 border-r-4 border-r-[#DC2626]">
          <h3 className="text-[15px] font-semibold text-[#111827] mb-4">קריאות דחופות ({urgentCalls.length})</h3>
          <div className="space-y-3">
            {urgentCalls.map((call) => (
              <div
                key={call.id}
                className="flex items-center justify-between p-3 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB] hover:border-[#D1D5DB] transition-all"
              >
                <div className="flex-1">
                  <Link to={createPageUrl('CaseDetails') + '?id=' + call.id} className="font-medium text-[#111827] hover:text-[#DC2626]">
                    {call.call_number || `#${call.id?.slice(-6)}`}
                  </Link>
                  <p className="text-[13px] text-[#6B7280]">{call.customer_name} - {call.pickup_location_city}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={call.call_status} size="sm" />
                  <Link to={createPageUrl('CaseDetails') + '?id=' + call.id}>
                    <Button size="sm" variant="ghost">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Open Calls Table */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg p-5">
        <h3 className="text-[15px] font-semibold text-[#111827] mb-4">קריאות פתוחות ({openCalls.length})</h3>
        <DataTable
          columns={callColumns}
          data={openCalls}
          isLoading={callsLoading}
          onRowClick={(row) => window.location.href = createPageUrl('CaseDetails') + '?id=' + row.id}
          emptyMessage="אין קריאות פתוחות"
        />
      </div>

      {/* Available Vendors */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[15px] font-semibold text-[#111827]">ספקים זמינים ({availableVendors.length})</h3>
          <AvatarStack users={availableVendors} max={8} size="md" />
        </div>
        <DataTable
          columns={vendorColumns}
          data={availableVendors}
          isLoading={vendorsLoading}
          onRowClick={(row) => window.location.href = createPageUrl('VendorProfile') + '?id=' + row.id}
          emptyMessage="אין ספקים זמינים כרגע"
        />
      </div>
    </div>
  );
}