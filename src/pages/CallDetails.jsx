import React, { useState, useMemo, useEffect, Suspense } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { createPageUrl, formatDateTime } from '@/components/utils';
import { useCall, useUpdateCall } from '@/features/calls/hooks/useCalls';
import { useVendors } from '@/features/vendors/hooks/useVendors';
import { QueryStateWrapper } from '@/components/layout/QueryStateWrapper';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { usePermissions } from '@/components/permissions/PermissionsContext';
import { PermissionGuard } from '@/components/permissions/PermissionGuard';
import { useAuditLog } from '@/hooks/useAuditLog';
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
import { ArrowRight, Truck, AlertTriangle, Pencil, Save, Navigation } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { statusLabels, statusColors } from '@/components/call-details/callDetailsConstants';

const CallDetailsInfoTab = React.lazy(() => import('@/components/call-details/CallDetailsInfoTab'));
const CallChatTab = React.lazy(() => import('@/components/call-details/CallChatTab'));
const CallHistoryTab = React.lazy(() => import('@/components/call-details/CallHistoryTab'));
const CallFeedbackTab = React.lazy(() => import('@/components/call-details/CallFeedbackTab'));
const CallFilesTab = React.lazy(() => import('@/components/call-details/CallFilesTab'));
const VendorLiveMap = React.lazy(() => import('@/components/maps/VendorLiveMap'));
const CallSummaryEditor = React.lazy(() => import('@/components/call/CallSummaryEditor'));

export default function CallDetailsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const callId = searchParams.get('id');
  const queryClient = useQueryClient();

  const [showSignature, setShowSignature] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);

  // Permission & Audit
  const { currentUser, hasPermission } = usePermissions();
  const { logStatusChange, logAssign } = useAuditLog();

  const canEdit = hasPermission('calls', 'edit');
  const canAssign = hasPermission('calls', 'assign');

  const callQuery = useCall(callId);
  const vendorsQuery = useVendors();
  const updateCall = useUpdateCall();

  const call = callQuery.data?.[0];
  const vendors = vendorsQuery.data || [];
  const availableVendors = vendors.filter((v) => v.is_available_now && v.is_active);

  // Operator notes state
  const [operatorNotes, setOperatorNotes] = useState('');
  useEffect(() => {
    setOperatorNotes(call?.operator_notes || '');
  }, [call?.operator_notes]);

  // Fetch photos for this call
  const { data: photos = [] } = useQuery({
    queryKey: ['callPhotos', callId],
    queryFn: () => base44.entities.CallPhoto.filter({ call_id: callId }),
    enabled: !!callId,
  });

  // Fetch history for this call
  const { data: history = [] } = useQuery({
    queryKey: ['callHistory', callId],
    queryFn: () => base44.entities.CallHistory.filter({ call_id: callId }, '-created_date'),
    enabled: !!callId,
  });

  // Fetch messages for this call
  const { data: messages = [] } = useQuery({
    queryKey: ['callMessages', callId],
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
    queryClient.invalidateQueries({ queryKey: ['callMessages', targetCallId] });
  };

  const handleStatusChange = async (newStatus) => {
    if (!canEdit) return;

    const updates = { call_status: newStatus };
    if (newStatus === 'completed') {
      updates.closed_at = new Date().toISOString();
    }

    updateCall.mutate({ id: callId, data: updates });
    logStatusChange('Call', callId, call?.call_number, call?.call_status, newStatus);

    if (newStatus === 'completed') {
      try {
        await base44.functions.invoke('generateCallSummary', { call_id: callId });
      } catch (e) {
        console.log('Auto summary generation failed:', e);
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
      completed: 'הטיפול הושלם בהצלחה!',
    };

    if (statusMessages[newStatus]) {
      await sendStatusMessage(callId, statusMessages[newStatus]);
    }

    if (newStatus === 'completed') {
      setShowFeedback(true);
    }
  };

  const handleAssignVendor = () => {
    if (!selectedVendor || !canAssign) return;

    const vendor = vendors.find((v) => v.id === selectedVendor);

    updateCall.mutate({
      id: callId,
      data: {
        assigned_vendor_id: selectedVendor,
        assigned_vendor_name: vendor?.vendor_name,
        assigned_at: new Date().toISOString(),
        call_status: 'assigning',
      },
    });

    logAssign('Call', callId, call?.call_number, vendor?.vendor_name);

    base44.entities.CallHistory.create({
      call_id: callId,
      call_number: call?.call_number,
      change_type: 'vendor_assignment',
      new_value: vendor?.vendor_name,
      changed_by: currentUser?.full_name || 'operator',
    });

    setShowAssignDialog(false);
    toast.success(`הקריאה שובצה ל-${vendor?.vendor_name}`);
  };

  const handleSignatureSaved = () => {
    setShowSignature(false);
    queryClient.invalidateQueries({ queryKey: ['callPhotos', callId] });
    toast.success('החתימה נשמרה בהצלחה');
  };

  const handleFilesUploaded = () => {
    queryClient.invalidateQueries({ queryKey: ['callPhotos', callId] });
  };

  const handleSaveOperatorNotes = () => {
    if (!canEdit) return;
    updateCall.mutate({ id: callId, data: { operator_notes: operatorNotes } });
    toast.success('הערות נשמרו');
    queryClient.invalidateQueries({ queryKey: ['call', callId] });
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
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowRight className="w-5 h-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-[#172B4D]">
                  קריאה {call?.call_number || `#${callId?.slice(-6)}`}
                </h1>
                <Badge className={cn('text-sm', statusColors[call?.call_status])}>
                  {statusLabels[call?.call_status]}
                </Badge>
              </div>
              <p className="text-[#6B778C] text-sm">נפתחה ב-{formatDateTime(call?.created_date)}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {call?.call_status !== 'completed' && call?.call_status !== 'cancelled' && (
              <>
                <PermissionGuard category="calls" permission="assign">
                  <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="gap-2">
                        <Truck className="w-4 h-4" />
                        שבץ ספק
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>שיבוץ ספק לקריאה</DialogTitle>
                        <DialogDescription>בחר ספק זמין לטיפול בקריאה</DialogDescription>
                      </DialogHeader>
                      <div className="py-4">
                        <Label>ספק</Label>
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
                    <SelectTrigger className="w-40">
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
          </div>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="details" className="space-y-4" dir="rtl">
          <TabsList>
            <TabsTrigger value="details">פרטים</TabsTrigger>
            <TabsTrigger value="map">מפה</TabsTrigger>
            <TabsTrigger value="chat">צ'אט</TabsTrigger>
            <TabsTrigger value="operatorNotes">הערות מוקדן</TabsTrigger>
            <TabsTrigger value="files">קבצים ({photos.length})</TabsTrigger>
            <TabsTrigger value="history">היסטוריה</TabsTrigger>
            {call?.call_status === 'completed' && (
              <>
                <TabsTrigger value="summary">סיכום</TabsTrigger>
                <TabsTrigger value="feedback">משוב</TabsTrigger>
              </>
            )}
          </TabsList>

          <TabsContent value="details">
            <Suspense fallback={<div className="h-40 w-full bg-gray-50" />}>
              <CallDetailsInfoTab
                call={call}
                callId={callId}
                photos={photos}
                showSignature={showSignature}
                setShowSignature={setShowSignature}
                onSignatureSaved={handleSignatureSaved}
              />
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
                      queryClient.invalidateQueries({ queryKey: ['call', callId] });
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
      </div>
    </QueryStateWrapper>
  );
}
