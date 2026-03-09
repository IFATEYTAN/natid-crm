import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { queryKeys } from '@/lib/queryKeys';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  ArrowRight,
  User,
  Car,
  MapPin,
  Phone,
  AlertTriangle,
  HelpCircle,
  Wrench,
  Calculator,
  Settings2,
  Save,
  Loader2,
  ChevronDown,
  ChevronUp,
  MessageCircle,
} from 'lucide-react';
import {
  validators,
  validateForm,
  FieldError,
  createValidationSchema,
} from '@/components/forms/FormValidation';
import { showToast } from '@/components/ui/FeedbackToast';
import { coverageAreas } from '@/config/coverageConstants';

const privateServiceVehicleTypes = {
  private: 'רכב פרטי',
  light_commercial: 'מסחרי קל',
  heavy_commercial: 'מסחרי כבד',
  motorcycle: 'אופנוע',
  other: 'אחר',
};

const fuelTypes = {
  gasoline: 'בנזין',
  diesel: 'דיזל',
  electric: 'חשמלי',
  hybrid: 'היברידי',
  gas: 'גז',
};

const problemTypes = [
  'תקלה מכנית',
  'כבה בנסיעה',
  "פנצ'ר",
  'גלגל תקוע',
  'תאונה',
  'אין דלק',
  'סוללה ריקה',
  'מפתחות ננעלו',
  'אחר',
];

const surchargeOptions = [
  { key: 'morning', label: 'בוקר 06:00-18:00' },
  { key: 'evening', label: 'ערב 18:00-24:00' },
  { key: 'night', label: 'לילה 24:00-06:00' },
  { key: 'holiday', label: 'חג/שבת' },
  { key: 'territory', label: 'שטחים' },
  { key: 'double_agent', label: "דאבל ג'אנט" },
  { key: 'commercial', label: 'מסחרי' },
  { key: 'toll_road', label: 'כביש 6 / כביש אגרה' },
];

const validationSchema = createValidationSchema({
  customer_name: { label: 'שם לקוח', validators: [validators.required] },
  customer_phone: { label: 'טלפון', validators: [validators.required, validators.phone] },
  caller_name: { label: 'שם פונה', validators: [validators.required] },
  caller_phone: { label: 'מספר טלפון', validators: [validators.required, validators.phone] },
  service_address: { label: 'כתובת למתן שירות', validators: [validators.required] },
});

export default function PrivateService() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    // Customer details
    customer_name: '',
    customer_id_number: '',
    customer_address: '',
    customer_email: '',
    customer_phone: '',
    // Vehicle details
    vehicle_type: '',
    vehicle_model_type: '',
    vehicle_year: '',
    fuel_type: '',
    vehicle_number: '',
    vehicle_model_code: '',
    // Contact details
    caller_name: '',
    caller_phone: '',
    caller_phone_2: '',
    // Service location
    service_area: '',
    service_city: '',
    service_address: '',
    // Destination
    destination_area: '',
    destination_city: '',
    destination_garage: '',
    destination_garage_phone: '',
    destination_address: '',
    // Exception questionnaire
    is_in_parking: false,
    is_at_garage: false,
    was_towed_before: false,
    is_toll_road: false,
    is_dirt_road: false,
    // Customer questionnaire
    questionnaire_engine_starts: false,
    questionnaire_starter_sound: false,
    questionnaire_automatic_neutral: false,
    questionnaire_steering_free: false,
    questionnaire_handbrake_electric: false,
    questionnaire_gearbox_ok: false,
    questionnaire_truck_access: false,
    // Problem details
    problem_description: '',
    vehicle_code: '',
    key_location: '',
    additional_notes: '',
    // Price calculator
    distance_km: '',
    empty_distance_km: '',
    surcharges: {},
    // Footer options
    early_alert: false,
    early_alert_minutes: '30',
    future_service: false,
    // Assigned vendor
    assigned_vendor_id: '',
  });

  const [formErrors, setFormErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [exceptionsOpen, setExceptionsOpen] = useState(false);
  const [questionnaireOpen, setQuestionnaireOpen] = useState(false);
  const [priceResult, setPriceResult] = useState(null);

  const { data: vendors = [] } = useQuery({
    queryKey: queryKeys.vendors?.all?.() || ['vendors'],
    queryFn: () => base44.entities.Vendor.list(),
  });

  const selectedVendor = useMemo(() => {
    if (!formData.assigned_vendor_id) return null;
    return vendors.find((v) => v.id === formData.assigned_vendor_id) || null;
  }, [formData.assigned_vendor_id, vendors]);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const caseNumber = `PS-${Date.now().toString().slice(-8)}`;
      return base44.entities.Case.create({
        ...data,
        case_number: caseNumber,
        status: 'new',
        department: 'towing',
        opening_source: 'private_service',
      });
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cases.all() });
      showToast.success('פנייה נוצרה בהצלחה');
      navigate(createPageUrl(`CaseDetails?id=${result.id}`));
    },
    onError: (error) => {
      showToast.error(`שגיאה ביצירת פנייה: ${error.message || 'שגיאה לא ידועה'}`);
    },
  });

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const { errors } = validateForm(formData, validationSchema);
    setFormErrors(errors);
  };

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleSurcharge = (key) => {
    setFormData((prev) => ({
      ...prev,
      surcharges: {
        ...prev.surcharges,
        [key]: !prev.surcharges[key],
      },
    }));
    setPriceResult(null);
  };

  const calculatePrice = () => {
    if (!selectedVendor) {
      showToast.warning('יש לבחור ספק לפני חישוב מחיר');
      return;
    }

    const baseRate = Number(selectedVendor.base_rate) || 0;
    const ratePerKm = Number(selectedVendor.rate_per_km) || 0;
    const rateEmptyKm = Number(selectedVendor.rate_empty_km) || 0;
    const distanceKm = Number(formData.distance_km) || 0;
    const emptyDistanceKm = Number(formData.empty_distance_km) || 0;

    const kmPrice = distanceKm * ratePerKm;
    const emptyKmPrice = emptyDistanceKm * rateEmptyKm;
    let subtotal = baseRate + kmPrice + emptyKmPrice;

    // Apply surcharges
    let surchargeTotal = 0;
    Object.entries(formData.surcharges).forEach(([key, isChecked]) => {
      if (isChecked) {
        const surchargeField = `surcharge_${key}`;
        const surchargePercent = Number(selectedVendor[surchargeField]) || 0;
        surchargeTotal += subtotal * (surchargePercent / 100);
      }
    });

    subtotal += surchargeTotal;
    const vat = subtotal * 0.17;
    const total = subtotal + vat;

    setPriceResult({
      baseRate,
      kmPrice,
      emptyKmPrice,
      surchargeTotal,
      subtotal,
      vat,
      total,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const allTouched = {};
    Object.keys(validationSchema).forEach((key) => {
      allTouched[key] = true;
    });
    setTouched(allTouched);

    const { isValid, errors } = validateForm(formData, validationSchema);
    setFormErrors(errors);
    if (!isValid) {
      showToast.error('יש לתקן את השגיאות בטופס');
      return;
    }

    const submitData = {
      ...formData,
      price_total: priceResult?.total || null,
      price_subtotal: priceResult?.subtotal || null,
      price_vat: priceResult?.vat || null,
    };
    createMutation.mutate(submitData);
  };

  const handleWhatsApp = () => {
    const phone = formData.customer_phone || formData.caller_phone;
    if (!phone) {
      showToast.warning('יש להזין מספר טלפון לפני שליחת הודעה');
      return;
    }
    const cleanPhone = phone.replace(/\D/g, '');
    const intlPhone = cleanPhone.startsWith('0') ? `972${cleanPhone.slice(1)}` : cleanPhone;
    window.open(`https://wa.me/${intlPhone}`, '_blank');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="חזרה">
          <ArrowRight className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-[32px] font-bold text-[#212121]">שירות פרטי</h1>
          <p className="text-[#616161] text-sm">פתיחת פנייה ללקוח פרטי (לא מנוי)</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Customer Details */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="w-4 h-4 text-[#212121]" />
              פרטי לקוח
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>שם לקוח *</Label>
                <Input
                  value={formData.customer_name}
                  onChange={(e) => updateField('customer_name', e.target.value)}
                  onBlur={() => handleBlur('customer_name')}
                  className={
                    touched.customer_name && formErrors.customer_name ? 'border-red-500' : ''
                  }
                />
                {touched.customer_name && <FieldError error={formErrors.customer_name} />}
              </div>
              <div>
                <Label>ת.ז.</Label>
                <Input
                  value={formData.customer_id_number}
                  onChange={(e) => updateField('customer_id_number', e.target.value)}
                  dir="ltr"
                  className="text-end"
                />
              </div>
              <div>
                <Label>טלפון *</Label>
                <Input
                  value={formData.customer_phone}
                  onChange={(e) => updateField('customer_phone', e.target.value)}
                  onBlur={() => handleBlur('customer_phone')}
                  dir="ltr"
                  className={`text-end ${touched.customer_phone && formErrors.customer_phone ? 'border-red-500' : ''}`}
                  placeholder="0501234567"
                />
                {touched.customer_phone && <FieldError error={formErrors.customer_phone} />}
              </div>
              <div>
                <Label>כתובת לקוח</Label>
                <Input
                  value={formData.customer_address}
                  onChange={(e) => updateField('customer_address', e.target.value)}
                />
              </div>
              <div>
                <Label>דוא&quot;ל לקוח</Label>
                <Input
                  type="email"
                  value={formData.customer_email}
                  onChange={(e) => updateField('customer_email', e.target.value)}
                  dir="ltr"
                  className="text-end"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Vehicle Details */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Car className="w-4 h-4 text-[#212121]" />
              פרטי רכב
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>סוג רכב</Label>
                <Select
                  value={formData.vehicle_type}
                  onValueChange={(value) => updateField('vehicle_type', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="בחר סוג רכב" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(privateServiceVehicleTypes).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>סוג דגם</Label>
                <Input
                  value={formData.vehicle_model_type}
                  onChange={(e) => updateField('vehicle_model_type', e.target.value)}
                />
              </div>
              <div>
                <Label>שנת ייצור</Label>
                <Input
                  type="number"
                  value={formData.vehicle_year}
                  onChange={(e) => updateField('vehicle_year', e.target.value)}
                  placeholder="2024"
                />
              </div>
              <div>
                <Label>סוג דלק</Label>
                <Select
                  value={formData.fuel_type}
                  onValueChange={(value) => updateField('fuel_type', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="בחר סוג דלק" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(fuelTypes).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>מספר רכב</Label>
                <Input
                  value={formData.vehicle_number}
                  onChange={(e) => updateField('vehicle_number', e.target.value)}
                  dir="ltr"
                  className="text-end"
                />
              </div>
              <div>
                <Label>קוד דגם</Label>
                <Input
                  value={formData.vehicle_model_code}
                  onChange={(e) => updateField('vehicle_model_code', e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Contact Details */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Phone className="w-4 h-4 text-[#212121]" />
              פרטי התקשרות
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>שם פונה *</Label>
                <Input
                  value={formData.caller_name}
                  onChange={(e) => updateField('caller_name', e.target.value)}
                  onBlur={() => handleBlur('caller_name')}
                  className={touched.caller_name && formErrors.caller_name ? 'border-red-500' : ''}
                />
                {touched.caller_name && <FieldError error={formErrors.caller_name} />}
              </div>
              <div>
                <Label>מספר טלפון *</Label>
                <Input
                  value={formData.caller_phone}
                  onChange={(e) => updateField('caller_phone', e.target.value)}
                  onBlur={() => handleBlur('caller_phone')}
                  dir="ltr"
                  className={`text-end ${touched.caller_phone && formErrors.caller_phone ? 'border-red-500' : ''}`}
                  placeholder="0501234567"
                />
                {touched.caller_phone && <FieldError error={formErrors.caller_phone} />}
              </div>
              <div>
                <Label>טלפון נוסף</Label>
                <Input
                  value={formData.caller_phone_2}
                  onChange={(e) => updateField('caller_phone_2', e.target.value)}
                  dir="ltr"
                  className="text-end"
                  placeholder="0501234567"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 4: Locations */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#212121]" />
              יעדים
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Service Location - Right side */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-[#424242] border-b pb-2">
                  מיקום למתן שירות
                </h3>
                <div className="space-y-3">
                  <div>
                    <Label>אזור</Label>
                    <Select
                      value={formData.service_area}
                      onValueChange={(value) => updateField('service_area', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="בחר אזור" />
                      </SelectTrigger>
                      <SelectContent>
                        {coverageAreas.map((area) => (
                          <SelectItem key={area.key} value={area.key}>
                            {area.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>עיר</Label>
                    <Input
                      value={formData.service_city}
                      onChange={(e) => updateField('service_city', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>כתובת/מיקום *</Label>
                    <Input
                      value={formData.service_address}
                      onChange={(e) => updateField('service_address', e.target.value)}
                      onBlur={() => handleBlur('service_address')}
                      placeholder="כתובת מלאה"
                      className={
                        touched.service_address && formErrors.service_address
                          ? 'border-red-500'
                          : ''
                      }
                    />
                    {touched.service_address && (
                      <FieldError error={formErrors.service_address} />
                    )}
                  </div>
                </div>
              </div>

              {/* Destination - Left side */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-[#424242] border-b pb-2">
                  יעד פריקה למקרה גרירה
                </h3>
                <div className="space-y-3">
                  <div>
                    <Label>אזור</Label>
                    <Select
                      value={formData.destination_area}
                      onValueChange={(value) => updateField('destination_area', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="בחר אזור" />
                      </SelectTrigger>
                      <SelectContent>
                        {coverageAreas.map((area) => (
                          <SelectItem key={area.key} value={area.key}>
                            {area.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>עיר</Label>
                    <Input
                      value={formData.destination_city}
                      onChange={(e) => updateField('destination_city', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>מוסך</Label>
                    <Input
                      value={formData.destination_garage}
                      onChange={(e) => updateField('destination_garage', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>טל&apos; מוסך</Label>
                    <Input
                      value={formData.destination_garage_phone}
                      onChange={(e) => updateField('destination_garage_phone', e.target.value)}
                      dir="ltr"
                      className="text-end"
                    />
                  </div>
                  <div>
                    <Label>כתובת/מיקום</Label>
                    <Input
                      value={formData.destination_address}
                      onChange={(e) => updateField('destination_address', e.target.value)}
                      placeholder="כתובת יעד"
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 5: Exceptions Questionnaire */}
        <Collapsible open={exceptionsOpen} onOpenChange={setExceptionsOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="pb-4 cursor-pointer hover:bg-gray-50 transition-colors">
                <CardTitle className="text-base flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-[#ED6C02]" />
                    שאלון חריגים
                  </span>
                  {exceptionsOpen ? (
                    <ChevronUp className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  )}
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <div className="grid grid-cols-1 gap-4">
                  {[
                    {
                      key: 'is_in_parking',
                      label: 'האם הרכב בחניון תת קרקעי / מקורה?',
                    },
                    {
                      key: 'is_at_garage',
                      label: 'האם הרכב במוסך / קרבת מוסך?',
                    },
                    {
                      key: 'was_towed_before',
                      label: 'האם בפעם הקודמה אנחנו גררנו למוסך?',
                    },
                    {
                      key: 'is_toll_road',
                      label: 'האם הרכב על כביש אגרה?',
                    },
                    {
                      key: 'is_dirt_road',
                      label: 'האם הרכב על כביש עפר (לא סלול)?',
                    },
                  ].map((item) => (
                    <div
                      key={item.key}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <Label htmlFor={item.key} className="cursor-pointer text-sm flex-1">
                        {item.label}
                      </Label>
                      <Switch
                        id={item.key}
                        checked={formData[item.key]}
                        onCheckedChange={(checked) => updateField(item.key, checked)}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Section 6: Customer Questionnaire */}
        <Collapsible open={questionnaireOpen} onOpenChange={setQuestionnaireOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="pb-4 cursor-pointer hover:bg-gray-50 transition-colors">
                <CardTitle className="text-base flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-[#0D47A1]" />
                    שאלון ללקוח
                  </span>
                  {questionnaireOpen ? (
                    <ChevronUp className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  )}
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <div className="grid grid-cols-1 gap-4">
                  {[
                    {
                      key: 'questionnaire_engine_starts',
                      label: 'האם הרכב מניע?',
                    },
                    {
                      key: 'questionnaire_starter_sound',
                      label: 'האם יש צליל התנעה (סטרטר)?',
                    },
                    {
                      key: 'questionnaire_automatic_neutral',
                      label: 'האם הרכב אוטומט וניתן לשלב ידית הילוכים לניוטרל?',
                    },
                    {
                      key: 'questionnaire_steering_free',
                      label: 'האם ההגה משוחרר?',
                    },
                    {
                      key: 'questionnaire_handbrake_electric',
                      label: 'האם הנדבריקס חשמלי? אם כן האם משוחרר?',
                    },
                    {
                      key: 'questionnaire_gearbox_ok',
                      label: 'האם שידית הילוכים, הנדבריקס והגה משוחררים?',
                    },
                    {
                      key: 'questionnaire_truck_access',
                      label: 'במידה וצריך לגרור האם יש גישה למשאית גרר?',
                    },
                  ].map((item) => (
                    <div
                      key={item.key}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <Label htmlFor={item.key} className="cursor-pointer text-sm flex-1">
                        {item.label}
                      </Label>
                      <Switch
                        id={item.key}
                        checked={formData[item.key]}
                        onCheckedChange={(checked) => updateField(item.key, checked)}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Section 7: Problem Details */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Wrench className="w-4 h-4 text-[#212121]" />
              פירוט התקלה
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>תיאור התקלה</Label>
                <Select
                  value={formData.problem_description}
                  onValueChange={(value) => updateField('problem_description', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="בחר סוג תקלה" />
                  </SelectTrigger>
                  <SelectContent>
                    {problemTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>קודן לרכב</Label>
                <Input
                  value={formData.vehicle_code}
                  onChange={(e) => updateField('vehicle_code', e.target.value)}
                />
              </div>
              <div>
                <Label>מיקום מפתח</Label>
                <Input
                  value={formData.key_location}
                  onChange={(e) => updateField('key_location', e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label>הערות נוספות</Label>
              <Textarea
                value={formData.additional_notes}
                onChange={(e) => updateField('additional_notes', e.target.value)}
                rows={3}
                placeholder="הערות נוספות..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Section 8: Price Calculator */}
        <Card className="border-2 border-[#f97316]">
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Calculator className="w-4 h-4 text-[#f97316]" />
              חישוב מחיר ללקוח
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Vendor selection */}
            <div>
              <Label>ספק משויך</Label>
              <Select
                value={formData.assigned_vendor_id}
                onValueChange={(value) => {
                  updateField('assigned_vendor_id', value);
                  setPriceResult(null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="בחר ספק לחישוב מחיר" />
                </SelectTrigger>
                <SelectContent>
                  {vendors.map((vendor) => (
                    <SelectItem key={vendor.id} value={vendor.id}>
                      {vendor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>מס&apos; ק&quot;מ</Label>
                <Input
                  type="number"
                  value={formData.distance_km}
                  onChange={(e) => {
                    updateField('distance_km', e.target.value);
                    setPriceResult(null);
                  }}
                  placeholder="0"
                  min="0"
                />
              </div>
              <div>
                <Label>סרק מס&apos; ק&quot;מ</Label>
                <Input
                  type="number"
                  value={formData.empty_distance_km}
                  onChange={(e) => {
                    updateField('empty_distance_km', e.target.value);
                    setPriceResult(null);
                  }}
                  placeholder="0"
                  min="0"
                />
              </div>
            </div>

            {/* Surcharges */}
            <div>
              <Label className="mb-2 block">תוספות</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {surchargeOptions.map((option) => (
                  <div key={option.key} className="flex items-center gap-2">
                    <Checkbox
                      id={`surcharge-${option.key}`}
                      checked={!!formData.surcharges[option.key]}
                      onCheckedChange={() => toggleSurcharge(option.key)}
                    />
                    <Label
                      htmlFor={`surcharge-${option.key}`}
                      className="cursor-pointer text-sm"
                    >
                      {option.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Button
                type="button"
                onClick={calculatePrice}
                className="bg-[#f97316] hover:bg-[#ea580c] gap-2"
              >
                <Calculator className="w-4 h-4" />
                חשב מחיר
              </Button>

              {priceResult && (
                <div className="flex-1 bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="space-y-1 text-sm text-[#616161]">
                    <div className="flex justify-between">
                      <span>תעריף בסיס:</span>
                      <span>&#8362;{priceResult.baseRate.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>ק&quot;מ:</span>
                      <span>&#8362;{priceResult.kmPrice.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>סרק ק&quot;מ:</span>
                      <span>&#8362;{priceResult.emptyKmPrice.toFixed(2)}</span>
                    </div>
                    {priceResult.surchargeTotal > 0 && (
                      <div className="flex justify-between">
                        <span>תוספות:</span>
                        <span>&#8362;{priceResult.surchargeTotal.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t pt-1">
                      <span>סה&quot;כ לפני מע&quot;מ:</span>
                      <span>&#8362;{priceResult.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>מע&quot;מ (17%):</span>
                      <span>&#8362;{priceResult.vat.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center mt-2 pt-2 border-t-2 border-orange-300">
                    <span className="font-bold text-[#212121]">
                      סה&quot;כ מחיר ללקוח כולל מע&quot;מ:
                    </span>
                    <span className="font-bold text-lg text-[#f97316]">
                      &#8362;{priceResult.total.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Section 9: Footer Options */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-[#212121]" />
              אפשרויות נוספות
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 flex-wrap">
              {/* Early alert */}
              <div className="flex items-center gap-2">
                <Checkbox
                  id="early_alert"
                  checked={formData.early_alert}
                  onCheckedChange={(checked) => updateField('early_alert', checked)}
                />
                <Label htmlFor="early_alert" className="cursor-pointer text-sm">
                  הודעה מוקדמת: להודיע על הגעת עזרה לפני
                </Label>
                <Input
                  type="number"
                  value={formData.early_alert_minutes}
                  onChange={(e) => updateField('early_alert_minutes', e.target.value)}
                  className="w-20"
                  min="1"
                  disabled={!formData.early_alert}
                />
                <span className="text-sm text-[#616161]">דקות</span>
              </div>
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              {/* Future service */}
              <div className="flex items-center gap-2">
                <Checkbox
                  id="future_service"
                  checked={formData.future_service}
                  onCheckedChange={(checked) => updateField('future_service', checked)}
                />
                <Label htmlFor="future_service" className="cursor-pointer text-sm">
                  שירות עתידי
                </Label>
              </div>

              {/* WhatsApp button */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleWhatsApp}
                className="gap-2 text-green-600 border-green-300 hover:bg-green-50"
              >
                <MessageCircle className="w-4 h-4" />
                WhatsApp
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(createPageUrl('Dashboard'))}
          >
            ביטול
          </Button>
          <Button
            type="submit"
            className="bg-[#f97316] hover:bg-[#ea580c] gap-2"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            הוסף פניה
          </Button>
        </div>
      </form>
    </div>
  );
}
