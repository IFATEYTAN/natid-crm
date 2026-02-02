import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { createPageUrl, formatDateTime } from '@/components/utils';
import { useCall, useUpdateCall } from '@/components/hooks/useCalls';
import { useVendors } from '@/components/hooks/useVendors';
import { QueryStateWrapper } from '@/components/layout/QueryStateWrapper';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { usePermissions } from '@/components/permissions/PermissionsContext';
import { PermissionGuard, PermissionButton } from '@/components/permissions/PermissionGuard';
import { useAuditLog } from '@/components/hooks/useAuditLog';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import FileUploader from '@/components/files/FileUploader';
import SignaturePad from '@/components/signature/SignaturePad';
import EnhancedCallChat, { sendStatusMessage } from '@/components/chat/EnhancedCallChat';
import CallFeedbackForm from '@/components/feedback/CallFeedbackForm';
import VendorLiveMap from '@/components/maps/VendorLiveMap';
import CallSummaryEditor from '@/components/call/CallSummaryEditor';
import {
  ArrowRight,
  User,
  Car,
  MapPin,
  Phone,
  Clock,
  Truck,
  FileText,
  Camera,
  MessageSquare,
  History,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Pencil,
  Save,
  Loader2,
  PenTool,
  Headset,
  Navigation,
  Star,
  Send,
  Copy,
  ExternalLink
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { toast } from 'sonner';

const statusLabels = {
  waiting_treatment: 'ממתין לטיפול',
  awaiting_assignment: 'ממתין לשיבוץ',
  assigning: 'בתהליך שיבוץ',
  vendor_enroute: 'ספק בדרך',
  in_progress: 'בטיפול',
  completed: 'הושלם',
  cancelled: 'בוטל'
};

const statusColors = {
  waiting_treatment: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  awaiting_assignment: 'bg-orange-100 text-orange-800 border-orange-300',
  assigning: 'bg-blue-100 text-blue-800 border-blue-300',
  vendor_enroute: 'bg-indigo-100 text-indigo-800 border-indigo-300',
  in_progress: 'bg-purple-100 text-purple-800 border-purple-300',
  completed: 'bg-green-100 text-green-800 border-green-300',
  cancelled: 'bg-gray-100 text-gray-800 border-gray-300'
};

const issueTypeLabels = {
  mechanical: 'תקלה מכנית',
  stopped_driving: 'הפסקת נסיעה',
  flat_tire: 'פנצ\'ר',
  stuck_wheel: 'גלגל תקוע',
  accident: 'תאונה',
  no_fuel: 'אין דלק',
  dead_battery: 'מצבר ריק',
  locked_keys: 'מפתחות נעולים',
  other: 'אחר'
};

export default function CallDetailsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const callId = searchParams.get('id');
  const queryClient = useQueryClient();
  
  const [showSignature, setShowSignature] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackToken, setFeedbackToken] = useState(null);
  const [sendingSurvey, setSendingSurvey] = useState(false);

  // Permission & Audit
  const { currentUser, hasPermission } = usePermissions();
  const { logStatusChange, logAssign, logUpdate } = useAuditLog();
  
  const canEdit = hasPermission('calls', 'edit');
  const canAssign = hasPermission('calls', 'assign');
  const canDelete = hasPermission('calls', 'delete');

  const callQuery = useCall(callId);
  const vendorsQuery = useVendors();
  const updateCall = useUpdateCall();

  const call = callQuery.data?.[0];
  const vendors = vendorsQuery.data || [];
  const availableVendors = vendors.filter(v => v.is_available_now && v.is_active);

  // Fetch photos for this call
  const { data: photos = [] } = useQuery({
    queryKey: ['callPhotos', callId],
    queryFn: () => base44.entities.CallPhoto.filter({ call_id: callId }),
    enabled: !!callId
  });

  // Fetch history for this call
  const { data: history = [] } = useQuery({
    queryKey: ['callHistory', callId],
    queryFn: () => base44.entities.CallHistory.filter({ call_id: callId }, '-created_date'),
    enabled: !!callId
  });

  const handleStatusChange = async (newStatus) => {
    if (!canEdit) return;
    
    const updates = { call_status: newStatus };
    
    if (newStatus === 'completed') {
      updates.closed_at = new Date().toISOString();
    }
    
    updateCall.mutate({ id: callId, data: updates });

    // Log to audit
    logStatusChange('Call', callId, call?.call_number, call?.call_status, newStatus);

    // Generate summary when call is completed
    if (newStatus === 'completed') {
      try {
        await base44.functions.invoke('generateCallSummary', { call_id: callId });
      } catch (e) {
        console.log('Auto summary generation failed:', e);
      }
    }
    
    // Log history
    base44.entities.CallHistory.create({
      call_id: callId,
      call_number: call?.call_number,
      change_type: 'status',
      old_value: call?.call_status,
      new_value: newStatus,
      changed_by: currentUser?.full_name || 'operator'
    });

    // Send automatic status update to chat
    const statusMessages = {
      vendor_enroute: 'הספק יצא לדרך ובקרוב יגיע אליך',
      in_progress: 'הספק הגיע ומתחיל בטיפול',
      completed: 'הטיפול הושלם בהצלחה!'
    };
    
    if (statusMessages[newStatus]) {
      await sendStatusMessage(callId, statusMessages[newStatus]);
    }

    // Show feedback form when completed
    if (newStatus === 'completed') {
      setShowFeedback(true);
    }
  };

  const handleAssignVendor = () => {
    if (!selectedVendor || !canAssign) return;
    
    const vendor = vendors.find(v => v.id === selectedVendor);
    
    updateCall.mutate({
      id: callId,
      data: {
        assigned_vendor_id: selectedVendor,
        assigned_vendor_name: vendor?.vendor_name,
        assigned_at: new Date().toISOString(),
        call_status: 'assigning'
      }
    });

    // Log to audit
    logAssign('Call', callId, call?.call_number, vendor?.vendor_name);

    // Log history
    base44.entities.CallHistory.create({
      call_id: callId,
      call_number: call?.call_number,
      change_type: 'vendor_assignment',
      new_value: vendor?.vendor_name,
      changed_by: currentUser?.full_name || 'operator'
    });

    setShowAssignDialog(false);
    toast.success(`הקריאה שובצה ל-${vendor?.vendor_name}`);
  };

  const handleSignatureSaved = (signatureUrl) => {
    setShowSignature(false);
    queryClient.invalidateQueries({ queryKey: ['callPhotos', callId] });
    toast.success('החתימה נשמרה בהצלחה');
  };

  // Send customer feedback survey
  const handleSendSurvey = async () => {
    setSendingSurvey(true);
    try {
      const response = await base44.functions.invoke('sendFeedbackSMS', { call_id: callId });
      if (response.data?.success) {
        setFeedbackToken(response.data.token);
        toast.success('סקר נשלח ללקוח בהצלחה!');
      } else {
        toast.error(response.data?.error || 'שגיאה בשליחת הסקר');
      }
    } catch (e) {
      toast.error('שגיאה בשליחת הסקר');
    } finally {
      setSendingSurvey(false);
    }
  };

  const handleCreateSurveyLink = async () => {
    setSendingSurvey(true);
    try {
      const response = await base44.functions.invoke('createFeedbackToken', { call_id: callId });
      if (response.data?.token) {
        setFeedbackToken(response.data.token);
        toast.success('קישור לסקר נוצר בהצלחה');
      }
    } catch (e) {
      toast.error('שגיאה ביצירת הקישור');
    } finally {
      setSendingSurvey(false);
    }
  };

  const copyFeedbackLink = () => {
    const link = `${window.location.origin}/CustomerFeedback?token=${feedbackToken}`;
    navigator.clipboard.writeText(link);
    toast.success('הקישור הועתק');
  };

  const handleFilesUploaded = (files) => {
    queryClient.invalidateQueries({ queryKey: ['callPhotos', callId] });
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
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate(-1)}
            >
              <ArrowRight className="w-5 h-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-[#172B4D]">
                  קריאה {call?.call_number || `#${callId?.slice(-6)}`}
                </h1>
                <Badge className={cn("text-sm", statusColors[call?.call_status])}>
                  {statusLabels[call?.call_status]}
                </Badge>
              </div>
              <p className="text-[#6B778C] text-sm">
                נפתחה ב-{formatDateTime(call?.created_date)}
              </p>
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
                      <DialogDescription>
                        בחר ספק זמין לטיפול בקריאה
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                      <Label>ספק</Label>
                      <Select value={selectedVendor} onValueChange={setSelectedVendor}>
                        <SelectTrigger>
                          <SelectValue placeholder="בחר ספק" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableVendors.map(vendor => (
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
                  <Select 
                    value={call?.call_status} 
                    onValueChange={handleStatusChange}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(statusLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
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
            <TabsTrigger value="files">קבצים ({photos.length})</TabsTrigger>
            <TabsTrigger value="history">היסטוריה</TabsTrigger>
            {call?.call_status === 'completed' && (
              <>
                <TabsTrigger value="summary">סיכום</TabsTrigger>
                <TabsTrigger value="feedback">משוב</TabsTrigger>
              </>
            )}
          </TabsList>

          <TabsContent value="details" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Customer Info */}
              <Card className="bg-white">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <User className="w-4 h-4 text-[#6B778C]" />
                    פרטי לקוח
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-[#6B778C]">שם</Label>
                      <p className="font-medium">{call?.customer_name || '-'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-[#6B778C]">טלפון</Label>
                      <p className="font-medium" dir="ltr">{call?.customer_phone || '-'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-[#6B778C]">ביטוח</Label>
                      <p className="font-medium">{call?.insurance_company || '-'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-[#6B778C]">חבילה</Label>
                      <p className="font-medium">{call?.membership_package || '-'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Vehicle Info */}
              <Card className="bg-white">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Car className="w-4 h-4 text-[#6B778C]" />
                    פרטי רכב
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-[#6B778C]">מספר רכב</Label>
                      <p className="font-medium" dir="ltr">{call?.vehicle_plate || '-'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-[#6B778C]">דגם</Label>
                      <p className="font-medium">{call?.vehicle_model || '-'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-[#6B778C]">סוג תקלה</Label>
                      <p className="font-medium">{issueTypeLabels[call?.issue_type] || call?.issue_type || '-'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-[#6B778C]">תיאור</Label>
                      <p className="text-sm">{call?.issue_description || '-'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Location */}
              <Card className="bg-white">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#6B778C]" />
                    מיקום
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-xs text-[#6B778C]">כתובת איסוף</Label>
                    <p className="font-medium">{call?.pickup_location_address || '-'}</p>
                    <p className="text-sm text-[#6B778C]">{call?.pickup_location_city}</p>
                  </div>
                  {call?.dropoff_location_address && (
                    <div>
                      <Label className="text-xs text-[#6B778C]">כתובת יעד</Label>
                      <p className="font-medium">{call?.dropoff_location_address}</p>
                      <p className="text-sm text-[#6B778C]">{call?.dropoff_location_city}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Assigned Vendor */}
              <Card className="bg-white">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Truck className="w-4 h-4 text-[#6B778C]" />
                    ספק משובץ
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {call?.assigned_vendor_name ? (
                    <div className="space-y-2">
                      <p className="font-medium text-lg">{call.assigned_vendor_name}</p>
                      <p className="text-sm text-[#6B778C]">
                        שובץ ב-{formatDateTime(call.assigned_at)}
                      </p>
                      {call.vendor_notes && (
                        <p className="text-sm bg-[#F4F5F7] p-2 rounded">
                          {call.vendor_notes}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-[#6B778C]">
                      <Truck className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p>טרם שובץ ספק</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Signature Section - Show for completed or near completion */}
            {(call?.call_status === 'in_progress' || call?.call_status === 'completed') && (
              <Card className="bg-white">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <PenTool className="w-4 h-4 text-[#6B778C]" />
                    חתימת לקוח
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {showSignature ? (
                    <SignaturePad
                      callId={callId}
                      onSave={handleSignatureSaved}
                      onCancel={() => setShowSignature(false)}
                    />
                  ) : (
                    <div className="text-center py-6">
                      {photos.some(p => p.category === 'customer_signature') ? (
                        <div>
                          <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-2" />
                          <p className="text-green-600 font-medium">חתימה קיימת</p>
                        </div>
                      ) : (
                        <>
                          <PenTool className="w-10 h-10 mx-auto mb-2 text-[#6B778C] opacity-50" />
                          <p className="text-[#6B778C] mb-4">טרם נחתם</p>
                          <Button onClick={() => setShowSignature(true)} className="gap-2">
                            <PenTool className="w-4 h-4" />
                            הוסף חתימה
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="map">
            <div className="space-y-4">
              {call?.assigned_vendor_id ? (
                <VendorLiveMap
                  vendorId={call.assigned_vendor_id}
                  callId={callId}
                  pickupLat={call.pickup_location_lat}
                  pickupLon={call.pickup_location_lon}
                  showHistory={call.call_status === 'completed'}
                  height="500px"
                />
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <EnhancedCallChat
                  callId={callId}
                  currentUserRole="operator"
                  currentUserName={currentUser?.full_name || 'מוקדן'}
                  height="500px"
                />
              </div>
              <div className="space-y-4">
                <Card className="bg-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">שלח עדכון ללקוח</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full justify-start gap-2"
                      onClick={() => sendStatusMessage(callId, 'הקריאה התקבלה ואנחנו מטפלים בה')}
                    >
                      <MessageSquare className="w-4 h-4" />
                      קריאה התקבלה
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full justify-start gap-2"
                      onClick={() => sendStatusMessage(callId, 'הספק בדרך אליך!')}
                    >
                      <Truck className="w-4 h-4" />
                      ספק בדרך
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full justify-start gap-2"
                      onClick={() => sendStatusMessage(callId, 'הספק הגיע למיקום')}
                    >
                      <CheckCircle className="w-4 h-4" />
                      ספק הגיע
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full justify-start gap-2"
                      onClick={() => sendStatusMessage(callId, 'הטיפול הושלם בהצלחה!')}
                    >
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      טיפול הושלם
                    </Button>
                  </CardContent>
                </Card>

                <Card className="bg-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">משתתפים בשיחה</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                        <Headset className="w-3 h-3 text-white" />
                      </div>
                      <span>מוקדן</span>
                    </div>
                    {call?.assigned_vendor_name && (
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                          <Truck className="w-3 h-3 text-white" />
                        </div>
                        <span>{call.assigned_vendor_name}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center">
                        <User className="w-3 h-3 text-white" />
                      </div>
                      <span>{call?.customer_name}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="files">
            <Card className="bg-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Camera className="w-4 h-4 text-[#6B778C]" />
                  קבצים ותמונות
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* File Uploader */}
                <FileUploader
                  callId={callId}
                  onUploadComplete={handleFilesUploaded}
                />

                {/* Existing Files */}
                {photos.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3">קבצים קיימים ({photos.length})</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {photos.map(photo => (
                        <div key={photo.id} className="relative group">
                          <a href={photo.file_url} target="_blank" rel="noopener noreferrer">
                            <div className="aspect-square rounded-lg overflow-hidden bg-[#F4F5F7] border border-[#DFE1E6]">
                              {photo.file_url?.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                <img 
                                  src={photo.file_url} 
                                  alt={photo.file_name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <FileText className="w-8 h-8 text-[#6B778C]" />
                                </div>
                              )}
                            </div>
                          </a>
                          <p className="text-xs text-[#6B778C] mt-1 truncate">
                            {photo.file_name || photo.category}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card className="bg-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <History className="w-4 h-4 text-[#6B778C]" />
                  היסטוריית שינויים
                </CardTitle>
              </CardHeader>
              <CardContent>
                {history.length === 0 ? (
                  <div className="text-center py-8 text-[#6B778C]">
                    <History className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p>אין היסטוריה עדיין</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {history.map((item, idx) => (
                      <div key={item.id} className="flex gap-4 pb-4 border-b border-[#F4F5F7] last:border-0">
                        <div className="w-2 h-2 rounded-full bg-[#6B778C] mt-2" />
                        <div className="flex-1">
                          <p className="text-sm">
                            <span className="font-medium">{item.change_type === 'status' ? 'שינוי סטטוס' : item.change_type === 'vendor_assignment' ? 'שיבוץ ספק' : item.change_type}</span>
                            {item.old_value && item.new_value && (
                              <span className="text-[#6B778C]">
                                {' '}מ-{statusLabels[item.old_value] || item.old_value} ל-{statusLabels[item.new_value] || item.new_value}
                              </span>
                            )}
                            {!item.old_value && item.new_value && (
                              <span className="text-[#6B778C]">: {item.new_value}</span>
                            )}
                          </p>
                          <p className="text-xs text-[#6B778C] mt-1">
                            {formatDateTime(item.created_date)} • {item.changed_by}
                          </p>
                          {item.notes && (
                            <p className="text-sm text-[#6B778C] mt-1">{item.notes}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {call?.call_status === 'completed' && (
            <TabsContent value="summary">
              <div className="max-w-2xl mx-auto">
                <CallSummaryEditor
                  callId={callId}
                  callNumber={call?.call_number}
                  summaryDraft={call?.summary_draft}
                  summaryFinal={call?.summary_final}
                  onSummaryGenerated={() => {
                    queryClient.invalidateQueries({ queryKey: ['call', callId] });
                  }}
                />
              </div>
            </TabsContent>
          )}

          {call?.call_status === 'completed' && (
            <TabsContent value="feedback">
              <div className="max-w-2xl mx-auto space-y-6">
                {/* Customer Survey Section */}
                <Card className="bg-white border-2 border-blue-100">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Star className="w-4 h-4 text-yellow-500" />
                      סקר שביעות רצון ללקוח
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {call?.customer_rating ? (
                      <div className="text-center py-4">
                        <div className="flex justify-center gap-1 mb-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={cn(
                                "w-8 h-8",
                                star <= call.customer_rating 
                                  ? "text-yellow-400 fill-yellow-400" 
                                  : "text-gray-300"
                              )}
                            />
                          ))}
                        </div>
                        <p className="text-green-600 font-medium">הלקוח כבר דירג את השירות</p>
                        {call.customer_feedback && (
                          <p className="text-gray-600 mt-2 p-3 bg-gray-50 rounded-lg text-sm">
                            "{call.customer_feedback}"
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <p className="text-sm text-gray-600">
                          שלח ללקוח קישור לסקר קצר לדירוג השירות
                        </p>
                        
                        {feedbackToken ? (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
                              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                              <span className="text-sm text-green-700">קישור לסקר נוצר בהצלחה!</span>
                            </div>
                            
                            <div className="flex gap-2">
                              <Button 
                                variant="outline" 
                                className="flex-1 gap-2"
                                onClick={copyFeedbackLink}
                              >
                                <Copy className="w-4 h-4" />
                                העתק קישור
                              </Button>
                              <Button 
                                variant="outline"
                                className="gap-2"
                                onClick={() => window.open(`/CustomerFeedback?token=${feedbackToken}`, '_blank')}
                              >
                                <ExternalLink className="w-4 h-4" />
                                תצוגה מקדימה
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col sm:flex-row gap-3">
                            <Button 
                              onClick={handleSendSurvey}
                              disabled={sendingSurvey || !call?.customer_phone}
                              className="flex-1 gap-2 bg-blue-600 hover:bg-blue-700"
                            >
                              {sendingSurvey ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Send className="w-4 h-4" />
                              )}
                              שלח SMS ללקוח
                            </Button>
                            <Button 
                              variant="outline"
                              onClick={handleCreateSurveyLink}
                              disabled={sendingSurvey}
                              className="flex-1 gap-2"
                            >
                              צור קישור בלבד
                            </Button>
                          </div>
                        )}
                        
                        {!call?.customer_phone && (
                          <p className="text-xs text-orange-600">
                            * לא ניתן לשלוח SMS - חסר מספר טלפון של הלקוח
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Operator Feedback Form */}
                <CallFeedbackForm
                  callId={callId}
                  callNumber={call?.call_number}
                  customerName={call?.customer_name}
                  customerPhone={call?.customer_phone}
                  vendorId={call?.assigned_vendor_id}
                  vendorName={call?.assigned_vendor_name}
                  feedbackSource="operator"
                  onSubmitSuccess={() => {
                    queryClient.invalidateQueries({ queryKey: ['call', callId] });
                  }}
                />
              </div>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </QueryStateWrapper>
  );
}