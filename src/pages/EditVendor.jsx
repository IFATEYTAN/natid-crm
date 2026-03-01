import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { useVendor, useUpdateVendor } from '@/features/vendors/hooks/useVendors';
import { coverageAreas } from '@/config/coverageConstants';
import { sanitizeVendorUpdate } from '@/lib/schemas/vendor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import {
  ArrowRight,
  CheckCircle,
  Loader2,
  User,
  Phone,
  Mail,
  Truck,
  MapPin,
  Trash2,
} from 'lucide-react';
import { showToast, feedbackMessages } from '@/components/ui/FeedbackToast';
import { SlideUp } from '@/components/animations/AnimatedComponents';

const serviceTypes = [
  { key: 'tow_truck', label: 'גרר' },
  { key: 'mechanic', label: 'מכונאי' },
  { key: 'tire_service', label: 'צמיגים' },
  { key: 'locksmith', label: 'מנעולן' },
  { key: 'fuel_delivery', label: 'דלק' },
  { key: 'multi_service', label: 'שירות משולב' },
];

const vehicleTypes = [
  { key: 'private', label: 'רכב פרטי' },
  { key: 'commercial_light', label: 'מסחרי קל' },
  { key: 'truck', label: 'משאית' },
  { key: 'motorcycle', label: 'אופנוע' },
];

export default function EditVendorPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const id = searchParams.get('id');
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    vendor_name: '',
    contact_person: '',
    phone: '',
    phone_2: '',
    email: '',
    service_type: [],
    vehicle_types_supported: [],
    coverage_areas: [],
    coverage_cities: '',
    works_24_7: false,
    working_hours_start: '08:00',
    working_hours_end: '18:00',
    notes: '',
    is_active: true,
  });

  const { data: vendor, isLoading } = useVendor(id);
  const updateMutation = useUpdateVendor();

  useEffect(() => {
    if (vendor) {
      setFormData({
        vendor_name: vendor.vendor_name || '',
        contact_person: vendor.contact_person || '',
        phone: vendor.phone || '',
        phone_2: vendor.phone_2 || '',
        email: vendor.email || '',
        service_type: vendor.service_type || [],
        vehicle_types_supported: vendor.vehicle_types_supported || [],
        coverage_areas: vendor.coverage_areas || [],
        coverage_cities: vendor.coverage_cities || '',
        works_24_7: vendor.works_24_7 || false,
        working_hours_start: vendor.working_hours_start || '08:00',
        working_hours_end: vendor.working_hours_end || '18:00',
        notes: vendor.notes || '',
        is_active: vendor.is_active ?? true,
      });
    }
  }, [vendor]);

  const handleServiceTypeChange = (type, checked) => {
    setFormData((prev) => ({
      ...prev,
      service_type: checked
        ? [...prev.service_type, type]
        : prev.service_type.filter((t) => t !== type),
    }));
  };

  const handleVehicleTypeChange = (type, checked) => {
    setFormData((prev) => ({
      ...prev,
      vehicle_types_supported: checked
        ? [...prev.vehicle_types_supported, type]
        : prev.vehicle_types_supported.filter((t) => t !== type),
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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.vendor_name || !formData.phone) {
      showToast.error('נא למלא שם ספק וטלפון');
      return;
    }

    try {
      const data = sanitizeVendorUpdate(formData);
      updateMutation.mutate(
        { id, data },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.serviceProviders.all() });
            navigate(createPageUrl('ServiceProviders'));
          },
        }
      );
    } catch (validationError) {
      showToast.error(validationError.message);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!vendor && !isLoading) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold mb-4">הספק לא נמצא</h2>
        <Button onClick={() => navigate(createPageUrl('ServiceProviders'))}>חזרה לרשימה</Button>
      </div>
    );
  }

  return (
    <SlideUp>
      <div className="max-w-3xl mx-auto space-y-6 pb-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="חזרה">
            <ArrowRight className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-[#111827]">עריכת ספק: {vendor.vendor_name}</h1>
            <p className="text-[#6b7280] text-sm">עדכון פרטי התקשרות, שירותים וזמינות</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="w-5 h-5 text-[#6B778C]" />
                פרטים בסיסיים
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-vendor-name">שם הספק/חברה *</Label>
                  <Input
                    id="edit-vendor-name"
                    value={formData.vendor_name}
                    onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="edit-vendor-contact">איש קשר</Label>
                  <Input
                    id="edit-vendor-contact"
                    value={formData.contact_person}
                    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-vendor-phone">טלפון ראשי *</Label>
                  <Input
                    id="edit-vendor-phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    dir="ltr"
                    className="text-end"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="edit-vendor-phone-2">טלפון משני</Label>
                  <Input
                    id="edit-vendor-phone-2"
                    value={formData.phone_2}
                    onChange={(e) => setFormData({ ...formData, phone_2: e.target.value })}
                    dir="ltr"
                    className="text-end"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="edit-vendor-email">אימייל</Label>
                <Input
                  id="edit-vendor-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  dir="ltr"
                  className="text-end"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Switch
                  id="edit-vendor-is-active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="edit-vendor-is-active">ספק פעיל</Label>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Truck className="w-5 h-5 text-[#6B778C]" />
                סוגי שירות ורכבים
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="mb-3 block font-semibold">סוגי שירות</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {serviceTypes.map((type) => (
                    <div key={type.key} className="flex items-center gap-2">
                      <Checkbox
                        id={`service-${type.key}`}
                        checked={formData.service_type?.includes(type.key)}
                        onCheckedChange={(checked) => handleServiceTypeChange(type.key, checked)}
                      />
                      <label htmlFor={`service-${type.key}`} className="text-sm cursor-pointer">
                        {type.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label className="mb-3 block font-semibold">רכבים נתמכים</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {vehicleTypes.map((type) => (
                    <div key={type.key} className="flex items-center gap-2">
                      <Checkbox
                        id={`vehicle-${type.key}`}
                        checked={formData.vehicle_types_supported?.includes(type.key)}
                        onCheckedChange={(checked) => handleVehicleTypeChange(type.key, checked)}
                      />
                      <label htmlFor={`vehicle-${type.key}`} className="text-sm cursor-pointer">
                        {type.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <MapPin className="w-5 h-5 text-[#6B778C]" />
                אזורי כיסוי
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="mb-3 block">אזורים</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {coverageAreas.map((area) => (
                    <div key={area.key} className="flex items-center gap-2">
                      <Checkbox
                        id={`area-${area.key}`}
                        checked={formData.coverage_areas?.includes(area.key)}
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
                <Label htmlFor="edit-vendor-coverage-cities">ערים ספציפיות</Label>
                <Textarea
                  id="edit-vendor-coverage-cities"
                  value={formData.coverage_cities}
                  onChange={(e) => setFormData({ ...formData, coverage_cities: e.target.value })}
                  placeholder="תל אביב, רמת גן..."
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="text-lg">שעות פעילות</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Switch
                  id="edit-vendor-works-24-7"
                  checked={formData.works_24_7}
                  onCheckedChange={(checked) => setFormData({ ...formData, works_24_7: checked })}
                />
                <Label htmlFor="edit-vendor-works-24-7">עובד 24/7</Label>
              </div>

              {!formData.works_24_7 && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-vendor-working-hours-start">שעת התחלה</Label>
                    <Input
                      id="edit-vendor-working-hours-start"
                      type="time"
                      value={formData.working_hours_start}
                      onChange={(e) =>
                        setFormData({ ...formData, working_hours_start: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-vendor-working-hours-end">שעת סיום</Label>
                    <Input
                      id="edit-vendor-working-hours-end"
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

          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="text-lg">הערות</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button type="button" variant="outline" onClick={() => navigate(-1)} className="flex-1">
              ביטול
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-[#f97316] hover:bg-[#ea580c] gap-2"
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              שמור שינויים
            </Button>
          </div>
        </form>
      </div>
    </SlideUp>
  );
}
