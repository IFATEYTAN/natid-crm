import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { queryKeys } from '@/lib/queryKeys';
import { usePermissions } from '@/components/permissions/PermissionsContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import {
  User,
  Phone,
  Mail,
  MapPin,
  Save,
  Truck,
  Star,
  Shield,
  Clock,
  CheckCircle,
  Loader2,
  DollarSign,
  Wrench,
  Navigation,
} from 'lucide-react';
import VendorGPSTracker from '@/components/vendor/VendorGPSTracker';
import { showToast, feedbackMessages } from '@/components/ui/FeedbackToast';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import {
  SlideUp,
  AnimatedCard,
  StaggeredList,
  StaggeredItem,
} from '@/components/animations/AnimatedComponents';

const serviceTypes = [
  { key: 'towing', label: 'גרירה', icon: '🚛' },
  { key: 'flat_tire', label: 'החלפת גלגל', icon: '🔧' },
  { key: 'tire_repair', label: "תיקון פנצ'ר", icon: '🛞' },
  { key: 'battery_jump', label: 'הנעה ממצבר', icon: '🔋' },
  { key: 'battery_replace', label: 'החלפת מצבר', icon: '🔋' },
  { key: 'fuel_delivery', label: 'הבאת דלק', icon: '⛽' },
  { key: 'locksmith', label: 'מנעולן', icon: '🔑' },
  { key: 'mechanic', label: 'מכונאי ניידת', icon: '🔧' },
  { key: 'windshield', label: 'שמשות', icon: '🪟' },
];

const coverageAreas = [
  { key: 'center', label: 'מרכז' },
  { key: 'sharon', label: 'שרון' },
  { key: 'north', label: 'צפון' },
  { key: 'south', label: 'דרום' },
  { key: 'jerusalem', label: 'ירושלים' },
  { key: 'lowlands', label: 'שפלה' },
];

export default function MyVendorProfilePage() {
  const { currentUser } = usePermissions();
  const [formData, setFormData] = useState({
    vendor_name: '',
    contact_person: '',
    phone: '',
    phone_2: '',
    email: '',
    coverage_cities: '',
    coverage_areas: [],
    service_type: [],
    service_rates: {},
    base_rate: 0,
    rate_per_km: 0,
    works_24_7: false,
    working_hours_start: '08:00',
    working_hours_end: '18:00',
    notes: '',
  });
  const queryClient = useQueryClient();

  const vendorQuery = useQuery({
    queryKey: queryKeys.vendors.profile(currentUser?.email),
    queryFn: async () => {
      const vendors = await base44.entities.Vendor.filter({ email: currentUser.email });
      if (vendors.length > 0) {
        const vendor = vendors[0];
        setFormData({
          vendor_name: vendor.vendor_name || '',
          contact_person: vendor.contact_person || '',
          phone: vendor.phone || '',
          phone_2: vendor.phone_2 || '',
          email: vendor.email || '',
          coverage_cities: vendor.coverage_cities || '',
          coverage_areas: vendor.coverage_areas || [],
          service_type: vendor.service_type || [],
          service_rates: vendor.service_rates || {},
          base_rate: vendor.base_rate || 0,
          rate_per_km: vendor.rate_per_km || 0,
          works_24_7: vendor.works_24_7 || false,
          working_hours_start: vendor.working_hours_start || '08:00',
          working_hours_end: vendor.working_hours_end || '18:00',
          notes: vendor.notes || '',
        });
        return vendor;
      }
      return null;
    },
    enabled: !!currentUser?.email,
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Vendor.update(vendorQuery.data.id, data),
    onSuccess: () => {
      showToast.success(feedbackMessages.save.success);
      queryClient.invalidateQueries({ queryKey: queryKeys.vendors.profile(currentUser?.email) });
    },
    onError: () => {
      showToast.error(feedbackMessages.save.error);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  const handleServiceTypeChange = (type, checked) => {
    setFormData((prev) => ({
      ...prev,
      service_type: checked
        ? [...prev.service_type, type]
        : prev.service_type.filter((t) => t !== type),
    }));
  };

  const handleCoverageAreaChange = (area, checked) => {
    setFormData((prev) => ({
      ...prev,
      coverage_areas: checked
        ? [...prev.coverage_areas, area]
        : prev.coverage_areas.filter((a) => a !== area),
    }));
  };

  const vendor = vendorQuery.data;

  if (vendorQuery.isLoading) {
    return <PageLoader text="טוען פרופיל..." />;
  }

  if (vendorQuery.isError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <p className="text-red-500 text-lg font-medium mb-2">שגיאה בטעינת נתונים</p>
        <p className="text-gray-500 text-sm">{vendorQuery.error?.message || 'נסה לרענן את הדף'}</p>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-[#f3f4f6] flex items-center justify-center">
            <Truck className="w-10 h-10 text-[#6b7280]" />
          </div>
          <h2 className="text-xl font-bold text-[#111827] mb-2">פרופיל ספק לא נמצא</h2>
          <p className="text-[#6b7280]">אנא פנה למנהל המערכת</p>
        </div>
      </div>
    );
  }

  return (
    <SlideUp>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#111827]">הפרופיל שלי</h1>
          <p className="text-[#6b7280] text-sm">עדכון פרטים אישיים</p>
        </div>

        {/* GPS Tracker */}
        <VendorGPSTracker
          vendorId={vendor?.id}
          vendorProfile={vendor}
          onLocationUpdate={() => {}}
          onError={(error) => {
            showToast.error(error);
          }}
        />

        {/* Stats Card */}
        <StaggeredList className="grid grid-cols-3 gap-4">
          <StaggeredItem>
            <AnimatedCard className="p-4 text-center">
              <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-[#f3f4f6] flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-[#111827]" />
              </div>
              <div className="text-2xl font-bold text-[#111827]">
                {vendor.total_calls_completed || 0}
              </div>
              <div className="text-xs text-[#6b7280]">קריאות הושלמו</div>
            </AnimatedCard>
          </StaggeredItem>
          <StaggeredItem>
            <AnimatedCard className="p-4 text-center">
              <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-[#f3f4f6] flex items-center justify-center">
                <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
              </div>
              <div className="text-2xl font-bold text-[#111827]">
                {vendor.average_rating?.toFixed(1) || '-'}
              </div>
              <div className="text-xs text-[#6b7280]">דירוג ממוצע</div>
            </AnimatedCard>
          </StaggeredItem>
          <StaggeredItem>
            <AnimatedCard className="p-4 text-center">
              <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-[#f3f4f6] flex items-center justify-center">
                <Clock className="w-5 h-5 text-[#3b82f6]" />
              </div>
              <div className="text-2xl font-bold text-[#111827]">
                {vendor.completion_rate || 0}%
              </div>
              <div className="text-xs text-[#6b7280]">אחוז השלמה</div>
            </AnimatedCard>
          </StaggeredItem>
        </StaggeredList>

        {/* Profile Form */}
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-[#6B778C]" />
              פרטי הספק
            </CardTitle>
            <CardDescription>עדכן את פרטי הקשר שלך</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>שם הספק/חברה</Label>
                  <Input
                    value={formData.vendor_name}
                    onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
                    disabled
                    className="bg-gray-50"
                  />
                  <p className="text-xs text-[#6B778C] mt-1">לשינוי שם פנה למנהל</p>
                </div>
                <div>
                  <Label>איש קשר</Label>
                  <Input
                    value={formData.contact_person}
                    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>טלפון ראשי</Label>
                  <div className="relative">
                    <Phone className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B778C]" />
                    <Input
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="ps-10"
                      dir="ltr"
                    />
                  </div>
                </div>
                <div>
                  <Label>טלפון משני</Label>
                  <div className="relative">
                    <Phone className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B778C]" />
                    <Input
                      value={formData.phone_2}
                      onChange={(e) => setFormData({ ...formData, phone_2: e.target.value })}
                      className="ps-10"
                      dir="ltr"
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label>אימייל</Label>
                <div className="relative">
                  <Mail className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B778C]" />
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="ps-10"
                    dir="ltr"
                    disabled
                  />
                </div>
                <p className="text-xs text-[#6B778C] mt-1">האימייל משמש להתחברות ולא ניתן לשינוי</p>
              </div>

              <div>
                <Label className="mb-3 block flex items-center gap-2">
                  <Wrench className="w-4 h-4" />
                  סוגי שירות ותעריפים
                </Label>
                <div className="space-y-3">
                  {serviceTypes.map((type) => (
                    <div
                      key={type.key}
                      className="flex items-center gap-3 p-3 bg-[#f9fafb] rounded-lg"
                    >
                      <Checkbox
                        id={`service-${type.key}`}
                        checked={formData.service_type.includes(type.key)}
                        onCheckedChange={(checked) => handleServiceTypeChange(type.key, checked)}
                      />
                      <label
                        htmlFor={`service-${type.key}`}
                        className="flex-1 text-sm cursor-pointer flex items-center gap-2"
                      >
                        <span>{type.icon}</span>
                        {type.label}
                      </label>
                      {formData.service_type.includes(type.key) && (
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            placeholder="תעריף ₪"
                            className="w-24 h-8 text-sm"
                            value={formData.service_rates[type.key] || ''}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                service_rates: {
                                  ...formData.service_rates,
                                  [type.key]: Number(e.target.value),
                                },
                              })
                            }
                          />
                          <span className="text-xs text-[#6b7280]">₪</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label className="mb-3 block">אזורי כיסוי</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {coverageAreas.map((area) => (
                    <div key={area.key} className="flex items-center gap-2">
                      <Checkbox
                        id={`area-${area.key}`}
                        checked={formData.coverage_areas.includes(area.key)}
                        onCheckedChange={(checked) => handleCoverageAreaChange(area.key, checked)}
                      />
                      <label htmlFor={`area-${area.key}`} className="text-sm cursor-pointer">
                        {area.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label>ערים ספציפיות</Label>
                <div className="relative">
                  <MapPin className="absolute start-3 top-3 w-4 h-4 text-[#6b7280]" />
                  <Textarea
                    value={formData.coverage_cities}
                    onChange={(e) => setFormData({ ...formData, coverage_cities: e.target.value })}
                    className="ps-10 min-h-[80px]"
                    placeholder="רשום את הערים בהם אתה מספק שירות"
                  />
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Base Rates */}
        <Card className="bg-white border border-[#e5e7eb]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-[#6b7280]" />
              תעריפים כלליים
            </CardTitle>
            <CardDescription>תעריפי בסיס לקריאות</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>תעריף בסיס (₪)</Label>
                <Input
                  type="number"
                  value={formData.base_rate || ''}
                  onChange={(e) => setFormData({ ...formData, base_rate: Number(e.target.value) })}
                  placeholder="0"
                />
                <p className="text-xs text-[#6b7280] mt-1">תעריף מינימום לכל קריאה</p>
              </div>
              <div>
                <Label>תעריף לק"מ (₪)</Label>
                <Input
                  type="number"
                  value={formData.rate_per_km || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, rate_per_km: Number(e.target.value) })
                  }
                  placeholder="0"
                />
                <p className="text-xs text-[#6b7280] mt-1">תוספת לפי מרחק נסיעה</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Working Hours */}
        <Card className="bg-white border border-[#e5e7eb]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#6b7280]" />
              שעות פעילות
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Switch
                checked={formData.works_24_7}
                onCheckedChange={(checked) => setFormData({ ...formData, works_24_7: checked })}
              />
              <Label>עובד 24/7</Label>
            </div>

            {!formData.works_24_7 && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>שעת התחלה</Label>
                  <Input
                    type="time"
                    value={formData.working_hours_start}
                    onChange={(e) =>
                      setFormData({ ...formData, working_hours_start: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>שעת סיום</Label>
                  <Input
                    type="time"
                    value={formData.working_hours_end}
                    onChange={(e) =>
                      setFormData({ ...formData, working_hours_end: e.target.value })
                    }
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notes */}
        <Card className="bg-white border border-[#e5e7eb]">
          <CardHeader>
            <CardTitle className="text-lg">הערות</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="מידע נוסף שחשוב שנדע..."
            />
          </CardContent>
        </Card>

        {/* Save Button */}
        <Button
          onClick={handleSubmit}
          className="w-full bg-[#f97316] hover:bg-[#ea580c] gap-2 h-12"
          disabled={updateMutation.isPending}
        >
          {updateMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              שומר...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              שמור שינויים
            </>
          )}
        </Button>

        {/* Security */}
        <Card className="bg-white border border-[#e5e7eb]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#6b7280]" />
              אבטחה
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-[#6b7280] mb-4">
              לשינוי סיסמה או בעיות התחברות, אנא פנה למנהל המערכת.
            </p>
            <div className="text-xs text-[#6b7280]">
              מחובר כ: <span className="font-medium">{currentUser?.email}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </SlideUp>
  );
}
