import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowRight,
  Save,
  Truck,
  User,
  Phone,
  Mail,
  MapPin,
  Send,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { showToast, feedbackMessages } from '@/components/ui/FeedbackToast';
import { SlideUp, AnimatedCard } from '@/components/animations/AnimatedComponents';

const serviceTypes = [
  { key: 'tow_truck', label: 'גרר' },
  { key: 'mechanic', label: 'מכונאי' },
  { key: 'tire_service', label: 'צמיגים' },
  { key: 'locksmith', label: 'מנעולן' },
  { key: 'fuel_delivery', label: 'דלק' },
  { key: 'multi_service', label: 'שירות משולב' }
];

const vehicleTypes = [
  { key: 'private', label: 'רכב פרטי' },
  { key: 'commercial_light', label: 'מסחרי קל' },
  { key: 'truck', label: 'משאית' },
  { key: 'motorcycle', label: 'אופנוע' }
];

const coverageAreas = [
  { key: 'center', label: 'מרכז' },
  { key: 'sharon', label: 'שרון' },
  { key: 'north', label: 'צפון' },
  { key: 'south', label: 'דרום' },
  { key: 'jerusalem', label: 'ירושלים' },
  { key: 'lowlands', label: 'שפלה' }
];

export default function NewVendorPage() {
  const navigate = useNavigate();
  const [sendInvite, setSendInvite] = useState(true);
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
    payment_rate_per_call: '',
    notes: '',
    is_active: true,
    is_available_now: true,
    availability_status: 'available'
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      // Create vendor
      const vendor = await base44.entities.Vendor.create(data);
      
      // Send invite email if requested
      if (sendInvite && data.email) {
        try {
          await base44.users.inviteUser(data.email, 'user');
          showToast.success('הזמנה נשלחה לספק');
        } catch (e) {
          console.error('Failed to send invite:', e);
          showToast.warning('הספק נוצר אך ההזמנה לא נשלחה');
        }
      }
      
      return vendor;
    },
    onSuccess: () => {
      showToast.success(feedbackMessages.create.success);
      navigate(createPageUrl('ServiceProviders'));
    },
    onError: (error) => {
      showToast.error(feedbackMessages.create.error + ': ' + error.message);
    }
  });

  const handleServiceTypeChange = (type, checked) => {
    setFormData(prev => ({
      ...prev,
      service_type: checked 
        ? [...prev.service_type, type]
        : prev.service_type.filter(t => t !== type)
    }));
  };

  const handleVehicleTypeChange = (type, checked) => {
    setFormData(prev => ({
      ...prev,
      vehicle_types_supported: checked 
        ? [...prev.vehicle_types_supported, type]
        : prev.vehicle_types_supported.filter(t => t !== type)
    }));
  };

  const handleCoverageAreaChange = (area, checked) => {
    setFormData(prev => ({
      ...prev,
      coverage_areas: checked 
        ? [...prev.coverage_areas, area]
        : prev.coverage_areas.filter(a => a !== area)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.vendor_name || !formData.phone) {
      showToast.error('נא למלא שם ספק וטלפון');
      return;
    }
    
    if (sendInvite && !formData.email) {
      showToast.error('נדרש אימייל לשליחת הזמנה');
      return;
    }

    createMutation.mutate(formData);
  };

  return (
    <SlideUp>
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => navigate(-1)}
        >
          <ArrowRight className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-[#111827]">הוספת ספק חדש</h1>
          <p className="text-[#6b7280] text-sm">יצירת ספק שירות חדש והזמנתו למערכת</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
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
                <Label>שם הספק/חברה *</Label>
                <Input
                  value={formData.vendor_name}
                  onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
                  placeholder="לדוגמה: גרר הצפון"
                  required
                />
              </div>
              <div>
                <Label>איש קשר</Label>
                <Input
                  value={formData.contact_person}
                  onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                  placeholder="שם איש הקשר"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>טלפון ראשי *</Label>
                <div className="relative">
                  <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B778C]" />
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="pr-10"
                    dir="ltr"
                    placeholder="050-1234567"
                    required
                  />
                </div>
              </div>
              <div>
                <Label>טלפון משני</Label>
                <div className="relative">
                  <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B778C]" />
                  <Input
                    value={formData.phone_2}
                    onChange={(e) => setFormData({ ...formData, phone_2: e.target.value })}
                    className="pr-10"
                    dir="ltr"
                  />
                </div>
              </div>
            </div>

            <div>
              <Label>אימייל {sendInvite && '*'}</Label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B778C]" />
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="pr-10"
                  dir="ltr"
                  placeholder="vendor@example.com"
                  required={sendInvite}
                />
              </div>
              <p className="text-xs text-[#6B778C] mt-1">האימייל ישמש להתחברות לפורטל הספקים</p>
            </div>
          </CardContent>
        </Card>

        {/* Service Types */}
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Truck className="w-5 h-5 text-[#6B778C]" />
              סוגי שירות
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="mb-3 block">סוגי שירות שהספק מספק</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {serviceTypes.map(type => (
                  <div key={type.key} className="flex items-center gap-2">
                    <Checkbox
                      id={`service-${type.key}`}
                      checked={formData.service_type.includes(type.key)}
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
              <Label className="mb-3 block">סוגי רכבים נתמכים</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {vehicleTypes.map(type => (
                  <div key={type.key} className="flex items-center gap-2">
                    <Checkbox
                      id={`vehicle-${type.key}`}
                      checked={formData.vehicle_types_supported.includes(type.key)}
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

        {/* Coverage */}
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
                {coverageAreas.map(area => (
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
              <Textarea
                value={formData.coverage_cities}
                onChange={(e) => setFormData({ ...formData, coverage_cities: e.target.value })}
                placeholder="תל אביב, רמת גן, גבעתיים..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Working Hours */}
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="text-lg">שעות פעילות</CardTitle>
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
                    onChange={(e) => setFormData({ ...formData, working_hours_start: e.target.value })}
                  />
                </div>
                <div>
                  <Label>שעת סיום</Label>
                  <Input
                    type="time"
                    value={formData.working_hours_end}
                    onChange={(e) => setFormData({ ...formData, working_hours_end: e.target.value })}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Invite Section */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                <Send className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-[#172B4D]">שליחת הזמנה לספק</h3>
                  <Switch
                    checked={sendInvite}
                    onCheckedChange={setSendInvite}
                  />
                </div>
                <p className="text-sm text-[#6B778C]">
                  {sendInvite 
                    ? 'הספק יקבל אימייל עם הזמנה להירשם למערכת ולהגדיר סיסמה'
                    : 'הספק יתווסף למערכת אך לא יקבל הזמנה להתחברות'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="text-lg">הערות</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="הערות פנימיות על הספק..."
              rows={3}
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => navigate(-1)}
            className="flex-1"
          >
            ביטול
          </Button>
          <Button 
            type="submit" 
            className="flex-1 bg-[#3b82f6] hover:bg-[#2563eb] gap-2"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                יוצר...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                {sendInvite ? 'צור ושלח הזמנה' : 'צור ספק'}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
    </SlideUp>
  );
}