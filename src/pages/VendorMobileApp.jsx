import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { queryKeys } from '@/lib/queryKeys';
import { usePermissions } from '@/components/permissions/PermissionsContext';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import StatusBadge from '@/components/ui/StatusBadge';
import { showToast } from '@/components/ui/FeedbackToast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { issueTypeLabels } from '@/config/labels';
import {
  Home,
  Phone,
  MapPin,
  User,
  Navigation,
  RefreshCw,
  Clock,
  CheckCircle,
  AlertCircle,
  Star,
  PhoneCall,
  Truck,
  ArrowLeft,
} from 'lucide-react';
import { NotificationPermissionBanner } from '@/components/notifications/PushNotifications';
import VendorMobileMap from '@/components/vendor/VendorMobileMap';

const TAB_HOME = 'home';
const TAB_CALLS = 'calls';
const TAB_MAP = 'map';
const TAB_PROFILE = 'profile';

export default function VendorMobileApp() {
  const { currentUser, effectiveRole } = usePermissions();
  const [vendorProfile, setVendorProfile] = useState(null);
  const [isAvailable, setIsAvailable] = useState(false);
  const [activeTab, setActiveTab] = useState(TAB_HOME);
  const [callsSegment, setCallsSegment] = useState('active');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const queryClient = useQueryClient();

  const isVendorUser = effectiveRole === 'vendor';

  // Vendor profile query - same pattern as VendorPortal
  const vendorQuery = useQuery({
    queryKey: [...queryKeys.vendors.profile(currentUser?.email), effectiveRole],
    queryFn: async () => {
      let vendors;
      if (isVendorUser) {
        const result = await base44.functions.invoke('getVendorScopedData', {
          entity_type: 'profile',
          sort: '-created_date',
          limit: 1,
        });
        vendors = result.data?.data || [];
      } else {
        vendors = await base44.entities.Vendor.filter({ email: currentUser.email });
      }
      if (vendors.length > 0) {
        setVendorProfile(vendors[0]);
        setIsAvailable(vendors[0].is_available_now);
        return vendors[0];
      }
      return null;
    },
    enabled: !!currentUser?.email,
  });

  // Calls query - same pattern as VendorPortal
  const callsQuery = useQuery({
    queryKey: [...queryKeys.vendors.calls(vendorProfile?.id), effectiveRole],
    queryFn: async () => {
      if (isVendorUser) {
        const result = await base44.functions.invoke('getVendorScopedData', {
          entity_type: 'calls',
          sort: '-created_date',
          limit: 1000,
        });
        return result.data?.data || [];
      }
      return base44.entities.Call.filter(
        { assigned_vendor_id: vendorProfile.id },
        '-created_date',
        1000
      );
    },
    enabled: !!vendorProfile?.id,
    refetchInterval: 30000,
  });

  // Contract query - same pattern as VendorPortal
  const contractQuery = useQuery({
    queryKey: [...queryKeys.vendors.contracts(vendorProfile?.id), effectiveRole],
    queryFn: async () => {
      if (isVendorUser) {
        const result = await base44.functions.invoke('getVendorScopedData', {
          entity_type: 'contracts',
          sort: '-created_date',
          limit: 10,
        });
        const contracts = result.data?.data || [];
        return contracts.find((c) => c.status === 'active') || null;
      }
      const contracts = await base44.entities.VendorContract.filter(
        { vendor_id: vendorProfile.id, status: 'active' },
        '-created_date',
        1
      );
      return contracts?.[0] || null;
    },
    enabled: !!vendorProfile?.id,
  });

  const calls = callsQuery.data || [];

  const activeCalls = useMemo(
    () =>
      calls.filter((c) =>
        ['vendor_enroute', 'in_progress', 'assigned', 'assigning'].includes(c.call_status)
      ),
    [calls]
  );

  const completedCalls = useMemo(
    () => calls.filter((c) => c.call_status === 'completed'),
    [calls]
  );

  const pendingCalls = useMemo(
    () => calls.filter((c) => ['assigned', 'assigning'].includes(c.call_status)),
    [calls]
  );

  const inProgressCalls = useMemo(
    () => calls.filter((c) => ['vendor_enroute', 'in_progress'].includes(c.call_status)),
    [calls]
  );

  const todayCompleted = useMemo(() => {
    const today = new Date();
    return completedCalls.filter((c) => {
      if (!c.closed_at) return false;
      const closed = new Date(c.closed_at);
      return (
        closed.getDate() === today.getDate() &&
        closed.getMonth() === today.getMonth() &&
        closed.getFullYear() === today.getFullYear()
      );
    });
  }, [completedCalls]);

  const toggleAvailability = async () => {
    if (!vendorProfile) return;
    const newStatus = !isAvailable;
    setIsAvailable(newStatus);
    await base44.entities.Vendor.update(vendorProfile.id, {
      is_available_now: newStatus,
      availability_status: newStatus ? 'available' : 'offline',
    });
    showToast.success(newStatus ? 'הסטטוס עודכן לזמין' : 'הסטטוס עודכן ללא זמין');
  };

  const updateCallStatus = async (callId, newStatus) => {
    const updateData = { call_status: newStatus };
    if (newStatus === 'in_progress') {
      updateData.vendor_arrival_time_actual = new Date().toISOString();
    } else if (newStatus === 'completed') {
      updateData.closed_at = new Date().toISOString();
      updateData.closed_by = vendorProfile?.vendor_name;
    }
    await base44.functions.invoke('updateVendorCall', {
      call_id: callId,
      updates: updateData,
    });
    callsQuery.refetch();
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await callsQuery.refetch();
    setIsRefreshing(false);
  };

  // Loading state
  if (vendorQuery.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50" dir="rtl">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-3" />
          <p className="text-gray-500">טוען...</p>
        </div>
      </div>
    );
  }

  // No vendor profile
  if (!vendorProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4" dir="rtl">
        <Card className="max-w-sm w-full rounded-xl">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-16 h-16 mx-auto text-yellow-500 mb-4" />
            <h2 className="text-xl font-bold mb-2">פרופיל ספק לא נמצא</h2>
            <p className="text-gray-500">
              לא נמצא פרופיל ספק המשויך לחשבון שלך. אנא פנה למנהל המערכת.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (vendorQuery.isError || callsQuery.isError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4" dir="rtl">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <p className="text-red-500 text-lg font-medium mb-2">שגיאה בטעינת נתונים</p>
          <p className="text-gray-500 text-sm">
            {vendorQuery.error?.message || callsQuery.error?.message || 'נסה לרענן את הדף'}
          </p>
        </div>
      </div>
    );
  }

  const getStatusAction = (call) => {
    switch (call.call_status) {
      case 'assigned':
      case 'assigning':
        return { label: 'יצא לדרך', status: 'vendor_enroute', color: 'bg-blue-600 hover:bg-blue-700' };
      case 'vendor_enroute':
        return { label: 'הגעתי', status: 'in_progress', color: 'bg-green-600 hover:bg-green-700' };
      case 'in_progress':
        return { label: 'סיים', status: 'completed', color: 'bg-orange-500 hover:bg-orange-600' };
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20" dir="rtl">
      {/* Push Notification Banner */}
      <NotificationPermissionBanner />

      {/* Home Tab */}
      {activeTab === TAB_HOME && (
        <div className="px-4 pt-6 space-y-5">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">
              שלום, {vendorProfile.vendor_name}
            </h1>
            <p className="text-gray-500 text-sm mt-1">ניהול קריאות שירות</p>
          </div>

          {/* Availability Toggle - Large pill */}
          <button
            onClick={toggleAvailability}
            className={cn(
              'w-full rounded-2xl p-6 flex items-center justify-between transition-all duration-300 shadow-lg',
              isAvailable
                ? 'bg-green-500 shadow-green-200'
                : 'bg-red-500 shadow-red-200'
            )}
          >
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  'w-14 h-14 rounded-full flex items-center justify-center',
                  isAvailable ? 'bg-green-400' : 'bg-red-400'
                )}
              >
                <Truck className="w-7 h-7 text-white" />
              </div>
              <div className="text-start">
                <div className="text-white text-xl font-bold">
                  {isAvailable ? 'זמין' : 'לא זמין'}
                </div>
                <div className="text-white/80 text-sm">
                  {isAvailable ? 'מקבל קריאות חדשות' : 'לחץ להפעלה'}
                </div>
              </div>
            </div>
            <div
              className={cn(
                'w-16 h-9 rounded-full relative transition-all duration-300',
                isAvailable ? 'bg-green-300' : 'bg-red-300'
              )}
            >
              <div
                className={cn(
                  'w-7 h-7 bg-white rounded-full absolute top-1 transition-all duration-300 shadow-md',
                  isAvailable ? 'start-1' : 'end-1'
                )}
              />
            </div>
          </button>

          {/* Active calls badge */}
          {activeCalls.length > 0 && (
            <button
              onClick={() => setActiveTab(TAB_CALLS)}
              className="w-full bg-orange-50 border-2 border-orange-200 rounded-xl p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Phone className="w-6 h-6 text-orange-600" />
                  <span className="absolute -top-2 -end-2 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center animate-pulse">
                    {activeCalls.length}
                  </span>
                </div>
                <span className="font-bold text-orange-800">קריאות פעילות</span>
              </div>
              <ArrowLeft className="w-5 h-5 text-orange-400" />
            </button>
          )}

          {/* Today's stats */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="rounded-xl">
              <CardContent className="p-4 text-center">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div className="text-2xl font-bold text-gray-900">{todayCompleted.length}</div>
                <div className="text-xs text-gray-500">הושלמו היום</div>
              </CardContent>
            </Card>
            <Card className="rounded-xl">
              <CardContent className="p-4 text-center">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                </div>
                <div className="text-2xl font-bold text-gray-900">{inProgressCalls.length}</div>
                <div className="text-xs text-gray-500">בטיפול</div>
              </CardContent>
            </Card>
            <Card className="rounded-xl">
              <CardContent className="p-4 text-center">
                <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                </div>
                <div className="text-2xl font-bold text-gray-900">{pendingCalls.length}</div>
                <div className="text-xs text-gray-500">ממתינות</div>
              </CardContent>
            </Card>
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-2 gap-3">
            <a href="tel:*2874" className="block">
              <Button
                variant="outline"
                className="w-full h-14 rounded-xl text-base font-medium gap-2 border-2"
              >
                <PhoneCall className="w-5 h-5 text-blue-600" />
                התקשר למוקד
              </Button>
            </a>
            <Link to={createPageUrl('VendorPortal')}>
              <Button
                variant="outline"
                className="w-full h-14 rounded-xl text-base font-medium gap-2 border-2"
              >
                <AlertCircle className="w-5 h-5 text-orange-500" />
                דווח תקלה
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Calls Tab */}
      {activeTab === TAB_CALLS && (
        <div className="px-4 pt-6 space-y-4">
          {/* Header with refresh */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">קריאות</h2>
            <button
              onClick={handleRefresh}
              className="w-11 h-11 rounded-full bg-white shadow flex items-center justify-center"
              aria-label="רענן"
            >
              <RefreshCw
                className={cn('w-5 h-5 text-gray-600', isRefreshing && 'animate-spin')}
              />
            </button>
          </div>

          {/* Pull to refresh indicator */}
          {isRefreshing && (
            <div className="text-center py-2">
              <RefreshCw className="w-5 h-5 animate-spin text-blue-500 mx-auto" />
              <p className="text-xs text-gray-400 mt-1">מרענן...</p>
            </div>
          )}

          {/* Segmented control */}
          <div className="bg-gray-200 rounded-xl p-1 flex">
            <button
              onClick={() => setCallsSegment('active')}
              className={cn(
                'flex-1 py-2.5 rounded-lg text-sm font-medium transition-all',
                callsSegment === 'active'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500'
              )}
            >
              פעילות ({activeCalls.length})
            </button>
            <button
              onClick={() => setCallsSegment('history')}
              className={cn(
                'flex-1 py-2.5 rounded-lg text-sm font-medium transition-all',
                callsSegment === 'history'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500'
              )}
            >
              היסטוריה ({completedCalls.length})
            </button>
          </div>

          {/* Call cards */}
          <div className="space-y-3">
            {(callsSegment === 'active' ? activeCalls : completedCalls).length === 0 ? (
              <div className="text-center py-12">
                <Phone className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-400 font-medium">
                  {callsSegment === 'active' ? 'אין קריאות פעילות' : 'אין היסטוריה'}
                </p>
              </div>
            ) : (
              (callsSegment === 'active' ? activeCalls : completedCalls).map((call) => {
                const action = getStatusAction(call);
                return (
                  <Card key={call.id} className="rounded-xl shadow-sm overflow-hidden">
                    <CardContent className="p-4 space-y-3">
                      {/* Top row: call number + status */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900">{call.call_number}</span>
                          <StatusBadge status={call.call_status} />
                        </div>
                        <span className="text-xs text-gray-400">
                          {call.created_date
                            ? format(new Date(call.created_date), 'dd/MM HH:mm')
                            : '-'}
                        </span>
                      </div>

                      {/* Customer & issue */}
                      <div>
                        <div className="font-medium text-gray-800">{call.customer_name}</div>
                        <div className="text-sm text-gray-500">
                          {issueTypeLabels[call.issue_type] || call.issue_type}
                        </div>
                      </div>

                      {/* Address */}
                      {call.pickup_location_address && (
                        <div className="flex items-start gap-2 text-sm text-gray-600">
                          <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
                          <span className="line-clamp-2">{call.pickup_location_address}</span>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 pt-1">
                        {/* Navigate to Waze */}
                        {call.pickup_location_lat && call.pickup_location_lon && (
                          <a
                            href={`https://waze.com/ul?ll=${call.pickup_location_lat},${call.pickup_location_lon}&navigate=yes`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1"
                          >
                            <Button
                              variant="outline"
                              className="w-full h-11 rounded-xl gap-2 text-sm font-medium"
                            >
                              <Navigation className="w-4 h-4 text-blue-600" />
                              נווט
                            </Button>
                          </a>
                        )}

                        {/* Phone call */}
                        {call.customer_phone && (
                          <a href={`tel:${call.customer_phone}`} className="flex-1">
                            <Button
                              variant="outline"
                              className="w-full h-11 rounded-xl gap-2 text-sm font-medium"
                            >
                              <Phone className="w-4 h-4 text-green-600" />
                              חייג
                            </Button>
                          </a>
                        )}

                        {/* Status action */}
                        {action && (
                          <Button
                            className={cn('flex-1 h-11 rounded-xl text-sm font-bold text-white', action.color)}
                            onClick={() => updateCallStatus(call.id, action.status)}
                          >
                            {action.label}
                          </Button>
                        )}

                        {/* Manage link for in_progress */}
                        {call.call_status === 'in_progress' && (
                          <Link
                            to={createPageUrl(`VendorCallManagement?id=${call.id}`)}
                            className="flex-1"
                          >
                            <Button className="w-full h-11 rounded-xl text-sm font-bold bg-orange-500 hover:bg-orange-600 text-white">
                              סיים וחתם
                            </Button>
                          </Link>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Map Tab */}
      {activeTab === TAB_MAP && (
        <div className="px-4 pt-6">
          <VendorMobileMap vendorProfile={vendorProfile} activeCalls={activeCalls} />
        </div>
      )}

      {/* Profile Tab */}
      {activeTab === TAB_PROFILE && (
        <div className="px-4 pt-6 space-y-5">
          {/* Profile header */}
          <div className="text-center">
            <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <User className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">{vendorProfile.vendor_name}</h2>
            {vendorProfile.phone && (
              <p className="text-gray-500 mt-1" dir="ltr">
                {vendorProfile.phone}
              </p>
            )}
          </div>

          {/* Rating */}
          <Card className="rounded-xl">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 font-medium">דירוג</span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={cn(
                        'w-5 h-5',
                        star <= Math.round(vendorProfile.average_rating || 0)
                          ? 'text-yellow-400 fill-yellow-400'
                          : 'text-gray-300'
                      )}
                    />
                  ))}
                  <span className="text-sm text-gray-500 ms-2">
                    {vendorProfile.average_rating?.toFixed(1) || '-'}
                  </span>
                  {vendorProfile.total_ratings > 0 && (
                    <span className="text-xs text-gray-400">
                      ({vendorProfile.total_ratings})
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contract info */}
          {contractQuery.data && (
            <Card className="rounded-xl">
              <CardContent className="p-4 space-y-2">
                <div className="font-medium text-gray-900">חוזה פעיל</div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">סוג</span>
                  <span className="text-gray-900">{contractQuery.data.contract_type || '-'}</span>
                </div>
                {contractQuery.data.end_date && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">תוקף עד</span>
                    <span className="text-gray-900">
                      {format(new Date(contractQuery.data.end_date), 'dd/MM/yyyy')}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Stats summary */}
          <Card className="rounded-xl">
            <CardContent className="p-4 space-y-3">
              <div className="font-medium text-gray-900">סטטיסטיקות</div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">סה&quot;כ קריאות</span>
                <span className="font-bold text-gray-900">{calls.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">הושלמו</span>
                <span className="font-bold text-green-600">{completedCalls.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">פעילות</span>
                <span className="font-bold text-blue-600">{activeCalls.length}</span>
              </div>
            </CardContent>
          </Card>

          {/* Link to full profile */}
          <Link to={createPageUrl('MyVendorProfile')}>
            <Button
              variant="outline"
              className="w-full h-12 rounded-xl text-base font-medium gap-2 border-2"
            >
              <User className="w-5 h-5" />
              הפרופיל המלא
            </Button>
          </Link>
        </div>
      )}

      {/* Bottom Tab Navigation */}
      <nav className="fixed bottom-0 inset-x-0 h-16 bg-white border-t border-gray-200 z-50 flex items-center justify-around px-2 safe-area-pb">
        <button
          onClick={() => setActiveTab(TAB_HOME)}
          className={cn(
            'flex flex-col items-center justify-center gap-0.5 min-w-[64px] min-h-[44px] rounded-lg transition-colors',
            activeTab === TAB_HOME ? 'text-blue-600' : 'text-gray-400'
          )}
        >
          <Home className="w-6 h-6" />
          <span className="text-xs font-medium">בית</span>
        </button>

        <button
          onClick={() => setActiveTab(TAB_CALLS)}
          className={cn(
            'flex flex-col items-center justify-center gap-0.5 min-w-[64px] min-h-[44px] rounded-lg transition-colors relative',
            activeTab === TAB_CALLS ? 'text-blue-600' : 'text-gray-400'
          )}
        >
          <div className="relative">
            <Phone className="w-6 h-6" />
            {activeCalls.length > 0 && (
              <span className="absolute -top-1.5 -end-2 bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center">
                {activeCalls.length}
              </span>
            )}
          </div>
          <span className="text-xs font-medium">קריאות</span>
        </button>

        <button
          onClick={() => setActiveTab(TAB_MAP)}
          className={cn(
            'flex flex-col items-center justify-center gap-0.5 min-w-[64px] min-h-[44px] rounded-lg transition-colors',
            activeTab === TAB_MAP ? 'text-blue-600' : 'text-gray-400'
          )}
        >
          <MapPin className="w-6 h-6" />
          <span className="text-xs font-medium">מפה</span>
        </button>

        <button
          onClick={() => setActiveTab(TAB_PROFILE)}
          className={cn(
            'flex flex-col items-center justify-center gap-0.5 min-w-[64px] min-h-[44px] rounded-lg transition-colors',
            activeTab === TAB_PROFILE ? 'text-blue-600' : 'text-gray-400'
          )}
        >
          <User className="w-6 h-6" />
          <span className="text-xs font-medium">פרופיל</span>
        </button>
      </nav>
    </div>
  );
}