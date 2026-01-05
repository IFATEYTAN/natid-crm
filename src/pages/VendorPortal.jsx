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
  CheckCircle2,
  User
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

  // Find current vendor by user email or explicit link
  const currentVendor = vendors.find(v => v.id === user?.vendor_id || v.email === user?.email);

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

  // Auto-Assignment Requests
  const { data: assignmentRequests = [], refetch: refetchRequests } = useQuery({
    queryKey: ['assignmentRequests', currentVendor?.id],
    queryFn: () => base44.entities.CallAssignmentAttempt.filter({ 
      vendor_id: currentVendor.id,
      status: 'pending'
    }),
    enabled: !!currentVendor,
    refetchInterval: 5000
  });

  const handleAssignmentResponse = useMutation({
    mutationFn: ({ attemptId, response }) => 
      base44.functions.invoke('handleAssignmentResponse', { attemptId, response }),
    onSuccess: () => {
      refetchRequests();
      queryClient.invalidateQueries({ queryKey: ['vendorCalls'] });
    }
  });

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
        <div className="text-center max-w-md p-6 bg-gray-50 rounded-xl border border-dashed border-gray-300">
          <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="h-8 w-8 text-gray-400" />
          </div>
          <p className="text-xl font-semibold text-[#111827] mb-2">לא נמצא פרופיל ספק מקושר</p>
          <p className="text-sm text-[#616161] mb-4">
            המשתמש שלך ({user?.email}) אינו מקושר לכרטיס ספק במערכת.
          </p>
          <div className="text-sm text-right bg-blue-50 p-4 rounded-lg text-blue-800">
            <p className="font-medium mb-1">כיצד מסדרים זאת?</p>
            <ol className="list-decimal list-inside space-y-1 text-blue-700">
              <li>יש לוודא שקיים כרטיס ספק במערכת</li>
              <li>יש לוודא שכתובת האימייל בכרטיס הספק תואמת לכתובת האימייל שלך</li>
            </ol>
          </div>
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
          to={createPageUrl('MyCallsVendor') + '?status=active'}
        />
        <StatCard
          title="קריאות השבוע"
          value={thisWeekCalls.length}
          subtitle={`${Math.round((thisWeekCalls.length / 7))} ממוצע יומי`}
          icon={Clock}
          variant="info"
          to={createPageUrl('MyCallsVendor') + '?date=week'}
        />
        <StatCard
          title="דירוג"
          value={rating.toFixed(1)}
          subtitle="מתוך 5.0 ⭐"
          icon={Star}
          variant="success"
          to={createPageUrl('VendorProfile') + '?id=' + currentVendor.id}
        />
        <StatCard
          title="זמן תגובה"
          value={`${avgResponseTime}'`}
          subtitle="זמן ממוצע להגעה"
          icon={Timer}
          variant="warning"
          to={createPageUrl('VendorProfile') + '?id=' + currentVendor.id}
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
        
        {/* Assignment Requests (AI Auto-Assign) */}
        {assignmentRequests.length > 0 && (
          <div className="mb-6 space-y-4">
            <h3 className="text-[15px] font-semibold text-[#111827]">בקשות קריאה חדשות ({assignmentRequests.length})</h3>
            {assignmentRequests.map(request => {
              const call = allCalls.find(c => c.id === request.call_id);
              if (!call) return null;

              return (
                <div key={request.id} className="bg-white border-2 border-blue-500 rounded-lg p-5 shadow-sm animate-pulse-border">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded-full">
                          שיבוץ אוטומטי
                        </span>
                        <span className="text-gray-500 text-xs">
                          התוקף יפוג ב: {format(parseISO(request.expires_at), 'HH:mm')}
                        </span>
                      </div>
                      <h4 className="text-lg font-bold text-gray-900 mb-1">
                        קריאה #{call.call_number || call.id.slice(-6)} - {issueTypeLabels[call.issue_type] || call.issue_type}
                      </h4>
                      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {call.pickup_location_address}
                        </div>
                        <div className="flex items-center gap-1">
                          <Navigation className="w-4 h-4" />
                          {request.distance_km} ק"מ ממך
                        </div>
                        <div className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          {call.customer_name}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-3 w-full md:w-auto">
                      <Button 
                        className="flex-1 md:flex-none bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
                        variant="ghost"
                        onClick={() => handleAssignmentResponse.mutate({ attemptId: request.id, response: 'decline' })}
                        disabled={handleAssignmentResponse.isPending}
                      >
                        דחה
                      </Button>
                      <Button 
                        className="flex-1 md:flex-none bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => handleAssignmentResponse.mutate({ attemptId: request.id, response: 'accept' })}
                        disabled={handleAssignmentResponse.isPending}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        קבל קריאה
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

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