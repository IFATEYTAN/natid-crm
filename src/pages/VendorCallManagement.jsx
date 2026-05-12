import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { queryKeys } from '@/lib/queryKeys';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Camera,
  AlertCircle,
  ArrowRight,
  Loader2,
  FileText,
  MessageSquare,
  Route,
  Sparkles,
} from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { usePermissions } from '@/components/permissions/PermissionsContext';
import { showToast } from '@/components/ui/FeedbackToast';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { issueTypeLabels } from '@/config/labels';
import SignaturePad from '@/components/signature/SignaturePad';
import EnhancedCallChat, { sendStatusMessage } from '@/components/chat/EnhancedCallChat';
import CallFeedbackForm from '@/components/feedback/CallFeedbackForm';
import VendorCallStatusProgress from '@/components/vendor/VendorCallStatusProgress';
import VendorCallCustomerInfo from '@/components/vendor/VendorCallCustomerInfo';
import VendorCallVehicleInfo from '@/components/vendor/VendorCallVehicleInfo';
import VendorCallActionBar from '@/components/vendor/VendorCallActionBar';
import VendorCustomerJourney from '@/components/vendor/VendorCustomerJourney';
import VendorPhotoUploader from '@/components/vendor/VendorPhotoUploader';
import VendorPhotoAIExtractor from '@/components/vendor/VendorPhotoAIExtractor';

export default function VendorCallManagementPage() {
  const { currentUser, effectiveRole } = usePermissions();
  const isVendorUser = effectiveRole === 'vendor';
  const [vendorProfile, setVendorProfile] = useState(null);
  const [selectedCallId, setSelectedCallId] = useState(null);
  const [showSignatureDialog, setShowSignatureDialog] = useState(false);
  const [vendorNotes, setVendorNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [searchParams] = useSearchParams();
  useEffect(() => {
    const id = searchParams.get('id');
    if (id) setSelectedCallId(id);
  }, [searchParams]);

  // Vendor profile: server-scoped for vendor users, direct for admin
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
        return vendors[0];
      }
      return null;
    },
    enabled: !!currentUser?.email,
  });

  // Call data: direct query for all users, handled through service role
  const callQuery = useQuery({
    queryKey: [...queryKeys.vendors.call(selectedCallId, vendorProfile?.id), effectiveRole],
    queryFn: async () => {
      // Directly fetch the call record
      const calls = await base44.entities.Call.filter({ id: selectedCallId });
      if (calls.length > 0) {
        const call = calls[0];
        // Ownership verification for vendor users
        if (isVendorUser && vendorProfile && call.assigned_vendor_id !== vendorProfile.id) {
          return null;
        }
        setVendorNotes(call.vendor_notes || '');
        return call;
      }
      return null;
    },
    enabled: !!selectedCallId && !!vendorProfile?.id,
  });

  // Photos: only load after call ownership is verified via server-scoped data
  const photosQuery = useQuery({
    queryKey: queryKeys.callPhotos.byCall(selectedCallId),
    queryFn: () => base44.entities.CallPhoto.filter({ call_id: selectedCallId, is_deleted: false }),
    enabled: !!selectedCallId && !!callQuery.data,
  });

  // Server-side validated update (ownership check + field filtering)
  const updateCallMutation = useMutation({
    mutationFn: (data) =>
      base44.functions.invoke('updateVendorCall', {
        call_id: selectedCallId,
        updates: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.vendors.call(selectedCallId, vendorProfile?.id),
      });
      showToast.success('הקריאה עודכנה בהצלחה');
    },
    onError: () => {
      showToast.error('שגיאה בעדכון הקריאה');
    },
  });

  const refreshPhotos = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.callPhotos.byCall(selectedCallId) });
  };

  const addHistoryMutation = useMutation({
    mutationFn: (data) => base44.entities.CallHistory.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.vendors.call(selectedCallId, vendorProfile?.id),
      });
    },
    onError: () => {
      showToast.error('שגיאה בשמירת היסטוריית הקריאה');
    },
  });

  const call = callQuery.data;
  const photos = photosQuery.data || [];

  const handleStatusUpdate = async (newStatus) => {
    const updateData = { call_status: newStatus };
    const historyData = {
      call_id: selectedCallId,
      call_number: call.call_number,
      change_type: 'status',
      old_value: call.call_status,
      new_value: newStatus,
      changed_by: vendorProfile?.vendor_name || 'ספק',
    };

    const statusMessages = {
      vendor_enroute: `הספק ${vendorProfile?.vendor_name || ''} יצא לדרך`,
      in_progress: 'הספק הגיע למקום ומתחיל בטיפול',
      completed: 'הטיפול סגור בהצלחה!',
    };

    if (newStatus === 'in_progress') {
      updateData.vendor_arrival_time_actual = new Date().toISOString();
      historyData.notes = 'הספק הגיע למקום';
    } else if (newStatus === 'completed') {
      updateData.closed_at = new Date().toISOString();
      updateData.closed_by = vendorProfile?.vendor_name;
      historyData.notes = 'הקריאה הושלמה';
    }

    updateCallMutation.mutate(updateData);
    addHistoryMutation.mutate(historyData);

    if (statusMessages[newStatus]) {
      await sendStatusMessage(selectedCallId, statusMessages[newStatus]);
    }
  };

  const handleSaveNotes = () => {
    updateCallMutation.mutate({ vendor_notes: vendorNotes });
  };

  const handleSignatureSave = async (signatureDataUrl) => {
    setUploading(true);
    try {
      const response = await fetch(signatureDataUrl);
      const blob = await response.blob();
      const file = new File([blob], 'signature.png', { type: 'image/png' });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      const arrayBuffer = await blob.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const signatureHash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

      await base44.entities.CallPhoto.create({
        call_id: selectedCallId,
        uploaded_by: vendorProfile?.vendor_name || 'ספק',
        file_url,
        file_name: `חתימת לקוח | ${new Date().toLocaleString('he-IL')} | SHA256:${signatureHash.substring(0, 12)}`,
        category: 'customer_signature',
        is_deleted: false,
      });
      refreshPhotos();
      setShowSignatureDialog(false);
      showToast.success('החתימה נשמרה בהצלחה');
    } catch (error) {
      showToast.error('שגיאה בשמירת החתימה');
    } finally {
      setUploading(false);
    }
  };

  const handleCompleteCall = () => {
    const hasSignature = photos.some((p) => p.category === 'customer_signature');
    if (!hasSignature) {
      showToast.error('יש לקבל חתימת לקוח לפני סיום הקריאה');
      setShowSignatureDialog(true);
      return;
    }
    handleStatusUpdate('completed');
  };

  if (!selectedCallId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-16 h-16 mx-auto text-yellow-500 mb-4" />
            <h2 className="text-xl font-bold mb-2">לא נבחרה קריאה</h2>
            <p className="text-[#6B778C] mb-4">יש לבחור קריאה מהפורטל</p>
            <Link to={createPageUrl('VendorPortal')}>
              <Button className="bg-[#3b82f6]">חזרה לפורטל</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (callQuery.isLoading || vendorQuery.isLoading) {
    return <PageLoader text="טוען קריאה..." />;
  }

  if (!call) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
            <h2 className="text-xl font-bold mb-2">הקריאה לא נמצאה או שאין לך הרשאה לצפות בה</h2>
            <p className="text-[#6B778C] mb-4">ניתן לגשת רק לקריאות שהוקצו אליך</p>
            <Link to={createPageUrl('VendorPortal')}>
              <Button className="bg-[#3b82f6]">חזרה לפורטל</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isCompleted = call.call_status === 'completed';

  return (
    <div className="space-y-4 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="חזרה">
          <ArrowRight className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-[#172B4D]">קריאה {call.call_number}</h1>
          <p className="text-sm text-[#6B778C]">
            {issueTypeLabels[call.issue_type] || call.issue_type}
          </p>
        </div>
      </div>

      {/* Extracted components */}
      <VendorCallStatusProgress callStatus={call.call_status} />
      <VendorCallCustomerInfo call={call} />
      <VendorCallVehicleInfo call={call} />

      {/* Tabs for Journey, Photos, AI, Notes, Messages */}
      <Tabs defaultValue="journey" className="w-full">
        <TabsList className={`w-full grid ${isCompleted ? 'grid-cols-6' : 'grid-cols-5'} h-auto`}>
          <TabsTrigger value="journey" className="gap-1 text-xs sm:text-sm px-1 sm:px-3 py-2">
            <Route className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="hidden sm:inline">מסע לקוח</span>
            <span className="sm:hidden">מסע</span>
          </TabsTrigger>
          <TabsTrigger value="photos" className="gap-1 text-xs sm:text-sm px-1 sm:px-3 py-2">
            <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="hidden sm:inline">
              תמונות ({photos.filter((p) => !p.is_deleted).length})
            </span>
            <span className="sm:hidden">{photos.filter((p) => !p.is_deleted).length}📷</span>
          </TabsTrigger>
          <TabsTrigger value="ai" className="gap-1 text-xs sm:text-sm px-1 sm:px-3 py-2">
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="hidden sm:inline">ניתוח AI</span>
            <span className="sm:hidden">AI</span>
          </TabsTrigger>
          <TabsTrigger value="notes" className="gap-1 text-xs sm:text-sm px-1 sm:px-3 py-2">
            <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="hidden sm:inline">הערות</span>
            <span className="sm:hidden">הערות</span>
          </TabsTrigger>
          <TabsTrigger value="messages" className="gap-1 text-xs sm:text-sm px-1 sm:px-3 py-2">
            <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="hidden sm:inline">צ'אט</span>
            <span className="sm:hidden">צ'אט</span>
          </TabsTrigger>
          {isCompleted && (
            <TabsTrigger value="feedback" className="gap-1 text-xs sm:text-sm px-1 sm:px-3 py-2">
              ⭐ <span className="hidden sm:inline">משוב</span>
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="journey" className="mt-4">
          <VendorCustomerJourney callId={selectedCallId} call={call} />
        </TabsContent>

        <TabsContent value="photos" className="mt-4">
          <Card className="bg-white">
            <CardContent className="p-4">
              <VendorPhotoUploader
                callId={selectedCallId}
                vendorName={vendorProfile?.vendor_name}
                photos={photos}
                onPhotoAdded={() => refreshPhotos()}
                onPhotoDeleted={() => refreshPhotos()}
                disabled={isCompleted}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai" className="mt-4">
          <Card className="bg-white">
            <CardContent className="p-4">
              <VendorPhotoAIExtractor
                photos={photos}
                callId={selectedCallId}
                onDataExtracted={() => refreshPhotos()}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes" className="mt-4">
          <Card className="bg-white">
            <CardContent className="p-4 space-y-3">
              <Textarea
                value={vendorNotes}
                onChange={(e) => setVendorNotes(e.target.value)}
                placeholder="הערות לקריאה..."
                className="min-h-[120px]"
                disabled={isCompleted}
              />
              <Button
                onClick={handleSaveNotes}
                disabled={isCompleted || updateCallMutation.isPending}
                className="w-full"
              >
                {updateCallMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'שמור הערות'
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="messages" className="mt-4">
          <EnhancedCallChat
            callId={selectedCallId}
            currentUserRole="vendor"
            currentUserName={vendorProfile?.vendor_name || 'ספק'}
            height="400px"
          />
        </TabsContent>

        {isCompleted && (
          <TabsContent value="feedback" className="mt-4">
            <CallFeedbackForm
              callId={selectedCallId}
              callNumber={call?.call_number}
              customerName={call?.customer_name}
              customerPhone={call?.customer_phone}
              vendorId={vendorProfile?.id}
              vendorName={vendorProfile?.vendor_name}
              feedbackSource="vendor"
            />
          </TabsContent>
        )}
      </Tabs>

      {/* Fixed Action Buttons */}
      <VendorCallActionBar
        callStatus={call.call_status}
        onStatusUpdate={handleStatusUpdate}
        onSignature={() => setShowSignatureDialog(true)}
        onComplete={handleCompleteCall}
        isPending={updateCallMutation.isPending}
      />

      {/* Signature Dialog */}
      <Dialog open={showSignatureDialog} onOpenChange={setShowSignatureDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>חתימת לקוח</DialogTitle>
          </DialogHeader>
          <SignaturePad
            onSave={handleSignatureSave}
            onCancel={() => setShowSignatureDialog(false)}
            loading={uploading}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
