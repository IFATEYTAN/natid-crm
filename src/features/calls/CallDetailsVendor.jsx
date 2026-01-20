import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/lib/api';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import StatusBadge from '@/components/ui/StatusBadge';
import NavigationMap from '@/components/maps/NavigationMap';
import LiveLocationTracker from '@/components/maps/LiveLocationTracker';
import { 
  ArrowRight,
  Phone,
  MapPin,
  Navigation,
  CheckCircle2,
  Clock,
  User,
  Car,
  AlertTriangle,
  MessageSquare,
  PlayCircle,
  StopCircle,
  Camera
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
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

export default function CallDetailsVendor() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [note, setNote] = useState('');
  const [distanceData, setDistanceData] = useState(null);

  const urlParams = new URLSearchParams(window.location.search);
  const callId = urlParams.get('id');

  const { data: call, isLoading } = useQuery({
    queryKey: ['call', callId],
    queryFn: () => base44.entities.Call.filter({ id: callId }),
    select: (data) => data[0],
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ['vendors'],
    queryFn: () => base44.entities.Vendor.list(),
  });

  const currentVendor = vendors.find(v => v.email === user?.email);

  // Import Chat
  const CallChat = React.lazy(() => import('@/components/chat/CallChat'));

  // Calculate distance and ETA
  useEffect(() => {
    const calculateDistance = async () => {
      if (call && currentVendor && call.pickup_location_lat && call.pickup_location_lon) {
        try {
          const result = await base44.functions.invoke('calculateDistanceAndETA', {
            callId: call.id,
            vendorId: currentVendor.id
          });
          setDistanceData(result.data);
        } catch (error) {
          console.error('Failed to calculate distance:', error);
        }
      }
    };
    calculateDistance();
  }, [call, currentVendor]);

  const updateStatusMutation = useMutation({
    mutationFn: async ({ status, additionalData = {} }) => {
      const updates = { 
        call_status: status,
        ...additionalData
      };
      
      await base44.entities.Call.update(callId, updates);
      
      // Log history
      await base44.entities.CallHistory.create({
        call_id: callId,
        call_number: call.call_number,
        change_type: 'status',
        old_value: call.call_status,
        new_value: status,
        notes: note || `הספק עדכן סטטוס ל-${status}`,
        changed_by: currentVendor?.vendor_name || user?.email
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['call', callId] });
      setNote('');
    },
  });

  const addNoteMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.CallHistory.create({
        call_id: callId,
        call_number: call.call_number,
        change_type: 'note',
        notes: note,
        changed_by: currentVendor?.vendor_name || user?.email
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['call', callId] });
      setNote('');
    },
  });

  const openNavigation = (address) => {
    const wazeUrl = `https://waze.com/ul?q=${encodeURIComponent(address)}`;
    window.open(wazeUrl, '_blank');
  };

  if (isLoading || !call) {
    return <div className="p-6">טוען...</div>;
  }

  // Security check - vendor can only see their own calls
  if (call.assigned_vendor_id !== currentVendor?.id) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-[#ED6C02] mx-auto mb-4" />
          <p className="text-xl text-[#616161]">אין לך הרשאה לצפות בקריאה זו</p>
        </div>
      </div>
    );
  }

  const canAccept = call.call_status === 'awaiting_assignment' || call.call_status === 'assigning';
  const canStart = call.call_status === 'vendor_enroute';
  const canComplete = call.call_status === 'in_progress';

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Live Location Tracker - Only when active */}
      {currentVendor && (call.call_status === 'vendor_enroute' || call.call_status === 'in_progress') && (
        <LiveLocationTracker 
          vendorId={currentVendor.id}
          autoStart={true}
          onLocationUpdate={() => {
            // Recalculate distance when location updates
            if (call?.id && currentVendor?.id) {
              base44.functions.invoke('calculateDistanceAndETA', {
                callId: call.id,
                vendorId: currentVendor.id
              }).then(result => setDistanceData(result.data)).catch(console.error);
            }
          }}
        />
      )}

      {/* Navigation Map */}
      {call?.pickup_location_lat && call?.pickup_location_lon && distanceData && (
        <NavigationMap
          vendorLocation={distanceData.vendorLocation}
          callLocation={{
            lat: call.pickup_location_lat,
            lon: call.pickup_location_lon,
            address: call.pickup_location_address
          }}
          distance={distanceData.roadDistance}
          duration={distanceData.duration}
          onNavigate={() => {
            window.open(distanceData.navigationUrl, '_blank');
          }}
        />
      )}

      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => navigate(-1)}
        >
          <ArrowRight className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-[#212121]">
            קריאה {call.call_number || `#${call.id?.slice(-6)}`}
          </h2>
          <p className="text-sm text-[#616161]">
            {call.created_date && format(parseISO(call.created_date), 'dd/MM/yyyy HH:mm', { locale: he })}
          </p>
        </div>
        <StatusBadge status={call.call_status} />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Button
          className="bg-[#0078D4] hover:bg-[#1976D2] text-white gap-2"
          onClick={() => openNavigation(call.pickup_location_address)}
        >
          <Navigation className="w-4 h-4" />
          ניווט
        </Button>

        {canAccept && (
          <Button
            className="bg-[#2E7D32] hover:bg-[#388E3C] text-white gap-2"
            onClick={() => updateStatusMutation.mutate({ 
              status: 'vendor_enroute',
              additionalData: { assigned_at: new Date().toISOString() }
            })}
            disabled={updateStatusMutation.isPending}
          >
            <CheckCircle2 className="w-4 h-4" />
            קיבלתי
          </Button>
        )}

        {canStart && (
          <Button
            className="bg-[#0288D1] hover:bg-[#0277BD] text-white gap-2"
            onClick={() => updateStatusMutation.mutate({ 
              status: 'in_progress',
              additionalData: { vendor_arrival_time_actual: new Date().toISOString() }
            })}
            disabled={updateStatusMutation.isPending}
          >
            <PlayCircle className="w-4 h-4" />
            הגעתי
          </Button>
        )}

        {canComplete && (
          <Button
            className="bg-[#388E3C] hover:bg-[#2E7D32] text-white gap-2"
            onClick={() => updateStatusMutation.mutate({ 
              status: 'completed',
              additionalData: { closed_at: new Date().toISOString() }
            })}
            disabled={updateStatusMutation.isPending}
          >
            <StopCircle className="w-4 h-4" />
            סיימתי
          </Button>
        )}

        <a href={`tel:${call.customer_phone}`}>
          <Button variant="outline" className="w-full gap-2">
            <Phone className="w-4 h-4" />
            התקשר ללקוח
          </Button>
        </a>
      </div>

      {/* Customer Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="w-4 h-4 text-[#0078D4]" />
            פרטי לקוח
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-[#616161]">שם</p>
              <p className="font-medium">{call.customer_name}</p>
            </div>
            <div>
              <p className="text-sm text-[#616161]">טלפון</p>
              <a href={`tel:${call.customer_phone}`} className="font-medium text-[#0078D4]">
                {call.customer_phone}
              </a>
            </div>
            {call.customer_response_code && (
              <div>
                <p className="text-sm text-[#616161]">קוד זיהוי</p>
                <p className="font-medium text-lg">{call.customer_response_code}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Vehicle Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Car className="w-4 h-4 text-[#0078D4]" />
            פרטי רכב
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-[#616161]">מספר רכב</p>
              <p className="font-medium">{call.vehicle_plate || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-[#616161]">דגם</p>
              <p className="font-medium">{call.vehicle_model || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-[#616161]">סוג רכב</p>
              <p className="font-medium">{call.vehicle_type || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-[#616161]">דלק</p>
              <p className="font-medium">{call.fuel_type || '-'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Location */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#0078D4]" />
            מיקום
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-[#616161] mb-1">כתובת איסוף</p>
            <p className="font-medium">{call.pickup_location_address}</p>
            {distanceData && (
              <div className="mt-3 space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#616161]">מרחק:</span>
                  <span className="font-medium">{distanceData.roadDistance} ק"מ</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#616161]">זמן נסיעה:</span>
                  <span className="font-medium">{distanceData.duration} דק'</span>
                </div>
              </div>
            )}
          </div>
          {call.dropoff_location_address && (
            <div>
              <p className="text-sm text-[#616161] mb-1">כתובת יעד</p>
              <p className="font-medium">{call.dropoff_location_address}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Problem */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#0078D4]" />
            תיאור התקלה
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-sm text-[#616161]">סוג תקלה</p>
            <p className="font-medium">{issueTypeLabels[call.issue_type] || call.issue_type}</p>
          </div>
          {call.issue_description && (
            <div>
              <p className="text-sm text-[#616161]">פרטים נוספים</p>
              <p className="font-medium">{call.issue_description}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Photos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Camera className="w-4 h-4 text-[#0078D4]" />
            תמונות מהשטח
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PhotoGallery callId={callId} vendorId={currentVendor?.id} />
        </CardContent>
      </Card>

      {/* Chat / Messages */}
      <React.Suspense fallback={<div>טוען צ'אט...</div>}>
        <CallChat 
          callId={callId} 
          currentUserRole="vendor" 
          currentUserName={currentVendor?.vendor_name || 'ספק'} 
        />
      </React.Suspense>
    </div>
  );
}

// Photo Gallery Component
function PhotoGallery({ callId, vendorId }) {
  const [uploading, setUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const queryClient = useQueryClient();

  const { data: photos = [] } = useQuery({
    queryKey: ['callPhotos', callId],
    queryFn: async () => {
      const data = await base44.entities.CallPhoto.filter({ call_id: callId, is_deleted: false });
      return data;
    },
  });

  const categoryLabels = {
    before_treatment: 'לפני טיפול',
    after_treatment: 'אחרי טיפול',
    damage: 'תקלה/נזק',
    customer_document: 'מסמך לקוח',
    customer_signature: 'חתימת לקוח',
    other: 'אחר'
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('הקובץ גדול מדי. מקסימום 10MB');
      return;
    }

    try {
      setUploading(true);
      
      // Upload file
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      // Prompt for category
      const category = prompt(
        'בחר קטגוריה:\n1. לפני טיפול\n2. אחרי טיפול\n3. תקלה/נזק\n4. מסמך לקוח\n5. חתימת לקוח\n6. אחר',
        '1'
      );
      
      const categoryMap = {
        '1': 'before_treatment',
        '2': 'after_treatment',
        '3': 'damage',
        '4': 'customer_document',
        '5': 'customer_signature',
        '6': 'other'
      };
      
      const selectedCategory = categoryMap[category] || 'other';
      const note = prompt('הערה (אופציונלי):');
      
      // Create photo record
      await base44.entities.CallPhoto.create({
        call_id: callId,
        uploaded_by: vendorId,
        file_url,
        file_name: file.name,
        file_size: Math.round(file.size / 1024),
        category: selectedCategory,
        note: note || ''
      });
      
      // Log to history
      await base44.entities.CallHistory.create({
        call_id: callId,
        change_type: 'other',
        notes: `הועלתה תמונה: ${categoryLabels[selectedCategory]}`,
        changed_by: vendorId
      });
      
      queryClient.invalidateQueries({ queryKey: ['callPhotos', callId] });
      alert('התמונה הועלתה בהצלחה');
    } catch (error) {
      alert('שגיאה בהעלאת תמונה');
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload Button */}
      <div>
        <input
          type="file"
          accept="image/*"
          id="photo-upload"
          className="hidden"
          onChange={handleFileUpload}
          disabled={uploading}
        />
        <label htmlFor="photo-upload">
          <Button 
            variant="outline" 
            className="gap-2 cursor-pointer"
            disabled={uploading}
            asChild
          >
            <span>
              <Camera className="w-4 h-4" />
              {uploading ? 'מעלה...' : 'הוסף תמונה'}
            </span>
          </Button>
        </label>
      </div>

      {/* Photo Grid */}
      {photos.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {photos.map(photo => (
            <div 
              key={photo.id}
              className="relative aspect-square rounded-lg overflow-hidden border border-[#E0E0E0] cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setSelectedImage(photo)}
            >
              <img 
                src={photo.file_url} 
                alt={photo.note || 'תמונה'} 
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                <p className="text-white text-xs font-medium">
                  {categoryLabels[photo.category]}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center text-[#616161] text-sm py-8">
          אין תמונות. לחץ 'הוסף תמונה' להעלאת תמונה ראשונה
        </p>
      )}

      {/* Image Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="max-w-4xl w-full bg-white rounded-lg overflow-hidden">
            <img 
              src={selectedImage.file_url} 
              alt={selectedImage.note || 'תמונה'}
              className="w-full max-h-[70vh] object-contain"
            />
            <div className="p-4">
              <p className="font-medium mb-1">{categoryLabels[selectedImage.category]}</p>
              {selectedImage.note && (
                <p className="text-sm text-[#616161] mb-2">{selectedImage.note}</p>
              )}
              <p className="text-xs text-[#9E9E9E]">
                {selectedImage.created_date && format(parseISO(selectedImage.created_date), 'dd/MM/yy HH:mm', { locale: he })}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}