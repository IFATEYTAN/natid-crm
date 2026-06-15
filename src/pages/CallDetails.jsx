import { lazyRetry } from '@/lib/lazyRetry';
import React, { useState, useMemo, useEffect, Suspense } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { createPageUrl, formatDateTime } from '@/components/utils';
import { useVendors } from '@/components/features/vendors/hooks/useVendors';
import { QueryStateWrapper } from '@/components/layout/QueryStateWrapper';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { usePermissions } from '@/components/permissions/PermissionsContext';
import { PermissionGuard } from '@/components/permissions/PermissionGuard';
import { useAuditLog } from '@/components/hooks/useAuditLog';

// Local queryKeys fallback
const queryKeys = {
  calls: {
    single: (id) => ['call', id],
  },
  callPhotos: {
    byCall: (callId) => ['callPhotos', callId],
  },
  callHistory: {
    byCall: (callId) => ['callHistory', callId],
  },
  callMessages: {
    byCall: (callId) => ['callMessages', callId],
  },
};
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  ArrowRight,
  Truck,
  AlertTriangle,
  Pencil,
  Save,
  Navigation,
  Ban,
  CalendarClock,
  Car,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { cn } from '@/components/utils';
import { toast } from 'sonner';
import { CLOSING_STATUSES, getClosingStatus } from '@/config/closingStatuses';
import { createContinuationCall } from '@/features/calls/createContinuationCall';
import { statusLabels, statusColors } from '@/components/config/labels';
import CallActionsMenu from '@/components/call-details/CallActionsMenu';

const CallDetailsInfoTab = lazyRetry(() => import('@/components/call-details/CallDetailsInfoTab'));
const CallChatTab = lazyRetry(() => import('@/components/call-details/CallChatTab'));
const CallHistoryTab = lazyRetry(() => import('@/components/call-details/CallHistoryTab'));
const CallFeedbackTab = lazyRetry(() => import('@/components/call-details/CallFeedbackTab'));
const CallFilesTab = lazyRetry(() => import('@/components/call-details/CallFilesTab'));
const VendorLiveMap = lazyRetry(() => import('@/components/maps/VendorLiveMap'));
const CallSummaryEditor = lazyRetry(() => import('@/components/call/CallSummaryEditor'));
const QuickCallSummary = lazyRetry(() => import('@/components/ai/QuickCallSummary'));
const VendorRecommendation = lazyRetry(() => import('@/components/ai/VendorRecommendation'));
const FutureServiceSection = lazyRetry(
  () => import('@/components/call-details/FutureServiceSection')
);
const QualityControlSection = lazyRetry(
  () => import('@/components/call-details/QualityControlSection')
);
const CancelCallDialog = lazyRetry(() => import('@/components/call-details/CancelCallDialog'));
const DepositSection = lazyRetry(() => import('@/components/call-details/DepositSection'));
const CallProductsSection = lazyRetry(
  () => import('@/components/call-details/CallProductsSection')
);
const CallPricingSection = lazyRetry(() => import('@/components/call-details/CallPricingSection'));
const EligibilityCheckSection = lazyRetry(
  () => import('@/components/call-details/EligibilityCheckSection')
);
const RemindersList = lazyRetry(() => import('@/components/reminders/RemindersList'));
const CallEditDialog = lazyRetry(() => import('@/components/call-details/CallEditDialog'));
const CallClosingSection = lazyRetry(() => import('@/components/call-details/CallClosingSection'));

export default function CallDetailsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const callId = searchParams.get('id');
  const queryClient = useQueryClient();

  const [showSignature, setShowSignature] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState('');
  const [autoAssigning, setAutoAssigning] = useState(false);
  const [autoAssignInfo, setAutoAssignInfo] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showPreCloseDialog, setShowPreCloseDialog] = useState(false);
  const [pendingCloseStatus, setPendingCloseStatus] = useState(null);
  const [selectedClosingStatus, setSelectedClosingStatus] = useState('');

  // Permission & Audit
  const { currentUser, hasPermission } = usePermissions();
  const { logAction } = useAuditLog();

  const canEdit = hasPermission('calls', 'edit');
  const canAssign = hasPermission('calls', 'assign');

  const callQuery = useQuery({
    queryKey: queryKeys.calls.single(callId),
    queryFn: () => base44.entities.Call.get(callId),
    enabled: !!callId,
    refetchInterval: 45000,
  });
  const vendorsQuery = useVendors();

  const call = callQuery.data;
  const vendors = vendorsQuery.data || [];
  const availableVendors = vendors.filter((v) => v.is_available_now && v.is_active);

  // Operator notes state
  const [operatorNotes, setOperatorNotes] = useState('');
  useEffect(() => {
    setOperatorNotes(call?.operator_notes || '');
  }, [call?.operator_notes]);

  // Fetch photos for this call
  const { data: photos = [] } = useQuery({
    queryKey: queryKeys.callPhotos.byCall(callId),
    queryFn: () => base44.entities.CallPhoto.filter({ call_id: callId }),
    enabled: !!callId,
  });

  // Fetch history for this call
  const { data: history = [] } = useQuery({
    queryKey: queryKeys.callHistory.byCall(callId),
    queryFn: () => base44.entities.CallHistory.filter({ call_id: callId }, '-created_date'),
    enabled: !!callId,
  });

  // Fetch messages for this call
  const { data: messages = [] } = useQuery({
    queryKey: queryKeys.callMessages.byCall(callId),
    queryFn: () => base44.entities.Message.filter({ call_id: callId }, '-created_date'),
    enabled: !!callId,
  });

  // Combined timeline (history + messages)
  const combinedTimeline = useMemo(() => {
    const historyItems = (history || []).map((h) => ({ ...h, __type: 'history' }));
    const messageItems = (messages || []).map((m) => ({ ...m, __type: 'message' }));
    return [...historyItems, ...messageItems].sort((a, b) => {
      const ad = new Date(a.created_date || a.timestamp);
      const bd = new Date(b.created_date || b.timestamp);
      return bd - ad;
    });
  }, [history, messages]);

  // Lightweight status message sender
  const sendStatusMessage = async (targetCallId, content) => {
    if (!targetCallId || !content) return;
    await base44.entities.Message.create({
      call_id: targetCallId,
      sender_name: currentUser?.full_name || 'מוקדן',
      sender_role: 'operator',
      message_text: content,
    });
    queryClient.invalidateQueries({ queryKey: queryKeys.callMessages.byCall(targetCallId) });
  };

  // Intercept 'completed' status to show pre-close survey message
  const handleStatusChange = async (newStatus, reason) => {
    if (!canEdit) return;

    // Show pre-close confirmation before marking as completed
    if (newStatus === 'completed' && !reason?.skipPreClose) {
      setPendingCloseStatus(newStatus);
      setShowPreCloseDialog(true);
      return;
    }

    const updates = { call_status: newStatus };
    if (newStatus === 'completed') {
      updates.closed_at = new Date().toISOString();
    }
    if (newStatus === 'waiting_treatment' && reason) {
      updates.closed_at = null;
      updates.closed_by = null;
    }

    await base44.entities.Call.update(callId, updates);
    queryClient.invalidateQueries({ queryKey: queryKeys.calls.single(callId) });
    logAction({
      action: 'status_change',
      entity_type: 'Call',
      entity_id: callId,
      entity_name: call?.call_number,
      details: `Status: ${call?.call_status} → ${newStatus}`,
      old_value: call?.call_status,
      new_value: newStatus,
    });

    if (newStatus === 'completed') {
      try {
        await base44.functions.invoke('generateCallSummary', { call_id: callId });
      } catch {
        // Auto summary generation failed silently
      }
    }

    base44.entities.CallHistory.create({
      call_id: callId,
      call_number: call?.call_number,
      change_type: 'status',
      old_value: call?.call_status,
      new_value: newStatus,
      changed_by: currentUser?.full_name || 'operator',
    });

    const statusMessages = {
      vendor_enroute: 'הספק יצא לדרך ובקרוב יגיע אליך',
      in_progress: 'הספק הגיע ומתחיל בטיפול',
      completed: 'הטיפול סגור בהצלחה!',
    };

    if (statusMessages[newStatus]) {
      await sendStatusMessage(callId, statusMessages[newStatus]);
    }

    if (newStatus === 'completed') {
      setShowFeedback(true);

      // Auto-send satisfaction survey SMS to customer
      if (call?.customer_phone) {
        base44.functions
          .invoke('sendFeedbackSMS', { call_id: callId })
          .then(() => toast.success('סקר שביעות רצון נשלח ללקוח'))
          .catch(() => {
            // Feedback SMS failure is non-blocking
          });
      }
    }
  };

  // Close a call with a specific closing status (תוצאת הטיפול). Drives the
  // customer SMS and — for failure/extraction outcomes — opens a linked
  // continuation call. Storage closes into a holding state with no SMS.
  const handleCloseWithStatus = async (closingKey) => {
    if (!canEdit) return;
    const cfg = getClosingStatus(closingKey);
    if (!cfg) return;

    setShowPreCloseDialog(false);

    // Shared event code linking the original leg with any continuation leg.
    const caseCode =
      call?.case_reference_code || call?.call_number || `EVT-${Date.now().toString().slice(-8)}`;

    const updates = {
      call_status: cfg.resultingStatus,
      closing_status: closingKey,
      case_reference_code: caseCode,
    };
    if (cfg.resultingStatus === 'completed') {
      updates.closed_at = new Date().toISOString();
      updates.closed_by = currentUser?.full_name || 'operator';
    }

    try {
      await base44.entities.Call.update(callId, updates);
    } catch {
      toast.error('שגיאה בסגירת הקריאה');
      return;
    }
    queryClient.invalidateQueries({ queryKey: queryKeys.calls.single(callId) });

    logAction({
      action: 'status_change',
      entity_type: 'Call',
      entity_id: callId,
      entity_name: call?.call_number,
      details: `סגירה: ${cfg.label}`,
      old_value: call?.call_status,
      new_value: cfg.resultingStatus,
    });

    base44.entities.CallHistory.create({
      call_id: callId,
      call_number: call?.call_number,
      change_type: 'status',
      old_value: call?.call_status,
      new_value: cfg.resultingStatus,
      changed_by: currentUser?.full_name || 'operator',
      notes: `סטטוס סגירה: ${cfg.label}`,
    });

    if (cfg.resultingStatus === 'completed') {
      base44.functions.invoke('generateCallSummary', { call_id: callId }).catch(() => {});
    }

    // Customer SMS per closing status (storage sends none by design).
    if (cfg.sendsSms && call?.customer_phone && cfg.smsText) {
      base44.functions
        .invoke('sendSMS', { phone: call.customer_phone, message: cfg.smsText, callId })
        .catch(() => {});
    }

    setSelectedClosingStatus('');

    // Open a linked continuation call for failure / extraction outcomes.
    if (cfg.createsContinuation) {
      try {
        const continuation = await createContinuationCall(base44, call, {
          serviceCategory: cfg.continuationCategory || 'towing',
          caseCode,
          createdByName: currentUser?.full_name,
        });
        await base44.entities.Call.update(callId, { continuation_call_id: continuation.id });
        queryClient.invalidateQueries({ queryKey: queryKeys.calls.single(callId) });
        toast.success('נפתחה קריאת המשך מקושרת');
        navigate(createPageUrl(`CallDetails?id=${continuation.id}`));
      } catch {
        toast.error('הקריאה נסגרה אך פתיחת קריאת ההמשך נכשלה');
      }
      return;
    }

    if (cfg.isStorage) {
      toast.success('הקריאה נסגרה לאחסנה');
    } else {
      toast.success('הקריאה נסגרה בהצלחה');
      setShowFeedback(true);
    }
  };

  // Location-based automatic assignment. Runs the server-side scoring engine
  // (autoAssignVendor: distance via Haversine, service match, rating, ETA via
  // OSRM) and pre-selects the top vendor so the operator can confirm.
  const handleAutoAssign = async () => {
    if (!canAssign) return;
    setAutoAssigning(true);
    setAutoAssignInfo(null);
    try {
      const res = await base44.functions.invoke('autoAssignVendor', { call_id: callId });
      const data = res?.data || res;
      if (!data?.success || !data?.recommendation) {
        toast.error(
          data?.error === 'No available vendors'
            ? 'אין ספקים זמינים כרגע'
            : 'לא נמצא ספק מתאים לשיבוץ אוטומטי'
        );
        return;
      }
      const rec = data.recommendation;
      setSelectedVendor(rec.vendor_id);
      setAutoAssignInfo({
        vendor_name: rec.vendor_name,
        distance_km: rec.details?.distance_km ?? rec.details?.route_distance_km ?? null,
        eta: rec.estimated_arrival_minutes ?? null,
        score: rec.score ?? null,
      });
      const distTxt = rec.details?.distance_km != null ? `, ${rec.details.distance_km} ק"מ` : '';
      const etaTxt =
        rec.estimated_arrival_minutes != null ? `, הגעה ~${rec.estimated_arrival_minutes} דק'` : '';
      toast.success(`הומלץ אוטומטית: ${rec.vendor_name}${distTxt}${etaTxt}. לחצי "שבץ" לאישור.`);
    } catch (error) {
      // 404 here means the autoAssignVendor function isn't deployed on Base44.
      toast.error(`שיבוץ אוטומטי נכשל: ${error?.message || 'שגיאה לא ידועה'}`);
    } finally {
      setAutoAssigning(false);
    }
  };

  const handleAssignVendor = async () => {
    if (!selectedVendor || !canAssign) return;
    // Re-fetch the call right before assigning to detect a concurrent
    // assignment by another operator. autoAssignVendor has its own dedupe
    // server-side, but manual assignment from this dialog had no guard, so
    // two operators clicking simultaneously would both succeed and the
    // second one would silently overwrite the first.
    let fresh;
    try {
      fresh = await base44.entities.Call.get(callId);
    } catch (error) {
      toast.error(`לא ניתן לאמת את מצב הקריאה: ${error?.message || 'שגיאת רשת'}`);
      return;
    }

    const lockedStatuses = [
      'assigning',
      'assigned',
      'vendor_enroute',
      'vendor_arrived',
      'in_progress',
    ];
    if (
      fresh?.assigned_vendor_id &&
      fresh.assigned_vendor_id !== selectedVendor &&
      lockedStatuses.includes(fresh.call_status)
    ) {
      toast.error(
        `הקריאה כבר שובצה ל-${fresh.assigned_vendor_name || 'ספק אחר'} (${fresh.call_status}). רענני את הדף.`
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.calls.single(callId) });
      setShowAssignDialog(false);
      return;
    }

    const vendor = vendors.find((v) => v.id === selectedVendor);
    await base44.entities.Call.update(callId, {
      assigned_vendor_id: selectedVendor,
      assigned_vendor_name: vendor?.vendor_name,
      assigned_at: new Date().toISOString(),
      call_status: 'assigning',
    });
    queryClient.invalidateQueries({ queryKey: queryKeys.calls.single(callId) });

    logAction({
      action: 'assign',
      entity_type: 'Call',
      entity_id: callId,
      entity_name: call?.call_number,
      details: `Assigned to ${vendor?.vendor_name}`,
    });

    base44.entities.CallHistory.create({
      call_id: callId,
      call_number: call?.call_number,
      change_type: 'vendor_assignment',
      new_value: vendor?.vendor_name,
      changed_by: currentUser?.full_name || 'operator',
    });

    setShowAssignDialog(false);
    setAutoAssignInfo(null);
    toast.success(`הקריאה שובצה ל-${vendor?.vendor_name}`);
  };

  const handleSignatureSaved = () => {
    setShowSignature(false);
    queryClient.invalidateQueries({ queryKey: queryKeys.callPhotos.byCall(callId) });
    toast.success('החתימה נשמרה בהצלחה');
  };

  const handleFilesUploaded = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.callPhotos.byCall(callId) });
  };

  const handleSaveOperatorNotes = async () => {
    if (!canEdit) return;
    await base44.entities.Call.update(callId, { operator_notes: operatorNotes });
    toast.success('הערות נשמרו');
    queryClient.invalidateQueries({ queryKey: queryKeys.calls.single(callId) });
  };

  if (!callId) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold">לא נמצא מזהה קריאה</h2>
        <Link to={createPageUrl('Dashboard')}>
          <Button className="mt-4">חזרה לדשבורד</Button>
        </Link>
      </div>
    );
  }

  return (
    <QueryStateWrapper query={callQuery}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              aria-label="חזרה"
              className="shrink-0 h-10 w-10"
            >
              <ArrowRight className="w-5 h-5" />
            </Button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="flex items-center gap-2 text-lg sm:text-2xl font-bold text-[#172B4D]">
                  <Car className="w-5 h-5 sm:w-6 sm:h-6 text-[#6B778C] shrink-0" />
                  <span dir="ltr" className="tabular-nums">
                    {call?.vehicle_plate || 'ללא מספר רכב'}
                  </span>
                </h1>
                <Badge className={cn('text-sm', statusColors[call?.call_status])}>
                  {statusLabels[call?.call_status]}
                </Badge>
              </div>
              <p className="text-[#6B778C] text-sm">
                קריאה {call?.call_number || `#${callId?.slice(-6)}`} · נפתחה ב-
                {formatDateTime(call?.created_date)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {call?.call_status !== 'completed' && call?.call_status !== 'cancelled' && (
              <>
                <PermissionGuard category="calls" permission="assign">
                  <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="gap-2 h-10 text-sm">
                        <Truck className="w-4 h-4" />
                        <span className="hidden sm:inline">שבץ ספק</span>
                        <span className="sm:hidden">שיבוץ</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>שיבוץ ספק לקריאה</DialogTitle>
                        <DialogDescription>בחר ספק זמין לטיפול בקריאה</DialogDescription>
                      </DialogHeader>
                      <div className="py-4 space-y-4">
                        <div className="rounded-lg border border-indigo-200 bg-indigo-50/50 p-3 space-y-2">
                          <Button
                            onClick={handleAutoAssign}
                            disabled={autoAssigning}
                            className="w-full gap-2 bg-indigo-600 hover:bg-indigo-700"
                          >
                            {autoAssigning ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Sparkles className="w-4 h-4" />
                            )}
                            {autoAssigning ? 'מחשב מיקום ומרחק...' : 'שיבוץ אוטומטי לפי מיקום'}
                          </Button>
                          {autoAssignInfo && (
                            <p className="text-xs text-indigo-800">
                              מומלץ:{' '}
                              <span className="font-semibold">{autoAssignInfo.vendor_name}</span>
                              {autoAssignInfo.distance_km != null &&
                                ` · ${autoAssignInfo.distance_km} ק"מ`}
                              {autoAssignInfo.eta != null && ` · הגעה ~${autoAssignInfo.eta} דק'`}
                              {autoAssignInfo.score != null && ` · ציון ${autoAssignInfo.score}`}
                            </p>
                          )}
                          {!call?.pickup_location_lat && (
                            <p className="text-xs text-amber-700">
                              לקריאה זו אין מיקום מדויק (קואורדינטות), לכן השיבוץ יתבסס על אזור
                              הכיסוי בלבד.
                            </p>
                          )}
                        </div>
                        <Suspense
                          fallback={<div className="h-20 bg-gray-50 rounded animate-pulse" />}
                        >
                          <VendorRecommendation
                            callDetails={call}
                            onSelectVendor={(vendor) => setSelectedVendor(vendor.id)}
                          />
                        </Suspense>
                        <div>
                          <Label>או בחר ספק ידנית</Label>
                          <Select value={selectedVendor} onValueChange={setSelectedVendor}>
                            <SelectTrigger>
                              <SelectValue placeholder="בחר ספק" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableVendors.map((vendor) => (
                                <SelectItem key={vendor.id} value={vendor.id}>
                                  {vendor.vendor_name} - {vendor.coverage_cities}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
                          ביטול
                        </Button>
                        <Button
                          onClick={handleAssignVendor}
                          disabled={!selectedVendor}
                          className="bg-[#FF0000] hover:bg-[#CC0000]"
                        >
                          שבץ
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </PermissionGuard>

                <PermissionGuard category="calls" permission="edit">
                  <Select value={call?.call_status} onValueChange={handleStatusChange}>
                    <SelectTrigger className="w-full sm:w-44">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(statusLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </PermissionGuard>
              </>
            )}

            <PermissionGuard category="calls" permission="edit">
              <Button
                variant="outline"
                className="gap-2 h-10 text-sm"
                onClick={() => setShowEditDialog(true)}
              >
                <Pencil className="w-4 h-4" />
                ערוך קריאה
              </Button>
            </PermissionGuard>

            <CallActionsMenu
              call={call}
              callId={callId}
              canEdit={canEdit}
              canAssign={canAssign}
              onStatusChange={handleStatusChange}
              onOpenAssignDialog={() => setShowAssignDialog(true)}
              onOpenCancelDialog={() => setShowCancelDialog(true)}
              onNavigateToReminders={() => {
                const tabsList = document.querySelector('[role="tablist"]');
                if (tabsList) {
                  const remindersTab = tabsList.querySelector('[value="reminders"]');
                  if (remindersTab) remindersTab.click();
                }
              }}
            />
          </div>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="details" className="space-y-4" dir="rtl">
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <TabsList className="inline-flex w-auto min-w-full sm:w-auto">
              <TabsTrigger value="details" className="text-xs sm:text-sm px-2 sm:px-3">
                פרטים
              </TabsTrigger>
              <TabsTrigger value="finance" className="text-xs sm:text-sm px-2 sm:px-3">
                כלכלה
              </TabsTrigger>
              <TabsTrigger value="reminders" className="text-xs sm:text-sm px-2 sm:px-3">
                תזכורות
              </TabsTrigger>
              <TabsTrigger value="map" className="text-xs sm:text-sm px-2 sm:px-3">
                מפה
              </TabsTrigger>
              <TabsTrigger value="chat" className="text-xs sm:text-sm px-2 sm:px-3">
                צ'אט
              </TabsTrigger>
              <TabsTrigger value="operatorNotes" className="text-xs sm:text-sm px-2 sm:px-3">
                הערות
              </TabsTrigger>
              <TabsTrigger value="files" className="text-xs sm:text-sm px-2 sm:px-3">
                קבצים ({photos.length})
              </TabsTrigger>
              <TabsTrigger value="history" className="text-xs sm:text-sm px-2 sm:px-3">
                היסטוריה
              </TabsTrigger>
              {(call?.call_status === 'in_progress' ||
                call?.call_status === 'vendor_arrived' ||
                call?.call_status === 'future_service' ||
                call?.call_status === 'completed') && (
                <TabsTrigger value="closing" className="relative text-xs sm:text-sm px-2 sm:px-3">
                  סגירה
                  {call?.boy_marked && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-amber-400 rounded-full" />
                  )}
                </TabsTrigger>
              )}
              {call?.call_status === 'completed' && (
                <>
                  <TabsTrigger value="summary" className="text-xs sm:text-sm px-2 sm:px-3">
                    סיכום
                  </TabsTrigger>
                  <TabsTrigger value="feedback" className="text-xs sm:text-sm px-2 sm:px-3">
                    משוב
                  </TabsTrigger>
                </>
              )}
            </TabsList>
          </div>

          <TabsContent value="details">
            <div className="space-y-4">
              <Suspense fallback={<div className="h-20 bg-gray-50 rounded animate-pulse" />}>
                <QuickCallSummary callId={callId} />
              </Suspense>

              {/* Quality Control */}
              {call?.call_status === 'waiting_treatment' && (
                <Suspense fallback={<div className="h-20 bg-gray-50 rounded animate-pulse" />}>
                  <QualityControlSection call={call} callId={callId} currentUser={currentUser} />
                </Suspense>
              )}

              {/* Future Service */}
              {call?.call_status !== 'completed' && call?.call_status !== 'cancelled' && (
                <Suspense fallback={<div className="h-20 bg-gray-50 rounded animate-pulse" />}>
                  <FutureServiceSection
                    call={call}
                    callId={callId}
                    onStatusChanged={() =>
                      queryClient.invalidateQueries({ queryKey: queryKeys.calls.single(callId) })
                    }
                  />
                </Suspense>
              )}

              <Suspense fallback={<div className="h-40 w-full bg-gray-50" />}>
                <CallDetailsInfoTab
                  call={call}
                  callId={callId}
                  photos={photos}
                  showSignature={showSignature}
                  setShowSignature={setShowSignature}
                  onSignatureSaved={handleSignatureSaved}
                  onEditCall={canEdit ? () => setShowEditDialog(true) : undefined}
                />
              </Suspense>
            </div>
          </TabsContent>

          <TabsContent value="finance">
            <div className="space-y-4">
              <Suspense fallback={<div className="h-20 bg-gray-50 rounded animate-pulse" />}>
                <EligibilityCheckSection call={call} callId={callId} currentUser={currentUser} />
              </Suspense>
              <Suspense fallback={<div className="h-20 bg-gray-50 rounded animate-pulse" />}>
                <DepositSection call={call} callId={callId} currentUser={currentUser} />
              </Suspense>
              <Suspense fallback={<div className="h-20 bg-gray-50 rounded animate-pulse" />}>
                <CallProductsSection call={call} callId={callId} currentUser={currentUser} />
              </Suspense>
              <Suspense fallback={<div className="h-20 bg-gray-50 rounded animate-pulse" />}>
                <CallPricingSection call={call} callId={callId} />
              </Suspense>
            </div>
          </TabsContent>

          <TabsContent value="reminders">
            <Suspense fallback={<div className="h-20 bg-gray-50 rounded animate-pulse" />}>
              <RemindersList callId={callId} call={call} currentUser={currentUser} />
            </Suspense>
          </TabsContent>

          <TabsContent value="map">
            <div className="space-y-4">
              {call?.assigned_vendor_id ? (
                <Suspense fallback={<div className="h-[500px] w-full bg-gray-50" />}>
                  <VendorLiveMap
                    vendorId={call.assigned_vendor_id}
                    callId={callId}
                    pickupLat={call.pickup_location_lat}
                    pickupLon={call.pickup_location_lon}
                    showHistory={call.call_status === 'completed'}
                    height="500px"
                  />
                </Suspense>
              ) : (
                <Card className="bg-white">
                  <CardContent className="py-12 text-center text-[#6B778C]">
                    <Navigation className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>לא שובץ ספק לקריאה זו</p>
                    <p className="text-sm">מפת מעקב תופיע לאחר שיבוץ ספק</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="chat">
            <Suspense fallback={<div className="h-[500px] w-full bg-gray-50" />}>
              <CallChatTab
                callId={callId}
                call={call}
                currentUser={currentUser}
                onSendStatusMessage={sendStatusMessage}
              />
            </Suspense>
          </TabsContent>

          <TabsContent value="operatorNotes">
            <Card className="bg-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Pencil className="w-4 h-4 text-[#6B778C]" />
                  הערות מוקדן
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Textarea
                    value={operatorNotes}
                    onChange={(e) => setOperatorNotes(e.target.value)}
                    placeholder="הקלד הערות חופשיות..."
                    className="min-h-[140px]"
                    disabled={!canEdit}
                    aria-label="הערות מוקדן"
                  />
                  <div className="flex justify-end">
                    <PermissionGuard category="calls" permission="edit">
                      <Button onClick={handleSaveOperatorNotes} className="gap-2">
                        <Save className="w-4 h-4" />
                        שמור
                      </Button>
                    </PermissionGuard>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="files">
            <Suspense fallback={<div className="h-40 w-full bg-gray-50" />}>
              <CallFilesTab callId={callId} photos={photos} onFilesUploaded={handleFilesUploaded} />
            </Suspense>
          </TabsContent>

          <TabsContent value="history">
            <Suspense fallback={<div className="h-40 w-full bg-gray-50" />}>
              <CallHistoryTab combinedTimeline={combinedTimeline} />
            </Suspense>
          </TabsContent>

          {/* Closing & Score Tab (משימות 333, 336, 252) */}
          {(call?.call_status === 'in_progress' ||
            call?.call_status === 'vendor_arrived' ||
            call?.call_status === 'future_service' ||
            call?.call_status === 'completed') && (
            <TabsContent value="closing">
              <div className="max-w-2xl">
                <Suspense
                  fallback={<div className="h-40 w-full bg-gray-50 rounded animate-pulse" />}
                >
                  <CallClosingSection call={call} callId={callId} currentUser={currentUser} />
                </Suspense>
              </div>
            </TabsContent>
          )}

          {call?.call_status === 'completed' && (
            <TabsContent value="summary">
              <div className="max-w-2xl mx-auto">
                <Suspense fallback={<div className="h-40 w-full bg-gray-50" />}>
                  <CallSummaryEditor
                    callId={callId}
                    callNumber={call?.call_number}
                    summaryDraft={call?.summary_draft}
                    summaryFinal={call?.summary_final}
                    onSummaryGenerated={() => {
                      queryClient.invalidateQueries({ queryKey: queryKeys.calls.single(callId) });
                    }}
                  />
                </Suspense>
              </div>
            </TabsContent>
          )}

          {call?.call_status === 'completed' && (
            <TabsContent value="feedback">
              <Suspense fallback={<div className="h-40 w-full bg-gray-50" />}>
                <CallFeedbackTab call={call} callId={callId} />
              </Suspense>
            </TabsContent>
          )}
        </Tabs>
        {/* Edit Dialog */}
        <Suspense fallback={null}>
          <CallEditDialog
            open={showEditDialog}
            onOpenChange={setShowEditDialog}
            call={call}
            callId={callId}
            currentUser={currentUser}
          />
        </Suspense>

        {/* Cancel Dialog */}
        <Suspense fallback={null}>
          <CancelCallDialog
            open={showCancelDialog}
            onOpenChange={setShowCancelDialog}
            call={call}
            callId={callId}
            currentUser={currentUser}
          />
        </Suspense>

        {/* Close Call — closing status selector */}
        <Dialog open={showPreCloseDialog} onOpenChange={setShowPreCloseDialog}>
          <DialogContent className="max-w-md" dir="rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-right">
                <span className="text-2xl">📋</span>
                סגירת קריאה — בחירת סטטוס סגירה
              </DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">סטטוס סגירה (תוצאת הטיפול)</Label>
                <Select value={selectedClosingStatus} onValueChange={setSelectedClosingStatus}>
                  <SelectTrigger className="w-full text-right">
                    <SelectValue placeholder="בחר סטטוס סגירה..." />
                  </SelectTrigger>
                  <SelectContent>
                    {CLOSING_STATUSES.map((s) => (
                      <SelectItem key={s.key} value={s.key} className="text-right">
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedClosingStatus &&
                (() => {
                  const cfg = getClosingStatus(selectedClosingStatus);
                  if (!cfg) return null;
                  return (
                    <div className="space-y-2">
                      {cfg.createsContinuation && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <p className="text-sm text-blue-800 font-medium">
                            ↪️ תיפתח אוטומטית <strong>קריאת המשך מקושרת</strong> (גרירה), עם פרטי
                            הלקוח והרכב מהקריאה הנוכחית.
                          </p>
                        </div>
                      )}
                      {cfg.isStorage && (
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                          <p className="text-sm text-purple-800 font-medium">
                            📦 הקריאה תיסגר במצב <strong>"באחסנה"</strong>. לא תישלח הודעת SMS
                            ללקוח. גרירת המשך תיפתח ידנית בהמשך.
                          </p>
                        </div>
                      )}
                      <div
                        className={`rounded-lg p-3 border ${
                          cfg.sendsSms
                            ? 'bg-green-50 border-green-200'
                            : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <p
                          className={`text-xs ${cfg.sendsSms ? 'text-green-700' : 'text-gray-500'}`}
                        >
                          {cfg.sendsSms
                            ? '📨 תישלח הודעת SMS ללקוח על סטטוס הסגירה.'
                            : '🔕 לא תישלח הודעת SMS ללקוח.'}
                        </p>
                      </div>
                    </div>
                  );
                })()}
            </div>
            <DialogFooter className="flex gap-2 justify-start">
              <Button
                disabled={!selectedClosingStatus}
                onClick={() => handleCloseWithStatus(selectedClosingStatus)}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                סגור קריאה
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowPreCloseDialog(false);
                  setPendingCloseStatus(null);
                  setSelectedClosingStatus('');
                }}
              >
                ביטול
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </QueryStateWrapper>
  );
}
