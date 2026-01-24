import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import {
  Truck,
  Phone,
  MapPin,
  Clock,
  CheckCircle,
  AlertCircle,
  Navigation,
  Star,
  Calendar,
  TrendingUp
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { formatDistanceToNow, format } from 'date-fns';
import { he } from 'date-fns/locale';

const issueTypeLabels = {
  mechanical: 'תקלה מכנית',
  stopped_driving: 'רכב לא נוסע',
  flat_tire: 'פנצ\'ר',
  stuck_wheel: 'גלגל תקוע',
  accident: 'תאונה',
  no_fuel: 'אין דלק',
  dead_battery: 'מצבר',
  locked_keys: 'מפתחות נעולים',
  other: 'אחר'
};

const callStatusLabels = {
  vendor_enroute: 'בדרך',
  in_progress: 'בטיפול',
  completed: 'הושלם',
  cancelled: 'בוטל'
};

export default function VendorPortalPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [vendorProfile, setVendorProfile] = useState(null);
  const [isAvailable, setIsAvailable] = useState(true);

  // Get current user
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (e) {
        console.error('Failed to fetch user:', e);
      }
    };
    fetchUser();
  }, []);

  // Get vendor profile linked to user
  const vendorQuery = useQuery({
    queryKey: ['vendorProfile', currentUser?.email],
    queryFn: async () => {
      const vendors = await base44.entities.Vendor.filter({ email: currentUser.email });
      if (vendors.length > 0) {
        setVendorProfile(vendors[0]);
        setIsAvailable(vendors[0].is_available_now);
        return vendors[0];
      }
      return null;
    },
    enabled: !!currentUser?.email,
  });

  // Get vendor's calls
  const callsQuery = useQuery({
    queryKey: ['vendorCalls', vendorProfile?.id],
    queryFn: () => base44.entities.Call.filter({ assigned_vendor_id: vendorProfile.id }, '-created_date', 100),
    enabled: !!vendorProfile?.id,
  });

  const calls = callsQuery.data || [];
  
  const activeCalls = calls.filter(c => ['vendor_enroute', 'in_progress'].includes(c.call_status));
  const completedCalls = calls.filter(c => c.call_status === 'completed');
  const thisMonthCalls = completedCalls.filter(c => {
    const created = new Date(c.created_date);
    const now = new Date();
    return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
  });

  const toggleAvailability = async () => {
    if (!vendorProfile) return;
    const newStatus = !isAvailable;
    setIsAvailable(newStatus);
    
    await base44.entities.Vendor.update(vendorProfile.id, {
      is_available_now: newStatus,
      availability_status: newStatus ? 'available' : 'offline'
    });
  };

  const updateCallStatus = async (callId, newStatus) => {
    const updateData = { call_status: newStatus };
    
    if (newStatus === 'in_progress') {
      updateData.vendor_arrival_time_actual = new Date().toISOString();
    } else if (newStatus === 'completed') {
      updateData.closed_at = new Date().toISOString();
    }
    
    await base44.entities.Call.update(callId, updateData);
    callsQuery.refetch();
  };

  if (!vendorProfile) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-16 h-16 mx-auto text-yellow-500 mb-4" />
            <h2 className="text-xl font-bold mb-2">פרופיל ספק לא נמצא</h2>
            <p className="text-[#6B778C]">
              לא נמצא פרופיל ספק המשויך לחשבון שלך.
              אנא פנה למנהל המערכת.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const columns = [
    {
      header: 'מספר קריאה',
      accessor: 'call_number',
      cell: (call) => (
        <Link 
          to={createPageUrl(`CallDetails?id=${call.id}`)}
          className="font-medium text-blue-600 hover:underline"
        >
          {call.call_number}
        </Link>
      )
    },
    {
      header: 'לקוח',
      accessor: 'customer_name',
      cell: (call) => (
        <div>
          <div className="font-medium">{call.customer_name}</div>
          <div className="text-xs text-[#6B778C]" dir="ltr">{call.customer_phone}</div>
        </div>
      )
    },
    {
      header: 'סוג תקלה',
      accessor: 'issue_type',
      cell: (call) => issueTypeLabels[call.issue_type] || call.issue_type
    },
    {
      header: 'מיקום',
      accessor: 'pickup_location_address',
      cell: (call) => (
        <div className="flex items-center gap-1 text-sm max-w-[200px]">
          <MapPin className="w-3 h-3 text-[#6B778C] shrink-0" />
          <span className="truncate">{call.pickup_location_address}</span>
        </div>
      )
    },
    {
      header: 'סטטוס',
      accessor: 'call_status',
      cell: (call) => <StatusBadge status={call.call_status} />
    },
    {
      header: 'תאריך',
      accessor: 'created_date',
      cell: (call) => format(new Date(call.created_date), 'dd/MM HH:mm')
    },
    {
      header: 'פעולות',
      cell: (call) => (
        <div className="flex gap-2">
          {call.call_status === 'vendor_enroute' && (
            <Button 
              size="sm" 
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => updateCallStatus(call.id, 'in_progress')}
            >
              הגעתי
            </Button>
          )}
          {call.call_status === 'in_progress' && (
            <Button
              size="sm"
              className="bg-[#f97316] hover:bg-[#ea580c]"
              onClick={() => updateCallStatus(call.id, 'completed')}
            >
              סיימתי
            </Button>
          )}
          <Link to={createPageUrl(`CallDetails?id=${call.id}`)}>
            <Button size="sm" variant="outline">פרטים</Button>
          </Link>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header with availability toggle */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#172B4D]">שלום, {vendorProfile.vendor_name}</h1>
          <p className="text-[#6B778C] text-sm">פורטל ספקים - ניהול הקריאות שלך</p>
        </div>
        <div className="flex items-center gap-4 bg-white rounded-lg p-4 border">
          <div className="text-right">
            <div className="text-sm font-medium">סטטוס זמינות</div>
            <div className={cn("text-xs", isAvailable ? "text-green-600" : "text-gray-500")}>
              {isAvailable ? 'זמין לקריאות' : 'לא זמין'}
            </div>
          </div>
          <Switch
            checked={isAvailable}
            onCheckedChange={toggleAvailability}
            className="data-[state=checked]:bg-green-500"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-[#172B4D]">{activeCalls.length}</div>
                <div className="text-xs text-[#6B778C]">קריאות פעילות</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-[#172B4D]">{thisMonthCalls.length}</div>
                <div className="text-xs text-[#6B778C]">הושלמו החודש</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                <Star className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-[#172B4D]">
                  {vendorProfile.average_rating?.toFixed(1) || '-'}
                </div>
                <div className="text-xs text-[#6B778C]">דירוג ממוצע</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-[#172B4D]">
                  {vendorProfile.total_calls_completed || 0}
                </div>
                <div className="text-xs text-[#6B778C]">סה"כ קריאות</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Calls Alert */}
      {activeCalls.length > 0 && (
        <Card className="bg-orange-50 border-orange-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2 text-orange-800">
              <AlertCircle className="w-5 h-5" />
              קריאות פעילות שדורשות טיפול
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeCalls.map(call => (
                <div key={call.id} className="bg-white rounded-lg p-4 border border-orange-200">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold">{call.call_number}</span>
                        <StatusBadge status={call.call_status} />
                      </div>
                      <div className="text-sm text-[#6B778C]">
                        {call.customer_name} • {issueTypeLabels[call.issue_type]}
                      </div>
                      <div className="flex items-center gap-1 text-sm mt-1">
                        <MapPin className="w-3 h-3" />
                        {call.pickup_location_address}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <a href={`tel:${call.customer_phone}`}>
                        <Button size="sm" variant="outline" className="gap-1">
                          <Phone className="w-3 h-3" />
                          התקשר
                        </Button>
                      </a>
                      <a 
                        href={`https://waze.com/ul?ll=${call.pickup_location_lat},${call.pickup_location_lon}&navigate=yes`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button size="sm" variant="outline" className="gap-1">
                          <Navigation className="w-3 h-3" />
                          נווט
                        </Button>
                      </a>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    {call.call_status === 'vendor_enroute' && (
                      <Button 
                        className="bg-blue-600 hover:bg-blue-700"
                        onClick={() => updateCallStatus(call.id, 'in_progress')}
                      >
                        הגעתי למקום
                      </Button>
                    )}
                    {call.call_status === 'in_progress' && (
                      <Link to={createPageUrl(`CallDetails?id=${call.id}`)}>
                        <Button className="bg-[#f97316] hover:bg-[#ea580c]">
                          סיים וחתם
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Calls Table */}
      <Card className="bg-white">
        <CardHeader>
          <Tabs defaultValue="all" className="w-full">
            <TabsList>
              <TabsTrigger value="all">כל הקריאות</TabsTrigger>
              <TabsTrigger value="active">פעילות ({activeCalls.length})</TabsTrigger>
              <TabsTrigger value="completed">הושלמו ({completedCalls.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="all" className="mt-4">
              <DataTable
                columns={columns}
                data={calls}
                emptyMessage="אין קריאות להצגה"
              />
            </TabsContent>
            <TabsContent value="active" className="mt-4">
              <DataTable
                columns={columns}
                data={activeCalls}
                emptyMessage="אין קריאות פעילות"
              />
            </TabsContent>
            <TabsContent value="completed" className="mt-4">
              <DataTable
                columns={columns}
                data={completedCalls}
                emptyMessage="אין קריאות שהושלמו"
              />
            </TabsContent>
          </Tabs>
        </CardHeader>
      </Card>
    </div>
  );
}