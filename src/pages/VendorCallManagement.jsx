import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { queryKeys } from '@/lib/queryKeys';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Camera,
  AlertCircle,
  ArrowRight,
  Loader2,
  FileText,
  Image,
  MessageSquare,
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

const photoCategories = [
  { key: 'before_treatment', label: 'לפני טיפול' },
  { key: 'after_treatment', label: 'אחרי טיפול' },
  { key: 'damage', label: 'נזק' },
  { key: 'customer_document', label: 'מסמך לקוח' },
  { key: 'other', label: 'אחר' },
];

export default function VendorCallManagementPage() {
  const { currentUser, effectiveRole } = usePermissions();
  const isVendorUser = effectiveRole === 'vendor';
  const [vendorProfile, setVendorProfile] = useState(null);
  const [selectedCallId, setSelectedCallId] = useState(null);
  const [showSignatureDialog, setShowSignatureDialog] = useState(false);
  const [showPhotoDialog, setShowPhotoDialog] = useState(false);
  const [vendorNotes, setVendorNotes] = useState('');
  const [photoCategory, setPhotoCategory] = useState('before_treatment');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
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

  // Call data: server-scoped for vendor users (ensures ownership), direct for admin
  const callQuery = useQuery({
    queryKey: [...queryKeys.vendors.call(selectedCallId, vendorProfile?.id), effectiveRole],
    queryFn: async () => {
      if (isVendorUser) {
        // Fetch only vendor's own calls via server-side filtering
        const result = await base44.functions.invoke('getVendorScopedData', {
          entity_type: 'calls',
          sort: '-created_date',
          limit: 1000,
        });
        const vendorCalls = result.data?.data || [];
        const call = vendorCalls.find((c) => c.id === selectedCallId);
        if (call) {
          setVendorNotes(call.vendor_notes || '');
          return call;
        }
        return null;
      }
      // Admin/operator: direct query with client-side ownership check
      const calls = await base44.entities.Call.filter({ id: selectedCallId });
      if (calls.length > 0) {
        if (vendorProfile && calls[0].assigned_vendor_id !== vendorProfile.id) {
          return null;
        }
        setVendorNotes(calls[0].vendor_notes || '');
        return calls[0];
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

  const addPhotoMutation = useMutation({
    mutationFn: (data) => base44.entities.CallPhoto.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.callPhotos.byCall(selectedCallId) });
      showToast.success('התמונה נוספה בהצלחה');
      setShowPhotoDialog(false);
    },
    onError: () => {
      showToast.error('שגיאה בהעלאת תמונה');
    },
  });

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
      completed: 'הטיפול הושלם בהצלחה!',
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

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      addPhotoMutation.mutate({
        call_id: selectedCallId,
        uploaded_by: vendorProfile?.vendor_name || 'ספק',
        file_url,
        file_name: file.name,
        file_size: file.size,
        category: photoCategory,
        is_deleted: false,
      });
    } catch (error) {
      showToast.error('שגיאה בהעלאת התמונה');
    } finally {
      setUploading(false);
    }
  };

  const handleSignatureSave = async (signatureDataUrl) => {
    setUploading(true);
    try {
      const response = await fetch(signatureDataUrl);
      const blob = await response.blob();
      const file = new File([blob], 'signature.png', { type: 'image/png' });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      addPhotoMutation.mutate({
        call_id: selectedCallId,
        uploaded_by: vendorProfile?.vendor_name || 'ספק',
        file_url,
        file_name: 'חתימת לקוח',
        category: 'customer_signature',
        is_deleted: false,
      });
      setShowSignatureDialog(false);
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

      {/* Tabs for Photos, Notes, Messages */}
      <Tabs defaultValue="photos" className="w-full">
        <TabsList className={`w-full grid ${isCompleted ? 'grid-cols-4' : 'grid-cols-3'}`}>
          <TabsTrigger value="photos" className="gap-1">
            <Image className="w-4 h-4" />
            תמונות ({photos.length})
          </TabsTrigger>
          <TabsTrigger value="notes" className="gap-1">
            <FileText className="w-4 h-4" />
            הערות
          </TabsTrigger>
          <TabsTrigger value="messages" className="gap-1">
            <MessageSquare className="w-4 h-4" />
            צ'אט
          </TabsTrigger>
          {isCompleted && (
            <TabsTrigger value="feedback" className="gap-1">
              ⭐ משוב
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="photos" className="mt-4">
          <Card className="bg-white">
            <CardContent className="p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium">תמונות</h3>
                <Button
                  size="sm"
                  onClick={() => setShowPhotoDialog(true)}
                  disabled={isCompleted}
                  className="gap-1"
                >
                  <Camera className="w-4 h-4" />
                  הוסף תמונה
                </Button>
              </div>
              {photos.length === 0 ? (
                <div className="text-center py-8 text-[#6B778C]">
                  <Camera className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>אין תמונות</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {photos.map((photo) => (
                    <div key={photo.id} className="relative">
                      <img
                        src={photo.file_url}
                        alt={photo.file_name}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      <Badge className="absolute bottom-2 end-2 text-xs">
                        {photoCategories.find((c) => c.key === photo.category)?.label ||
                          photo.category}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
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

      {/* Photo Upload Dialog */}
      <Dialog open={showPhotoDialog} onOpenChange={setShowPhotoDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>הוספת תמונה</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>קטגוריה</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {photoCategories.map((cat) => (
                  <Button
                    key={cat.key}
                    variant={photoCategory === cat.key ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPhotoCategory(cat.key)}
                  >
                    {cat.label}
                  </Button>
                ))}
              </div>
            </div>
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoUpload}
                ref={fileInputRef}
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="gap-2"
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
                {uploading ? 'מעלה...' : 'צלם או בחר תמונה'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
