import { lazyRetry } from '@/lib/lazyRetry';
import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import VendorOnboardingWizard from '@/components/vendor/VendorOnboardingWizard';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { queryKeys } from '@/lib/queryKeys';
import { usePermissions } from '@/components/permissions/PermissionsContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import StatusBadge from '@/components/ui/StatusBadge';
import { Skeleton } from '@/components/ui/skeleton';

const DataTableLazy = lazyRetry(() => import('@/components/ui/DataTable'));
const VendorNewCallAlertLazy = lazyRetry(() => import('@/components/vendor/VendorNewCallAlert'));
const VendorStatsLazy = lazyRetry(() => import('@/components/vendor/VendorStats'));
const VendorAvailabilityToggleLazy = lazyRetry(
  () => import('@/components/vendor/VendorAvailabilityToggle')
);
const VendorPortalAdminTabLazy = lazyRetry(
  () => import('@/components/vendor/VendorPortalAdminTab')
);

import {
  Phone,
  MapPin,
  Navigation,
  AlertCircle,
  Settings,
  RefreshCw,
  BookOpen,
  Users,
  FileText,
  Coffee,
  FileDown,
} from 'lucide-react';
import { NotificationPermissionBanner } from '@/components/notifications/PushNotifications';
import VendorContractsView from '@/components/vendor/VendorContractsView';
import VendorBreakHistory from '@/components/vendor/VendorBreakHistory';
import VendorPDFDownload from '@/components/vendor/VendorPDFDownload';
import VendorGPSTracker from '@/components/vendor/VendorGPSTracker';
import VendorActiveCallsGoogleMap from '@/components/vendor/VendorActiveCallsGoogleMap';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { showToast } from '@/components/ui/FeedbackToast';
import { issueTypeLabels } from '@/config/labels';

// Mobile components
import VendorMobileHome from '@/components/vendor/mobile/VendorMobileHome';
import VendorMobileCalls from '@/components/vendor/mobile/VendorMobileCalls';
import VendorMobileProfile from '@/components/vendor/mobile/VendorMobileProfile';
import VendorMobileNav from '@/components/vendor/mobile/VendorMobileNav';

export default function VendorPortalPage() {
  const { currentUser, effectiveRole } = usePermissions();
  const isMobile = useIsMobile();
  const [vendorProfile, setVendorProfile] = useState(null);
  const [isAvailable, setIsAvailable] = useState(false);
  const [pendingCall, setPendingCall] = useState(null);
  const [showNewCallAlert, setShowNewCallAlert] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [mobileTab, setMobileTab] = useState('home');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const queryClient = useQueryClient();

  const isAdmin = effectiveRole === 'admin';
  const isOperator = effectiveRole === 'operator';
  // Operator gets read-only visibility into the admin/tracking tab so they
  // can monitor calls after they're handed off to a vendor (continuity of
  // service - the customer/insured stays under operator's responsibility).
  const canSeeAdminTab = isAdmin || isOperator;
  const effectiveRoleNormalized = (effectiveRole || '').toLowerCase().trim();
  const currentUserRoleNormalized = (currentUser?.role || '').toLowerCase().trim();
  const isVendorUser =
    effectiveRoleNormalized === 'vendor' ||
    effectiveRoleNormalized === 'ספק' ||
    currentUserRoleNormalized === 'vendor' ||
    currentUserRoleNormalized === 'ספק';
  const [activeTab, setActiveTab] = useState(() => (canSeeAdminTab ? 'admin' : 'vendor'));
  const [callsTab, setCallsTab] = useState('all');

  // Check if vendor needs onboarding wizard
  useEffect(() => {
    if (isVendorUser && currentUser && !currentUser.vendor_onboarding_completed) {
      setShowOnboarding(true);
    }
  }, [isVendorUser, currentUser]);

  useEffect(() => {
    if (canSeeAdminTab && activeTab === 'vendor' && !vendorProfile) setActiveTab('admin');
  }, [canSeeAdminTab, activeTab, vendorProfile]);

  // Vendor profile
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

  // All vendors list for admin and operator (operator gets read-only tracking)
  const allVendorsQuery = useQuery({
    queryKey: queryKeys.vendors.all(),
    queryFn: () => base44.entities.Vendor.list('-vendor_name', 500),
    enabled: canSeeAdminTab,
  });

  // Calls
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

  // Contract
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

  // Pending assignments
  const pendingAssignmentsQuery = useQuery({
    queryKey: [...queryKeys.assignmentRequests.byVendor(vendorProfile?.id), effectiveRole],
    queryFn: async () => {
      if (isVendorUser) {
        const result = await base44.functions.invoke('getVendorScopedData', {
          entity_type: 'attempts',
          sort: '-created_date',
          limit: 10,
        });
        const allAttempts = result.data?.data || [];
        return allAttempts.filter((a) => a.status === 'pending');
      }
      return base44.entities.CallAssignmentAttempt.filter(
        { vendor_id: vendorProfile.id, status: 'pending' },
        '-created_date',
        1
      );
    },
    enabled: !!vendorProfile?.id && isAvailable,
    refetchInterval: 10000,
  });

  useEffect(() => {
    const pendingAttempts = pendingAssignmentsQuery.data || [];
    if (pendingAttempts.length > 0 && !showNewCallAlert) {
      const fetchCall = async () => {
        let callData = null;
        if (isVendorUser) {
          const result = await base44.functions.invoke('getVendorScopedData', {
            entity_type: 'calls',
            sort: '-created_date',
            limit: 1000,
          });
          const scopedCalls = result.data?.data || [];
          callData = scopedCalls.find((c) => c.id === pendingAttempts[0].call_id);
        } else {
          const calls = await base44.entities.Call.filter({ id: pendingAttempts[0].call_id });
          callData = calls[0] || null;
        }
        if (callData) {
          setPendingCall({ ...callData, attemptId: pendingAttempts[0].id });
          setShowNewCallAlert(true);
        }
      };
      fetchCall();
    }
  }, [pendingAssignmentsQuery.data, showNewCallAlert, isVendorUser]);

  const acceptCallMutation = useMutation({
    mutationFn: async (call) => {
      await base44.functions.invoke('handleAssignmentResponse', {
        attempt_id: call.attemptId,
        action: 'accept',
      });
    },
    onSuccess: () => {
      showToast.success('הקריאה התקבלה בהצלחה!');
      setShowNewCallAlert(false);
      setPendingCall(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.vendors.calls(vendorProfile?.id) });
      queryClient.invalidateQueries({
        queryKey: queryKeys.assignmentRequests.byVendor(vendorProfile?.id),
      });
    },
    onError: (error) => {
      showToast.error(error?.response?.data?.error || 'שגיאה בקבלת הקריאה');
    },
  });

  const declineCallMutation = useMutation({
    mutationFn: async ({ attemptId, reason }) => {
      await base44.functions.invoke('handleAssignmentResponse', {
        attempt_id: attemptId,
        action: 'decline',
        decline_reason: reason,
      });
    },
    onSuccess: () => {
      setShowNewCallAlert(false);
      setPendingCall(null);
      queryClient.invalidateQueries({
        queryKey: queryKeys.assignmentRequests.byVendor(vendorProfile?.id),
      });
    },
    onError: (error) => {
      showToast.error(error?.response?.data?.error || 'שגיאה בדחיית הקריאה');
    },
  });

  const calls = callsQuery.data || [];
  const activeCalls = useMemo(
    () =>
      calls.filter((c) =>
        ['vendor_enroute', 'in_progress', 'assigned', 'assigning'].includes(c.call_status)
      ),
    [calls]
  );
  const completedCalls = useMemo(() => calls.filter((c) => c.call_status === 'completed'), [calls]);

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

  const handleAcceptCall = () => {
    if (pendingCall) acceptCallMutation.mutate(pendingCall);
  };
  const handleDeclineCall = (reason) => {
    if (pendingCall) declineCallMutation.mutate({ attemptId: pendingCall.attemptId, reason });
  };

  const updateCallStatus = async (callId, newStatus) => {
    const updateData = { call_status: newStatus };
    if (newStatus === 'in_progress')
      updateData.vendor_arrival_time_actual = new Date().toISOString();
    else if (newStatus === 'completed') {
      updateData.closed_at = new Date().toISOString();
      updateData.closed_by = vendorProfile?.vendor_name;
    }
    await base44.functions.invoke('updateVendorCall', { call_id: callId, updates: updateData });
    callsQuery.refetch();
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await callsQuery.refetch();
    setIsRefreshing(false);
  };

  // Show onboarding wizard for first-time vendor users
  if (showOnboarding && isVendorUser && vendorProfile) {
    return (
      <VendorOnboardingWizard
        vendorProfile={vendorProfile}
        onComplete={async () => {
          await base44.auth.updateMe({ vendor_onboarding_completed: true });
          setShowOnboarding(false);
        }}
        onSkip={async () => {
          await base44.auth.updateMe({ vendor_onboarding_completed: true });
          setShowOnboarding(false);
        }}
      />
    );
  }

  // Loading
  if (vendorQuery.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto" />
          <p className="text-[#6B778C]">טוען פורטל ספקים...</p>
        </div>
      </div>
    );
  }

  if (!vendorProfile && !isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[400px] px-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-16 h-16 mx-auto text-yellow-500 mb-4" />
            <h2 className="text-xl font-bold mb-2">פרופיל ספק לא נמצא</h2>
            <p className="text-[#6B778C]">
              לא נמצא פרופיל ספק המשויך לחשבון שלך. אנא פנה למנהל המערכת.
            </p>
            <div className="mt-4 space-y-2">
              <p className="text-sm text-[#6B778C]">
                ייתכן שהמנהל טרם יצר עבורך פרופיל ספק, או שהאימייל שלך אינו תואם לפרופיל קיים.
              </p>
              <Link to={createPageUrl('VendorGuide')}>
                <Button variant="outline" size="sm" className="mt-2 gap-1">
                  מדריך למשתמש
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (vendorQuery.isError || callsQuery.isError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center px-4">
        <p className="text-red-500 text-lg font-medium mb-2">שגיאה בטעינת נתונים</p>
        <p className="text-gray-500 text-sm">
          {vendorQuery.error?.message || callsQuery.error?.message || 'נסה לרענן את הדף'}
        </p>
      </div>
    );
  }

  // ========================
  // MOBILE VIEW
  // ========================
  if (isMobile && vendorProfile && !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20" dir="rtl">
        <NotificationPermissionBanner />

        <Suspense fallback={null}>
          <VendorNewCallAlertLazy
            call={pendingCall}
            isOpen={showNewCallAlert}
            onAccept={handleAcceptCall}
            onDecline={handleDeclineCall}
            timeoutSeconds={120}
            vendorContract={contractQuery.data}
            vendorProfile={vendorProfile}
          />
        </Suspense>

        {mobileTab === 'home' && (
          <VendorMobileHome
            vendorProfile={vendorProfile}
            isAvailable={isAvailable}
            onToggleAvailability={toggleAvailability}
            calls={calls}
            activeCalls={activeCalls}
            onGoToCalls={() => setMobileTab('calls')}
          />
        )}

        {mobileTab === 'calls' && (
          <VendorMobileCalls
            calls={calls}
            activeCalls={activeCalls}
            completedCalls={completedCalls}
            onUpdateCallStatus={updateCallStatus}
            isRefreshing={isRefreshing}
            onRefresh={handleRefresh}
          />
        )}

        {mobileTab === 'map' && (
          <div className="px-4 pt-6 pb-4">
            <VendorActiveCallsGoogleMap vendorProfile={vendorProfile} activeCalls={activeCalls} />
          </div>
        )}

        {mobileTab === 'profile' && (
          <VendorMobileProfile
            vendorProfile={vendorProfile}
            calls={calls}
            activeCalls={activeCalls}
            completedCalls={completedCalls}
            contract={contractQuery.data}
          />
        )}

        <VendorMobileNav
          activeTab={mobileTab}
          onTabChange={setMobileTab}
          activeCallsCount={activeCalls.length}
        />
      </div>
    );
  }

  // ========================
  // DESKTOP VIEW
  // ========================
  const columns = [
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
            <Link to={createPageUrl(`VendorCallManagement?id=${call.id}`)}>
              <Button size="sm" className="bg-[#f97316] hover:bg-[#ea580c]">
                סיים וחתם
              </Button>
            </Link>
          )}
          <Link to={createPageUrl(`VendorCallManagement?id=${call.id}`)}>
            <Button size="sm" variant="outline">
              נהל
            </Button>
          </Link>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6" dir="rtl">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full" dir="rtl">
        <TabsList>
          <TabsTrigger value="vendor">תצוגת ספק</TabsTrigger>
          {canSeeAdminTab && <TabsTrigger value="admin">{isAdmin ? 'ניהול' : 'מעקב'}</TabsTrigger>}
        </TabsList>

        {canSeeAdminTab && (
          <TabsContent value="admin" className="mt-4">
            <Suspense fallback={<Skeleton className="h-40" />}>
              <VendorPortalAdminTabLazy
                onSelectVendor={(v) => {
                  setVendorProfile(v);
                  setIsAvailable(!!v.is_available_now);
                  setActiveTab('vendor');
                }}
              />
            </Suspense>
          </TabsContent>
        )}

        <TabsContent value="vendor" className="mt-4 space-y-6">
          {!vendorProfile ? (
            <Card className="max-w-lg mx-auto">
              <CardContent className="pt-6 space-y-4">
                <div className="text-center">
                  <Users className="w-12 h-12 mx-auto text-blue-500 mb-3" />
                  <h2 className="text-xl font-bold mb-1">בחר ספק לצפייה</h2>
                  <p className="text-[#6B778C] text-sm">בחר ספק מהרשימה כדי לצפות בפורטל שלו</p>
                </div>
                {isAdmin && (
                  <div className="space-y-3">
                    <Select
                      onValueChange={(vendorId) => {
                        const v = (allVendorsQuery.data || []).find((x) => x.id === vendorId);
                        if (v) {
                          setVendorProfile(v);
                          setIsAvailable(!!v.is_available_now);
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="בחר ספק..." />
                      </SelectTrigger>
                      <SelectContent>
                        {(allVendorsQuery.data || []).map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.vendor_name}
                            {v.phone ? ` (${v.phone})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <>
              <Suspense fallback={null}>
                <VendorNewCallAlertLazy
                  call={pendingCall}
                  isOpen={showNewCallAlert}
                  onAccept={handleAcceptCall}
                  onDecline={handleDeclineCall}
                  timeoutSeconds={120}
                  vendorContract={contractQuery.data}
                  vendorProfile={vendorProfile}
                />
              </Suspense>

              {/* Only the actual vendor user should push their GPS to the vendor profile.
                  Operators who switch into a vendor's view via the admin/tracking tab
                  must NOT broadcast their browser's location to that vendor's profile. */}
              {isVendorUser && (
                <VendorGPSTracker
                  vendorId={vendorProfile?.id}
                  initialSharingEnabled={!!vendorProfile?.is_location_sharing_enabled}
                />
              )}

              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-[#172B4D]">
                    שלום, {vendorProfile?.vendor_name}
                  </h1>
                  {isAdmin && (
                    <p className="text-xs text-[#6B778C] mt-1">מציג בתור ספק (צפייה כאדמין)</p>
                  )}
                  <p className="text-[#6B778C] text-sm">פורטל ספקים - ניהול הקריאות שלך</p>
                </div>
                <div className="flex items-center gap-3">
                  <Link to={createPageUrl('VendorGuide')}>
                    <Button variant="outline" size="sm" className="gap-1">
                      <BookOpen className="w-4 h-4" />
                      מדריך
                    </Button>
                  </Link>
                  <Link to={createPageUrl('MyVendorProfile')}>
                    <Button variant="outline" size="sm" className="gap-1">
                      <Settings className="w-4 h-4" />
                      הפרופיל שלי
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => callsQuery.refetch()}
                    className="gap-1"
                    aria-label="רענן"
                  >
                    <RefreshCw className={cn('w-4 h-4', callsQuery.isFetching && 'animate-spin')} />
                  </Button>
                </div>
              </div>

              <Suspense fallback={<div className="h-16" />}>
                <VendorAvailabilityToggleLazy
                  vendor={vendorProfile}
                  isAvailable={isAvailable}
                  onToggle={toggleAvailability}
                />
              </Suspense>

              <NotificationPermissionBanner />

              <Suspense fallback={<Skeleton className="h-32" />}>
                <VendorStatsLazy
                  vendor={vendorProfile}
                  calls={calls}
                  onStatClick={(statId) => {
                    if (statId === 'completed') setCallsTab('completed');
                    if (statId === 'active' || statId === 'pending') setCallsTab('active');
                    if (statId === 'all' || statId === 'month') setCallsTab('all');
                    document
                      .getElementById('calls-table-section')
                      ?.scrollIntoView({ behavior: 'smooth' });
                  }}
                />
              </Suspense>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileDown className="w-4 h-4" />
                      דוח ביצועים
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <VendorPDFDownload vendorId={vendorProfile?.id} />
                  </CardContent>
                </Card>
                <VendorBreakHistory vendorId={vendorProfile?.id} />
              </div>

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
                      {activeCalls.map((call) => (
                        <div
                          key={call.id}
                          className="bg-white rounded-lg p-4 border border-orange-200"
                        >
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
                            {(call.call_status === 'assigned' ||
                              call.call_status === 'assigning') && (
                              <Link to={createPageUrl(`VendorCallManagement?id=${call.id}`)}>
                                <Button className="bg-blue-600 hover:bg-blue-700">יצא לדרך</Button>
                              </Link>
                            )}
                            {call.call_status === 'vendor_enroute' && (
                              <Link to={createPageUrl(`VendorCallManagement?id=${call.id}`)}>
                                <Button className="bg-blue-600 hover:bg-blue-700">
                                  הגעתי למקום
                                </Button>
                              </Link>
                            )}
                            {call.call_status === 'in_progress' && (
                              <Link to={createPageUrl(`VendorCallManagement?id=${call.id}`)}>
                                <Button className="bg-[#f97316] hover:bg-[#ea580c]">
                                  סיים וחתם
                                </Button>
                              </Link>
                            )}
                            <Link to={createPageUrl(`VendorCallManagement?id=${call.id}`)}>
                              <Button variant="outline">נהל קריאה</Button>
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <VendorActiveCallsGoogleMap vendorProfile={vendorProfile} activeCalls={activeCalls} />

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    החוזים שלי
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <VendorContractsView vendorId={vendorProfile?.id} isVendorUser={isVendorUser} />
                </CardContent>
              </Card>

              <Card className="bg-white" id="calls-table-section">
                <CardHeader>
                  <Tabs value={callsTab} onValueChange={setCallsTab} className="w-full" dir="rtl">
                    <TabsList>
                      <TabsTrigger value="all">כל הקריאות</TabsTrigger>
                      <TabsTrigger value="active">פעילות ({activeCalls.length})</TabsTrigger>
                      <TabsTrigger value="completed">הושלמו ({completedCalls.length})</TabsTrigger>
                    </TabsList>
                    <TabsContent value="all" className="mt-4">
                      <Suspense fallback={<Skeleton className="h-40" />}>
                        <DataTableLazy
                          columns={columns}
                          data={calls}
                          emptyMessage="אין קריאות להצגה"
                        />
                      </Suspense>
                    </TabsContent>
                    <TabsContent value="active" className="mt-4">
                      <Suspense fallback={<Skeleton className="h-40" />}>
                        <DataTableLazy
                          columns={columns}
                          data={activeCalls}
                          emptyMessage="אין קריאות פעילות"
                        />
                      </Suspense>
                    </TabsContent>
                    <TabsContent value="completed" className="mt-4">
                      <Suspense fallback={<Skeleton className="h-40" />}>
                        <DataTableLazy
                          columns={columns}
                          data={completedCalls}
                          emptyMessage="אין קריאות שהושלמו"
                        />
                      </Suspense>
                    </TabsContent>
                  </Tabs>
                </CardHeader>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
