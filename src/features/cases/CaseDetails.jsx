import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { base44 } from '@/lib/api';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import StatusBadge from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import confetti from 'canvas-confetti';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowRight,
  User,
  Car,
  MapPin,
  Wrench,
  Clock,
  Phone,
  Truck,
  CheckCircle2,
  AlertTriangle,
  Edit,
  Loader2,
  Navigation,
} from 'lucide-react';
import NavigationMap from '@/components/maps/NavigationMap';
import VendorRecommendation from '@/components/ai/VendorRecommendation';
import PredictionBadge from '@/components/ai/PredictionBadge';
import { format, parseISO } from 'date-fns';
import { he } from 'date-fns/locale';
import { triggerNotification } from '@/components/NotificationsUtils';
import CallChat from '@/components/chat/CallChat';
import { serviceTypeLabels, vehicleTypeLabels } from '@/config/labels';
import { usePermissions } from '@/components/permissions/PermissionsContext';
import { toast } from 'sonner';

const statusOptions = [
  { value: 'new', label: 'חדש' },
  { value: 'assigned', label: 'שובץ' },
  { value: 'en_route', label: 'בדרך' },
  { value: 'on_site', label: 'באתר' },
  { value: 'in_progress', label: 'בטיפול' },
  { value: 'completed', label: 'הושלם' },
  { value: 'cancelled', label: 'בוטל' },
];

export default function CaseDetails() {
  const urlParams = new URLSearchParams(window.location.search);
  const caseId = urlParams.get('id');

  const queryClient = useQueryClient();
  const { currentUser } = usePermissions();
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editData, setEditData] = useState({});
  const [noteText, setNoteText] = useState('');
  const [distanceData, setDistanceData] = useState(null);

  const { data: caseData, isLoading } = useQuery({
    queryKey: queryKeys.cases.single(caseId),
    queryFn: async () => {
      const cases = await base44.entities.Case.filter({ id: caseId });
      return cases[0];
    },
    enabled: !!caseId,
  });

  const { data: providers = [] } = useQuery({
    queryKey: queryKeys.serviceProviders.available(),
    queryFn: () => base44.entities.ServiceProvider.filter({ status: 'available' }),
  });

  const { data: activities = [] } = useQuery({
    queryKey: queryKeys.cases.activities(caseId),
    queryFn: () => base44.entities.CaseActivity.filter({ case_id: caseId }, '-created_date', 50),
    enabled: !!caseId,
  });

  // Fetch vendor location if assigned
  const { data: vendorLocation } = useQuery({
    queryKey: queryKeys.vendors.singleLocation(caseData?.assigned_provider_id),
    queryFn: async () => {
      const locations = await base44.entities.VendorLocation.filter(
        { vendor_id: caseData.assigned_provider_id },
        '-created_date',
        1
      );
      return locations[0];
    },
    enabled: !!caseData?.assigned_provider_id,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Calculate distance when vendor is assigned
  useEffect(() => {
    const calculateDistance = async () => {
      if (caseData?.assigned_provider_id && caseData?.location_lat && caseData?.location_lng) {
        try {
          const result = await base44.functions.invoke('calculateDistanceAndETA', {
            callId: caseData.id,
            vendorId: caseData.assigned_provider_id,
          });
          setDistanceData(result.data);
        } catch (error) {
          console.error('Failed to calculate distance:', error);
        }
      }
    };
    calculateDistance();
  }, [caseData?.assigned_provider_id, caseData?.location_lat, caseData?.location_lng]);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Case.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cases.single(caseId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.cases.all() });
      setIsEditMode(false);
    },
    onError: () => {
      toast.error('שגיאה בעדכון הקריאה');
    },
  });

  const addActivityMutation = useMutation({
    mutationFn: (data) => base44.entities.CaseActivity.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cases.activities(caseId) });
    },
    onError: () => {
      toast.error('שגיאה בהוספת פעילות');
    },
  });

  const handleStatusChange = async (newStatus) => {
    const previousStatus = caseData.status;
    const updates = { status: newStatus };

    if (newStatus === 'completed' && !caseData.completed_at) {
      updates.completed_at = new Date().toISOString();
    }

    if (newStatus === 'on_site' && !caseData.arrived_at) {
      updates.arrived_at = new Date().toISOString();
      // Check SLA
      if (caseData.sla_arrival_deadline) {
        updates.sla_arrival_met = new Date() <= new Date(caseData.sla_arrival_deadline);
      }
    }

    try {
      await updateMutation.mutateAsync({ id: caseId, data: updates });

      await addActivityMutation.mutateAsync({
        case_id: caseId,
        case_number: caseData.case_number,
        activity_type: 'status_change',
        description: `סטטוס שונה מ-${previousStatus} ל-${newStatus}`,
        previous_value: previousStatus,
        new_value: newStatus,
      });
    } catch {
      return;
    }

    // Trigger Notification
    await triggerNotification(
      'call_status_change',
      {
        call_number: caseData.case_number || caseId.substring(0, 8),
        customer_name: caseData.customer_name,
        status: newStatus,
        old_status: previousStatus,
        link: `/CaseDetails?id=${caseId}`,
        id: caseId,
        entityType: 'case',
      },
      currentUser
    );

    // Send SMS notification to customer
    try {
      const smsMessages = {
        assigned: 'הקריאה שלך שובצה לטיפול. הספק בדרך אליך.',
        en_route: 'הספק בדרך למיקומך. זמן הגעה משוער: 20-30 דקות.',
        on_site: 'הספק הגיע למיקום.',
        completed: 'הטיפול הושלם. תודה שבחרת בנתי שירותי דרך!',
      };

      if (smsMessages[newStatus] && caseData?.caller_phone) {
        await base44.functions.invoke('sendSMS', {
          phone: caseData.caller_phone,
          message: smsMessages[newStatus],
          callId: caseId,
        });
      }
    } catch (smsError) {
      console.error('SMS not sent:', smsError.message);
    }
  };

  const handleAssignProvider = async (providerId) => {
    const provider = providers.find((p) => p.id === providerId);
    if (!provider) return;

    const updates = {
      assigned_provider_id: providerId,
      assigned_provider_name: provider.name,
      assigned_at: new Date().toISOString(),
      status: 'assigned',
    };

    // Check response SLA
    if (caseData.sla_response_deadline) {
      updates.sla_response_met = new Date() <= new Date(caseData.sla_response_deadline);
    }

    try {
      await updateMutation.mutateAsync({ id: caseId, data: updates });

      await addActivityMutation.mutateAsync({
        case_id: caseId,
        case_number: caseData.case_number,
        activity_type: 'assigned',
        description: `שובץ לנותן שירות: ${provider.name}`,
      });
    } catch {
      return;
    }

    // Trigger Notification
    await triggerNotification(
      'call_assigned',
      {
        call_number: caseData.case_number || caseId.substring(0, 8),
        customer_name: caseData.customer_name,
        provider_name: provider.name,
        link: `/CaseDetails?id=${caseId}`,
        id: caseId,
        entityType: 'case',
      },
      currentUser
    );

    // Update provider status
    await base44.entities.ServiceProvider.update(providerId, { status: 'busy' });

    // Celebration confetti!
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#FF0000', '#FFD700', '#00FF00'],
    });

    setTimeout(() => {
      confetti({
        particleCount: 50,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#FF0000', '#FFD700'],
      });
      confetti({
        particleCount: 50,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#FF0000', '#FFD700'],
      });
    }, 250);

    setIsAssignDialogOpen(false);
  };

  const handleAddNote = async () => {
    if (!noteText.trim()) return;

    try {
      await addActivityMutation.mutateAsync({
        case_id: caseId,
        case_number: caseData.case_number,
        activity_type: 'note',
        description: noteText,
      });
      setNoteText('');
    } catch {
      // Error handled by mutation onError
    }
  };

  const handleSaveEdit = () => {
    updateMutation.mutate({ id: caseId, data: editData });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 mx-auto text-[#ED6C02] mb-4" />
        <p className="text-[#616161]">קריאה לא נמצאה</p>
        <Link to={createPageUrl('Cases')}>
          <Button variant="outline" className="mt-4">
            חזרה לקריאות
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to={createPageUrl('Cases')}>
            <Button variant="ghost" size="icon" aria-label="חזרה">
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-[#212121]">
                {caseData.case_number || `#${caseData.id?.slice(-6)}`}
              </h2>
              <StatusBadge status={caseData.status} />
              {caseData.priority && caseData.priority !== 'normal' && (
                <StatusBadge status={caseData.priority} />
              )}
            </div>
            <p className="text-[#616161] text-sm">
              {serviceTypeLabels[caseData.service_type]} - {caseData.customer_name}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <Select value={caseData.status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-full sm:w-36">
              <SelectValue placeholder="שנה סטטוס" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {!caseData.assigned_provider_id &&
            caseData.status !== 'completed' &&
            caseData.status !== 'cancelled' && (
              <Button
                className="bg-[#0D47A1] hover:bg-[#1565C0] w-full sm:w-auto"
                onClick={() => setIsAssignDialogOpen(true)}
              >
                <Truck className="w-4 h-4 ms-2" />
                <span className="hidden sm:inline">שבץ נותן שירות</span>
                <span className="sm:hidden">שבץ ספק</span>
              </Button>
            )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer & Contact */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="w-4 h-4 text-[#212121]" />
                פרטי לקוח ומתקשר
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-[#9E9E9E]">לקוח</p>
                  <p className="font-medium">{caseData.customer_name}</p>
                </div>
                <div>
                  <p className="text-xs text-[#9E9E9E]">מתקשר</p>
                  <p className="font-medium">{caseData.caller_name}</p>
                </div>
                <div>
                  <p className="text-xs text-[#9E9E9E]">טלפון</p>
                  <a
                    href={`tel:${caseData.caller_phone}`}
                    className="font-medium text-[#0D47A1] flex items-center gap-1"
                  >
                    <Phone className="w-3 h-3" />
                    {caseData.caller_phone}
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Vehicle */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Car className="w-4 h-4 text-[#212121]" />
                פרטי רכב
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-[#9E9E9E]">מספר רכב</p>
                  <p className="font-medium">{caseData.vehicle_number || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-[#9E9E9E]">סוג</p>
                  <p className="font-medium">{vehicleTypeLabels[caseData.vehicle_type] || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-[#9E9E9E]">דגם</p>
                  <p className="font-medium">{caseData.vehicle_model || '-'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Location */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#212121]" />
                מיקום
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-[#9E9E9E]">מיקום נוכחי</p>
                  <p className="font-medium">{caseData.location_address}</p>
                  {caseData.location_city && (
                    <p className="text-sm text-[#616161]">{caseData.location_city}</p>
                  )}
                </div>
                {caseData.destination_address && (
                  <div>
                    <p className="text-xs text-[#9E9E9E]">יעד</p>
                    <p className="font-medium">{caseData.destination_address}</p>
                    {caseData.destination_city && (
                      <p className="text-sm text-[#616161]">{caseData.destination_city}</p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Problem Description */}
          {caseData.problem_description && (
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-[#212121]" />
                  תיאור התקלה
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-[#616161] whitespace-pre-wrap">{caseData.problem_description}</p>
              </CardContent>
            </Card>
          )}

          {/* Chat with Vendor */}
          {caseData.assigned_provider_id && (
            <div className="mb-6">
              <CallChat callId={caseId} currentUserRole="operator" currentUserName="מוקד" />
            </div>
          )}

          {/* Add Note (Internal) */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Edit className="w-4 h-4 text-[#212121]" />
                הערה פנימית (לא גלויה לספק)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-2">
                <Textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="כתוב הערה פנימית..."
                  rows={2}
                  className="flex-1"
                />
                <Button
                  onClick={handleAddNote}
                  disabled={!noteText.trim() || addActivityMutation.isPending}
                  className="bg-gray-600 hover:bg-gray-700 sm:self-start"
                >
                  {addActivityMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'שמור'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* SLA Status */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#212121]" />
                  SLA
                </CardTitle>
                <PredictionBadge call={caseData} />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#FAFAFA]">
                <div>
                  <p className="text-xs text-[#9E9E9E]">תגובה</p>
                  <p className="text-sm font-medium">
                    {caseData.sla_response_deadline
                      ? format(parseISO(caseData.sla_response_deadline), 'HH:mm dd/MM', {
                          locale: he,
                        })
                      : '-'}
                  </p>
                </div>
                {caseData.sla_response_met !== undefined &&
                  (caseData.sla_response_met ? (
                    <CheckCircle2 className="w-5 h-5 text-[#2E7D32]" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-[#D32F2F]" />
                  ))}
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#FAFAFA]">
                <div>
                  <p className="text-xs text-[#9E9E9E]">הגעה</p>
                  <p className="text-sm font-medium">
                    {caseData.sla_arrival_deadline
                      ? format(parseISO(caseData.sla_arrival_deadline), 'HH:mm dd/MM', {
                          locale: he,
                        })
                      : '-'}
                  </p>
                </div>
                {caseData.sla_arrival_met !== undefined &&
                  (caseData.sla_arrival_met ? (
                    <CheckCircle2 className="w-5 h-5 text-[#2E7D32]" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-[#D32F2F]" />
                  ))}
              </div>
            </CardContent>
          </Card>

          {/* Assigned Provider */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Truck className="w-4 h-4 text-[#212121]" />
                נותן שירות
              </CardTitle>
            </CardHeader>
            <CardContent>
              {caseData.assigned_provider_name ? (
                <div className="space-y-2">
                  <p className="font-medium">{caseData.assigned_provider_name}</p>
                  {caseData.assigned_at && (
                    <p className="text-xs text-[#9E9E9E]">
                      שובץ: {format(parseISO(caseData.assigned_at), 'HH:mm dd/MM', { locale: he })}
                    </p>
                  )}
                  {caseData.arrived_at && (
                    <p className="text-xs text-[#9E9E9E]">
                      הגיע: {format(parseISO(caseData.arrived_at), 'HH:mm dd/MM', { locale: he })}
                    </p>
                  )}
                  {distanceData && (
                    <div className="mt-3 pt-3 border-t border-[#E0E0E0]">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-[#616161]">מרחק:</span>
                        <span className="font-medium">{distanceData.roadDistance} ק"מ</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[#616161]">זמן הגעה:</span>
                        <span className="font-medium">{distanceData.duration} דק'</span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full mt-2 gap-2"
                        onClick={() => window.open(distanceData.navigationUrl, '_blank')}
                      >
                        <Navigation className="w-3 h-3" />
                        נווט לספק
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-[#9E9E9E] text-sm">לא שובץ</p>
              )}
            </CardContent>
          </Card>

          {/* Navigation Map for Operator */}
          {caseData?.assigned_provider_id &&
            vendorLocation &&
            caseData?.location_lat &&
            caseData?.location_lng && (
              <NavigationMap
                vendorLocation={{
                  lat: vendorLocation.latitude,
                  lon: vendorLocation.longitude,
                }}
                callLocation={{
                  lat: caseData.location_lat,
                  lon: caseData.location_lng,
                  address: caseData.location_address,
                }}
                distance={distanceData?.roadDistance}
                duration={distanceData?.duration}
                onNavigate={() => {
                  if (distanceData?.navigationUrl) {
                    window.open(distanceData.navigationUrl, '_blank');
                  }
                }}
              />
            )}

          {/* Activity Log */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">היסטוריה</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {activities.length === 0 ? (
                  <p className="text-[#9E9E9E] text-sm text-center py-4">אין פעילות</p>
                ) : (
                  activities.map((activity) => (
                    <div
                      key={activity.id}
                      className="text-sm border-e-2 border-[#0D47A1] pe-3 py-1"
                    >
                      <p className="text-[#212121]">{activity.description}</p>
                      <p className="text-xs text-[#9E9E9E]">
                        {activity.created_date &&
                          format(parseISO(activity.created_date), 'HH:mm dd/MM', { locale: he })}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Assign Provider Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>שיבוץ נותן שירות</DialogTitle>
          </DialogHeader>

          <div className="px-1 mb-4">
            <VendorRecommendation
              callDetails={caseData}
              onSelectVendor={(vendor) => handleAssignProvider(vendor.id)}
            />
          </div>

          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-500">או בחר מתוך הרשימה</span>
            </div>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {providers.length === 0 ? (
              <p className="text-center py-8 text-[#616161]">אין נותני שירות זמינים</p>
            ) : (
              providers.map((provider) => (
                <div
                  key={provider.id}
                  className="p-3 border border-[#E0E0E0] rounded-lg hover:border-[#0D47A1] hover:bg-[#FAFAFA] cursor-pointer transition-colors"
                  onClick={() => handleAssignProvider(provider.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{provider.name}</p>
                      <p className="text-sm text-[#616161]">{provider.phone}</p>
                    </div>
                    <StatusBadge status={provider.status} size="sm" />
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
