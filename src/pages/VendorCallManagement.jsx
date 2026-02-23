import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Phone,
  MapPin,
  Navigation,
  Clock,
  Camera,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Loader2,
  Car,
  User,
  FileText,
  Image,
  MessageSquare,
  Send,
  X,
  Upload,
  Pencil,
} from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { showToast } from '@/components/ui/FeedbackToast';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import SignaturePad from '@/components/signature/SignaturePad';
import EnhancedCallChat, { sendStatusMessage } from '@/components/chat/EnhancedCallChat';
import CallFeedbackForm from '@/components/feedback/CallFeedbackForm';

const issueTypeLabels = {
  mechanical: 'תקלה מכנית',
  stopped_driving: 'רכב לא נוסע',
  flat_tire: "פנצ'ר",
  stuck_wheel: 'גלגל תקוע',
  accident: 'תאונה',
  no_fuel: 'אין דלק',
  dead_battery: 'מצבר',
  locked_keys: 'מפתחות נעולים',
  other: 'אחר',
};

const statusSteps = [
  { key: 'assigned', label: 'שובץ', icon: CheckCircle },
  { key: 'vendor_enroute', label: 'בדרך', icon: Navigation },
  { key: 'in_progress', label: 'בטיפול', icon: Clock },
  { key: 'completed', label: 'הושלם', icon: CheckCircle },
];

const photoCategories = [
  { key: 'before_treatment', label: 'לפני טיפול' },
  { key: 'after_treatment', label: 'אחרי טיפול' },
  { key: 'damage', label: 'נזק' },
  { key: 'customer_document', label: 'מסמך לקוח' },
  { key: 'other', label: 'אחר' },
];

export default function VendorCallManagementPage() {
  const [currentUser, setCurrentUser] = useState(null);
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

  // Get call id from URL
  const [searchParams] = useSearchParams();
  useEffect(() => {
    const id = searchParams.get('id');
    if (id) setSelectedCallId(id);
  }, [searchParams]);

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

  // Get vendor profile
  const vendorQuery = useQuery({
    queryKey: ['vendorProfile', currentUser?.email],
    queryFn: async () => {
      const vendors = await base44.entities.Vendor.filter({ email: currentUser.email });
      if (vendors.length > 0) {
        setVendorProfile(vendors[0]);
        return vendors[0];
      }
      return null;
    },
    enabled: !!currentUser?.email,
  });

  // Get call details - verify ownership by vendor
  const callQuery = useQuery({
    queryKey: ['vendorCall', selectedCallId, vendorProfile?.id],
    queryFn: async () => {
      const calls = await base44.entities.Call.filter({ id: selectedCallId });
      if (calls.length > 0) {
        // Verify this call belongs to the logged-in vendor
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

  // Get call photos
  const photosQuery = useQuery({
    queryKey: ['callPhotos', selectedCallId],
    queryFn: () => base44.entities.CallPhoto.filter({ call_id: selectedCallId, is_deleted: false }),
    enabled: !!selectedCallId,
  });

  // Get call messages
  const messagesQuery = useQuery({
    queryKey: ['callMessages', selectedCallId],
    queryFn: () => base44.entities.Message.filter({ call_id: selectedCallId }, 'created_date'),
    enabled: !!selectedCallId,
  });

  // Update call mutation
  const updateCallMutation = useMutation({
    mutationFn: (data) => base44.entities.Call.update(selectedCallId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendorCall', selectedCallId] });
      showToast.success('הקריאה עודכנה בהצלחה');
    },
  });

  // Add photo mutation
  const addPhotoMutation = useMutation({
    mutationFn: (data) => base44.entities.CallPhoto.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['callPhotos', selectedCallId] });
      showToast.success('התמונה נוספה בהצלחה');
      setShowPhotoDialog(false);
    },
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: (data) => base44.entities.Message.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['callMessages', selectedCallId] });
    },
  });

  // Add history mutation
  const addHistoryMutation = useMutation({
    mutationFn: (data) => base44.entities.CallHistory.create(data),
  });

  const call = callQuery.data;
  const photos = photosQuery.data || [];
  const messages = messagesQuery.data || [];

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

    // Status messages for chat
    const statusMessages = {
      vendor_enroute: `הספק ${vendorProfile?.vendor_name || ''} יצא לדרך`,
      in_progress: 'הספק הגיע למקום ומתחיל בטיפול',
      completed: 'הטיפול הושלם בהצלחה!',
    };

    if (newStatus === 'vendor_enroute') {
      // Starting route
    } else if (newStatus === 'in_progress') {
      updateData.vendor_arrival_time_actual = new Date().toISOString();
      historyData.notes = 'הספק הגיע למקום';
    } else if (newStatus === 'completed') {
      updateData.closed_at = new Date().toISOString();
      updateData.closed_by = vendorProfile?.vendor_name;
      historyData.notes = 'הקריאה הושלמה';
    }

    updateCallMutation.mutate(updateData);
    addHistoryMutation.mutate(historyData);

    // Send automatic status update to chat
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
      // Convert data URL to blob
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
    // Check if signature exists
    const hasSignature = photos.some((p) => p.category === 'customer_signature');
    if (!hasSignature) {
      showToast.error('יש לקבל חתימת לקוח לפני סיום הקריאה');
      setShowSignatureDialog(true);
      return;
    }
    handleStatusUpdate('completed');
  };

  const getCurrentStepIndex = () => {
    if (!call) return 0;
    const statusMap = {
      assigned: 0,
      assigning: 0,
      vendor_enroute: 1,
      in_progress: 2,
      completed: 3,
    };
    return statusMap[call.call_status] ?? 0;
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

  const currentStep = getCurrentStepIndex();
  const isCompleted = call.call_status === 'completed';

  return (
    <div className="space-y-4 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowRight className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-[#172B4D]">קריאה {call.call_number}</h1>
          <p className="text-sm text-[#6B778C]">
            {issueTypeLabels[call.issue_type] || call.issue_type}
          </p>
        </div>
      </div>

      {/* Status Progress */}
      <Card className="bg-white">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            {statusSteps.map((step, idx) => {
              const Icon = step.icon;
              const isActive = idx === currentStep;
              const isDone = idx < currentStep;
              return (
                <React.Fragment key={step.key}>
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isDone
                          ? 'bg-green-500 text-white'
                          : isActive
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <span
                      className={`text-xs mt-1 ${isActive ? 'font-bold text-blue-600' : 'text-gray-500'}`}
                    >
                      {step.label}
                    </span>
                  </div>
                  {idx < statusSteps.length - 1 && (
                    <div
                      className={`flex-1 h-1 mx-2 ${idx < currentStep ? 'bg-green-500' : 'bg-gray-200'}`}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Customer & Location Info */}
      <Card className="bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="w-4 h-4" />
            פרטי לקוח ומיקום
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">{call.customer_name}</div>
              <div className="text-sm text-[#6B778C]" dir="ltr">
                {call.customer_phone}
              </div>
            </div>
            <a href={`tel:${call.customer_phone}`}>
              <Button size="sm" variant="outline" className="gap-1">
                <Phone className="w-4 h-4" />
                התקשר
              </Button>
            </a>
          </div>

          <div className="border-t pt-3">
            <div className="flex items-start gap-2 mb-2">
              <MapPin className="w-4 h-4 text-red-500 mt-0.5" />
              <div>
                <div className="text-sm font-medium">כתובת איסוף</div>
                <div className="text-sm text-[#6B778C]">{call.pickup_location_address}</div>
                {call.pickup_location_city && (
                  <div className="text-sm text-[#6B778C]">{call.pickup_location_city}</div>
                )}
              </div>
            </div>
            <a
              href={`https://waze.com/ul?ll=${call.pickup_location_lat},${call.pickup_location_lon}&navigate=yes`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button className="w-full bg-[#33ccff] hover:bg-[#00b8f0] text-black gap-2">
                <Navigation className="w-4 h-4" />
                נווט עם Waze
              </Button>
            </a>
          </div>

          {call.dropoff_location_address && (
            <div className="border-t pt-3">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-green-500 mt-0.5" />
                <div>
                  <div className="text-sm font-medium">כתובת יעד</div>
                  <div className="text-sm text-[#6B778C]">{call.dropoff_location_address}</div>
                  {call.dropoff_garage_name && (
                    <div className="text-sm text-[#6B778C]">מוסך: {call.dropoff_garage_name}</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Vehicle Info */}
      <Card className="bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Car className="w-4 h-4" />
            פרטי רכב
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-[#6B778C]">מספר רכב:</span>
              <div className="font-medium" dir="ltr">
                {call.vehicle_plate || '-'}
              </div>
            </div>
            <div>
              <span className="text-[#6B778C]">דגם:</span>
              <div className="font-medium">{call.vehicle_model || '-'}</div>
            </div>
            <div>
              <span className="text-[#6B778C]">סוג תקלה:</span>
              <div className="font-medium">
                {issueTypeLabels[call.issue_type] || call.issue_type}
              </div>
            </div>
            <div>
              <span className="text-[#6B778C]">דלק:</span>
              <div className="font-medium">{call.fuel_type || '-'}</div>
            </div>
          </div>
          {call.issue_description && (
            <div className="mt-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="text-sm font-medium text-yellow-800 mb-1">תיאור התקלה:</div>
              <div className="text-sm text-yellow-700">{call.issue_description}</div>
            </div>
          )}
        </CardContent>
      </Card>

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
                      <Badge className="absolute bottom-2 right-2 text-xs">
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
      {!isCompleted && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 flex gap-3">
          {call.call_status === 'assigned' || call.call_status === 'assigning' ? (
            <Button
              className="flex-1 bg-blue-600 hover:bg-blue-700 h-12"
              onClick={() => handleStatusUpdate('vendor_enroute')}
              disabled={updateCallMutation.isPending}
            >
              <Navigation className="w-5 h-5 ml-2" />
              יצאתי לדרך
            </Button>
          ) : call.call_status === 'vendor_enroute' ? (
            <Button
              className="flex-1 bg-green-600 hover:bg-green-700 h-12"
              onClick={() => handleStatusUpdate('in_progress')}
              disabled={updateCallMutation.isPending}
            >
              <CheckCircle className="w-5 h-5 ml-2" />
              הגעתי למקום
            </Button>
          ) : call.call_status === 'in_progress' ? (
            <>
              <Button
                variant="outline"
                className="flex-1 h-12"
                onClick={() => setShowSignatureDialog(true)}
              >
                <Pencil className="w-5 h-5 ml-2" />
                חתימת לקוח
              </Button>
              <Button
                className="flex-1 bg-orange-500 hover:bg-orange-600 h-12"
                onClick={handleCompleteCall}
                disabled={updateCallMutation.isPending}
              >
                <CheckCircle className="w-5 h-5 ml-2" />
                סיים קריאה
              </Button>
            </>
          ) : null}
        </div>
      )}

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

// Message Input Component
function MessageInput({ onSend, disabled }) {
  const [text, setText] = useState('');

  const handleSend = () => {
    if (!text.trim()) return;
    onSend(text);
    setText('');
  };

  return (
    <div className="flex gap-2">
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="כתוב הודעה..."
        disabled={disabled}
        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
      />
      <Button onClick={handleSend} disabled={disabled || !text.trim()} size="icon">
        <Send className="w-4 h-4" />
      </Button>
    </div>
  );
}