import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import StatCard from '@/components/ui/StatCard';
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import { Button } from "@/components/ui/button";
import { 
  FileText, 
  Clock, 
  Star, 
  Timer,
  Phone,
  MapPin,
  Navigation,
  Eye,
  CheckCircle2
} from 'lucide-react';
import { format, parseISO, startOfWeek, endOfWeek } from 'date-fns';
import { he } from 'date-fns/locale';

const issueTypeLabels = {
  mechanical: 'תקלה מכנית',
  stopped_driving: 'כבה בנסיעה',
  flat_tire: 'פנצ\'ר',
  stuck_wheel: 'גלגל תקוע',
  accident: 'תאונה',
  no_fuel: 'אין דלק',
  dead_battery: 'סוללה ריקה',
  locked_keys: 'מפתחות ננעלו',
  other: 'אחר'
};

export default function VendorPortal() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ['vendors'],
    queryFn: () => base44.entities.Vendor.list(),
  });

  // Find current vendor by user email
  const currentVendor = vendors.find(v => v.email === user?.email);

  const { data: allCalls = [], isLoading } = useQuery({
    queryKey: ['vendorCalls', currentVendor?.id],
    queryFn: () => base44.entities.Call.list('-created_date', 500),
    enabled: !!currentVendor,
  });

  // Filter only this vendor's calls
  const myCalls = allCalls.filter(call => call.assigned_vendor_id === currentVendor?.id);

  // Active calls (not completed or cancelled)
  const activeCalls = myCalls.filter(c => 
    !['completed', 'cancelled'].includes(c.call_status)
  );

  // This week's calls
  const now = new Date();
  const weekStart = startOfWeek(now, { locale: he });
  const weekEnd = endOfWeek(now, { locale: he });
  const thisWeekCalls = myCalls.filter(c => {
    if (!c.created_date) return false;
    const callDate = parseISO(c.created_date);
    return callDate >= weekStart && callDate <= weekEnd;
  });

  // Average response time
  const completedCalls = myCalls.filter(c => c.time_to_vendor_assignment);
  const avgResponseTime = completedCalls.length > 0
    ? Math.round(completedCalls.reduce((sum, c) => sum + (c.time_to_vendor_assignment || 0), 0) / completedCalls.length)
    : 0;

  // Rating
  const rating = currentVendor?.average_rating || 0;

  // Open navigation to address
  const openNavigation = (address) => {
    const wazeUrl = `https://waze.com/ul?q=${encodeURIComponent(address)}`;
    window.open(wazeUrl, '_blank');
  };

  const columns = [
    {
      header: 'מספר קריאה',
      accessor: 'call_number',
      cell: (row) => (
        <Link 
          to={createPageUrl(`CallDetailsVendor?id=${row.id}`)}
          className="font-semibold text-[#0078D4] hover:underline"
        >
          {row.call_number || `#${row.id?.slice(-6)}`}
        </Link>
      )
    },
    {
      header: 'תאריך',
      accessor: 'created_date',
      cell: (row) => row.created_date ? (
        <span className="text-[#616161] text-sm whitespace-nowrap">
          {format(parseISO(row.created_date), 'dd/MM/yy HH:mm', { locale: he })}
        </span>
      ) : '-'
    },
    {
      header: 'לקוח',
      accessor: 'customer_name',
      cell: (row) => <span className="font-medium">{row.customer_name}</span>
    },
    {
      header: 'טלפון',
      accessor: 'customer_phone',
      cell: (row) => (
        <a 
          href={`tel:${row.customer_phone}`}
          className="flex items-center gap-1 text-[#0078D4] hover:underline"
        >
          <Phone className="w-3 h-3" />
          {row.customer_phone}
        </a>
      )
    },
    {
      header: 'רכב',
      accessor: 'vehicle_plate',
      cell: (row) => row.vehicle_plate || '-'
    },
    {
      header: 'כתובת איסוף',
      accessor: 'pickup_location_address',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <MapPin className="w-3 h-3 text-[#616161]" />
          <span className="max-w-[200px] truncate">{row.pickup_location_address}</span>
        </div>
      )
    },
    {
      header: 'יעד',
      accessor: 'dropoff_location_address',
      cell: (row) => row.dropoff_location_address ? (
        <span className="max-w-[150px] truncate">{row.dropoff_location_address}</span>
      ) : '-'
    },
    {
      header: 'תקלה',
      accessor: 'issue_type',
      cell: (row) => issueTypeLabels[row.issue_type] || row.issue_type || '-'
    },
    {
      header: 'סטטוס',
      accessor: 'call_status',
      cell: (row) => <StatusBadge status={row.call_status} />
    },
    {
      header: 'פעולות',
      accessor: 'actions',
      cell: (row) => (
        <div className="flex items-center gap-1">
          <Link to={createPageUrl(`CallDetailsVendor?id=${row.id}`)}>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Eye className="w-4 h-4" />
            </Button>
          </Link>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={() => openNavigation(row.pickup_location_address)}
          >
            <Navigation className="w-4 h-4" />
          </Button>
        </div>
      )
    },
  ];

  if (!currentVendor) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-xl text-[#616161] mb-2">לא נמצא ספק מקושר למשתמש זה</p>
          <p className="text-sm text-[#9E9E9E]">אנא פנה למנהל המערכת</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1>שלום, {currentVendor.vendor_name}</h1>
        <p className="text-[var(--color-text-secondary)]">ברוך הבא לפורטל הספקים</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="קריאות פעילות"
          value={activeCalls.length}
          subtitle="ממתינות לטיפול"
          icon={FileText}
          variant="primary"
        />
        <StatCard
          title="קריאות השבוע"
          value={thisWeekCalls.length}
          subtitle={`${Math.round((thisWeekCalls.length / 7))} ממוצע יומי`}
          icon={Clock}
          variant="info"
        />
        <StatCard
          title="דירוג"
          value={rating.toFixed(1)}
          subtitle="מתוך 5.0 ⭐"
          icon={Star}
          variant="success"
        />
        <StatCard
          title="זמן תגובה"
          value={`${avgResponseTime}'`}
          subtitle="זמן ממוצע להגעה"
          icon={Timer}
          variant="warning"
        />
      </div>

      {/* Active Calls Table */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[15px] font-semibold text-[#111827]">הקריאות שלי</h3>
          <Link to={createPageUrl('MyCallsVendor')}>
            <Button variant="outline" size="sm" className="h-8">
              צפה בהכל
            </Button>
          </Link>
        </div>
        <DataTable
          columns={columns}
          data={activeCalls.slice(0, 10)}
          isLoading={isLoading}
          emptyMessage="אין לך קריאות פעילות כרגע"
        />
      </div>
    </div>
  );
}