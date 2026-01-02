import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import StatusBadge from '@/components/ui/StatusBadge';
import DataTable from '@/components/ui/DataTable';
import AvatarStack from '@/components/ui/AvatarStack';
import { motion } from 'framer-motion';
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
  Navigation,
  Activity
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
          <h1 className="text-[32px] font-bold text-[#212121] leading-tight">תפריט מוקדן</h1>
          <p className="text-[#616161] text-sm body-2 mt-1">סקירה מהירה וניהול קריאות שירות</p>
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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0 }}
        >
          <Card className="border-l-4 border-l-[#212121] hover:shadow-lg transition-all">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#616161] mb-1">קריאות פתוחות</p>
                  <p className="text-3xl font-bold text-[#212121]">{stats.openCalls}</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-[#F5F5F5] flex items-center justify-center">
                  <Activity className="w-6 h-6 text-[#212121]" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-l-4 border-l-[#212121] hover:shadow-lg transition-all">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#616161] mb-1">הושלמו היום</p>
                  <p className="text-3xl font-bold text-[#212121]">{stats.completedToday}</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-[#F5F5F5] flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-[#212121]" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-l-4 border-l-[#212121] hover:shadow-lg transition-all">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#616161] mb-1">ממתינות לשיוך</p>
                  <p className="text-3xl font-bold text-[#212121]">{stats.unassigned}</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-[#F5F5F5] flex items-center justify-center">
                  <Clock className="w-6 h-6 text-[#212121]" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-l-4 border-l-[#212121] hover:shadow-lg transition-all">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#616161] mb-1">דחופות</p>
                  <p className="text-3xl font-bold text-[#212121]">{stats.urgent}</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-[#F5F5F5] flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-[#212121]" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="border-l-4 border-l-[#212121] hover:shadow-lg transition-all">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#616161] mb-1">ספקים זמינים</p>
                  <p className="text-3xl font-bold text-[#212121]">{stats.availableVendors}</p>
                  <div className="mt-2">
                    <AvatarStack users={availableVendors} max={4} size="sm" />
                  </div>
                </div>
                <div className="w-12 h-12 rounded-lg bg-[#F5F5F5] flex items-center justify-center">
                  <Truck className="w-6 h-6 text-[#212121]" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Quick Actions - Elegant Grid */}
      <Card className="border-t-4 border-t-[#212121]">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2 text-[#212121]">
            <Navigation className="w-5 h-5" />
            קיצורי דרך
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Link to={createPageUrl('NewCase')}>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button variant="outline" className="w-full h-24 flex flex-col gap-2 border-2 hover:border-[#FF0000] hover:bg-[#FFF5F5]">
                  <Plus className="w-7 h-7 text-[#212121]" />
                  <span className="text-sm font-medium">קריאה חדשה</span>
                </Button>
              </motion.div>
            </Link>
            <Link to={createPageUrl('Cases')}>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button variant="outline" className="w-full h-24 flex flex-col gap-2 border-2 hover:border-[#ED6C02] hover:bg-[#FFF4E5]">
                  <AlertCircle className="w-7 h-7 text-[#212121]" />
                  <span className="text-sm font-medium">קריאות פתוחות</span>
                </Button>
              </motion.div>
            </Link>
            <Link to={createPageUrl('ServiceProviders')}>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button variant="outline" className="w-full h-24 flex flex-col gap-2 border-2 hover:border-[#2E7D32] hover:bg-[#E8F5E9]">
                  <Truck className="w-7 h-7 text-[#212121]" />
                  <span className="text-sm font-medium">ספקים</span>
                </Button>
              </motion.div>
            </Link>
            <Link to={createPageUrl('AllVendorsMap')}>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button variant="outline" className="w-full h-24 flex flex-col gap-2 border-2 hover:border-[#212121] hover:bg-[#FAFAFA]">
                  <MapPin className="w-7 h-7 text-[#212121]" />
                  <span className="text-sm font-medium">מפת ספקים</span>
                </Button>
              </motion.div>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Urgent Calls Alert */}
      {urgentCalls.length > 0 && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <Card className="border-l-4 border-l-[#D32F2F] bg-gradient-to-r from-[#FFEBEE] to-white">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-[#D32F2F]">
                <AlertCircle className="w-5 h-5" />
                קריאות דחופות ({urgentCalls.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {urgentCalls.map((call, index) => (
                  <motion.div
                    key={call.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between p-4 bg-white rounded-lg border border-[#E0E0E0] hover:border-[#D32F2F] hover:shadow-md transition-all"
                  >
                    <div className="flex-1">
                      <Link to={createPageUrl('CaseDetails') + '?id=' + call.id} className="font-semibold text-[#212121] hover:text-[#D32F2F]">
                        {call.call_number || `#${call.id?.slice(-6)}`}
                      </Link>
                      <p className="text-sm text-[#616161]">{call.customer_name} - {call.pickup_location_city}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={call.call_status} size="sm" />
                      <Link to={createPageUrl('CaseDetails') + '?id=' + call.id}>
                        <Button size="sm" variant="outline" className="hover:bg-[#FFF5F5]">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </Link>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Open Calls Table */}
      <Card className="border-t-4 border-t-[#212121]">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2 text-[#212121]">
            <Activity className="w-5 h-5" />
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
      <Card className="border-t-4 border-t-[#2E7D32]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2 text-[#212121]">
              <Truck className="w-5 h-5" />
              ספקים זמינים ({availableVendors.length})
            </CardTitle>
            <AvatarStack users={availableVendors} max={8} size="md" />
          </div>
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