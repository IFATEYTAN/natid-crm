import { lazyRetry } from '@/lib/lazyRetry';
import React, { useState, Suspense } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { queryKeys } from '@/lib/queryKeys';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ArrowRight,
  User,
  Car,
  MapPin,
  Wrench,
  AlertTriangle,
  Save,
  Loader2,
  Truck,
  Zap,
  Info,
} from 'lucide-react';
import {
  validators,
  validateForm,
  FieldError,
  createValidationSchema,
} from '@/components/forms/FormValidation';
import { showToast } from '@/components/ui/FeedbackToast';
import AICategorization from '@/components/ai/AICategorization';
import { serviceTypeLabels, vehicleTypeLabels } from '@/config/labels';

const TechnicalQuestionnaire = lazyRetry(() => import('@/components/calls/TechnicalQuestionnaire'));

const newCaseSchema = createValidationSchema({
  caller_name: { label: 'שם המתקשר', validators: [validators.required] },
  caller_phone: { label: 'טלפון המתקשר', validators: [validators.required, validators.phone] },
  location_address: { label: 'כתובת מיקום', validators: [validators.required] },
});

export default function NewCase() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    customer_id: '',
    customer_name: '',
    caller_name: '',
    caller_phone: '',
    vehicle_number: '',
    vehicle_type: 'car',
    vehicle_model: '',
    vehicle_year: '',
    fuel_type: '',
    vehicle_model_code: '',
    service_type: 'towing',
    dispatch_type: '',
    location_address: '',
    location_city: '',
    destination_address: '',
    destination_city: '',
    priority: 'normal',
    problem_description: '',
    internal_notes: '',
    questionnaire_answers: {},
    customer_source: 'phone',
    coverage_details: '',
    // Exception questionnaire
    is_in_parking: false,
    is_at_garage: false,
    was_towed_before: false,
    is_toll_road: false,
    is_dirt_road: false,
    // Customer questionnaire
    questionnaire_engine_starts: false,
    questionnaire_gearbox_ok: false,
    questionnaire_starter_sound: false,
    questionnaire_automatic_neutral: false,
    questionnaire_steering_free: false,
    questionnaire_handbrake_electric: false,
    questionnaire_truck_access: false,
    // Deposit
    deposit_type: '',
    deposit_amount: '',
    deposit_date: '',
    deposit_reason: '',
    deposit_agent: '',
    deposit_status: '',
    // Payment
    payment_type: '',
    payment_date: '',
    payment_amount: '',
    payment_total: '',
    payment_installments: '',
    payment_delivered_to: '',
    payment_agent: '',
    payment_paid_for: '',
    // Early alert
    early_alert_minutes: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [touched, setTouched] = useState({});

  const { data: customers = [], isLoading: customersLoading } = useQuery({
    queryKey: queryKeys.customers.all(),
    queryFn: () => base44.entities.Customer.list(),
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      // Generate case number
      const caseNumber = `C-${Date.now().toString().slice(-8)}`;

      // Calculate SLA deadlines based on customer
      const customer = customers.find((c) => c.id === data.customer_id);
      const now = new Date();

      const slaResponseMinutes = customer?.sla_response_minutes || 30;
      const slaArrivalMinutes = customer?.sla_arrival_minutes || 60;

      const slaResponseDeadline = new Date(now.getTime() + slaResponseMinutes * 60000);
      const slaArrivalDeadline = new Date(now.getTime() + slaArrivalMinutes * 60000);

      return base44.entities.Case.create({
        ...data,
        case_number: caseNumber,
        status: 'new',
        sla_response_deadline: slaResponseDeadline.toISOString(),
        sla_arrival_deadline: slaArrivalDeadline.toISOString(),
      });
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cases.all() });
      showToast.success('קריאה נוצרה בהצלחה');
      navigate(createPageUrl(`CaseDetails?id=${result.id}`));
    },
    onError: (error) => {
      showToast.error(`שגיאה ביצירת קריאה: ${error.message || 'שגיאה לא ידועה'}`);
    },
  });

  const handleCustomerChange = (customerId) => {
    const customer = customers.find((c) => c.id === customerId);
    if (customer) {
      setFormData({
        ...formData,
        customer_id: customerId,
        customer_name: customer.name,
      });
    }
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const { errors } = validateForm(formData, newCaseSchema);
    setFormErrors(errors);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Mark all required fields as touched
    setTouched({ caller_name: true, caller_phone: true, location_address: true });
    const { isValid, errors } = validateForm(formData, newCaseSchema);
    setFormErrors(errors);
    if (!isValid) {
      showToast.error('יש לתקן את השגיאות בטופס');
      return;
    }
    createMutation.mutate(formData);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="חזרה">
          <ArrowRight className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-[32px] font-bold text-[#212121]">קריאה חדשה</h1>
          <p className="text-[#616161] text-sm">מלא את פרטי הקריאה</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer & Caller */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="w-4 h-4 text-[#212121]" />
              פרטי לקוח ומתקשר
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>לקוח</Label>
                <Select value={formData.customer_id} onValueChange={handleCustomerChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="בחר לקוח" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>או שם לקוח חדש</Label>
                <Input
                  value={formData.customer_name}
                  onChange={(e) =>
                    setFormData({ ...formData, customer_name: e.target.value, customer_id: '' })
                  }
                  placeholder="שם הלקוח"
                />
              </div>
              <div>
                <Label>שם המתקשר *</Label>
                <Input
                  value={formData.caller_name}
                  onChange={(e) => setFormData({ ...formData, caller_name: e.target.value })}
                  onBlur={() => handleBlur('caller_name')}
                  className={touched.caller_name && formErrors.caller_name ? 'border-red-500' : ''}
                />
                {touched.caller_name && <FieldError error={formErrors.caller_name} />}
              </div>
              <div>
                <Label>טלפון המתקשר *</Label>
                <Input
                  value={formData.caller_phone}
                  onChange={(e) => setFormData({ ...formData, caller_phone: e.target.value })}
                  onBlur={() => handleBlur('caller_phone')}
                  dir="ltr"
                  className={`text-end ${touched.caller_phone && formErrors.caller_phone ? 'border-red-500' : ''}`}
                  placeholder="0501234567"
                />
                {touched.caller_phone && <FieldError error={formErrors.caller_phone} />}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Vehicle Details */}
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
                <Label>מספר רכב</Label>
                <Input
                  value={formData.vehicle_number}
                  onChange={(e) => setFormData({ ...formData, vehicle_number: e.target.value })}
                  dir="ltr"
                  className="text-end"
                />
              </div>
              <div>
                <Label>סוג רכב</Label>
                <Select
                  value={formData.vehicle_type}
                  onValueChange={(value) => setFormData({ ...formData, vehicle_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(vehicleTypeLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>דגם</Label>
                <Input
                  value={formData.vehicle_model}
                  onChange={(e) => setFormData({ ...formData, vehicle_model: e.target.value })}
                />
              </div>
              <div>
                <Label>שנת ייצור</Label>
                <Input
                  type="number"
                  value={formData.vehicle_year}
                  onChange={(e) => setFormData({ ...formData, vehicle_year: e.target.value })}
                  placeholder="2024"
                />
              </div>
              <div>
                <Label>קוד דגם</Label>
                <Input
                  value={formData.vehicle_model_code}
                  onChange={(e) =>
                    setFormData({ ...formData, vehicle_model_code: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>סוג דלק</Label>
                <Select
                  value={formData.fuel_type}
                  onValueChange={(value) => setFormData({ ...formData, fuel_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="בחר סוג דלק" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gasoline">בנזין</SelectItem>
                    <SelectItem value="diesel">דיזל</SelectItem>
                    <SelectItem value="electric">חשמלי</SelectItem>
                    <SelectItem value="hybrid">היברידי</SelectItem>
                    <SelectItem value="gas">גז</SelectItem>
                  </SelectContent>
                </Select>
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
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label>כתובת מיקום *</Label>
                <Input
                  value={formData.location_address}
                  onChange={(e) => setFormData({ ...formData, location_address: e.target.value })}
                  onBlur={() => handleBlur('location_address')}
                  placeholder="כתובת מלאה"
                  className={
                    touched.location_address && formErrors.location_address ? 'border-red-500' : ''
                  }
                />
                {touched.location_address && <FieldError error={formErrors.location_address} />}
              </div>
              <div>
                <Label>עיר מיקום</Label>
                <Input
                  value={formData.location_city}
                  onChange={(e) => setFormData({ ...formData, location_city: e.target.value })}
                />
              </div>
              <div>
                <Label>עיר יעד (לגרירה)</Label>
                <Input
                  value={formData.destination_city}
                  onChange={(e) => setFormData({ ...formData, destination_city: e.target.value })}
                />
              </div>
              <div className="md:col-span-2">
                <Label>כתובת יעד</Label>
                <Input
                  value={formData.destination_address}
                  onChange={(e) =>
                    setFormData({ ...formData, destination_address: e.target.value })
                  }
                  placeholder="כתובת יעד (לגרירה)"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Service Details */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Wrench className="w-4 h-4 text-[#212121]" />
              פרטי שירות
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>סוג שירות *</Label>
                <Select
                  value={formData.service_type}
                  onValueChange={(value) => {
                    // Auto-recommend dispatch type based on service type
                    const mobileUnitTypes = ['battery', 'fuel'];
                    const towTruckTypes = ['towing', 'accident'];
                    let recommendedDispatch = formData.dispatch_type;
                    if (mobileUnitTypes.includes(value)) recommendedDispatch = 'mobile_unit';
                    else if (towTruckTypes.includes(value)) recommendedDispatch = 'tow_truck';
                    setFormData({
                      ...formData,
                      service_type: value,
                      dispatch_type: recommendedDispatch,
                      questionnaire_answers: {},
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(serviceTypeLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>סוג שיגור</Label>
                <Select
                  value={formData.dispatch_type}
                  onValueChange={(value) => setFormData({ ...formData, dispatch_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="בחר סוג שיגור" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mobile_unit">
                      <span className="flex items-center gap-2">
                        <Zap className="w-3 h-3 text-blue-500" />
                        ניידת (שירותי דרך)
                      </span>
                    </SelectItem>
                    <SelectItem value="tow_truck">
                      <span className="flex items-center gap-2">
                        <Truck className="w-3 h-3 text-orange-500" />
                        גרר
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
                {formData.dispatch_type === 'mobile_unit' && (
                  <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                    <Info className="w-3 h-3" />
                    ניידת עדיפה כשמדובר בבעיית מצבר/טעינה - עלות נמוכה יותר
                  </p>
                )}
              </div>
              <div>
                <Label>מקור לקוח</Label>
                <Select
                  value={formData.customer_source}
                  onValueChange={(value) => setFormData({ ...formData, customer_source: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="phone">טלפוני (שיחת סגירה)</SelectItem>
                    <SelectItem value="bot">בוט WhatsApp (סקר אוטומטי 48 שעות)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>עדיפות</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => setFormData({ ...formData, priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">נמוך</SelectItem>
                    <SelectItem value="normal">רגיל</SelectItem>
                    <SelectItem value="high">גבוה</SelectItem>
                    <SelectItem value="urgent">דחוף</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label>תיאור התקלה</Label>
                <Textarea
                  value={formData.problem_description}
                  onChange={(e) =>
                    setFormData({ ...formData, problem_description: e.target.value })
                  }
                  rows={3}
                  placeholder="תאר את התקלה..."
                />
              </div>
              <div className="md:col-span-2">
                <AICategorization
                  problemDescription={formData.problem_description}
                  locationAddress={formData.location_address}
                  locationCity={formData.location_city}
                  vehicleType={formData.vehicle_type}
                  onApply={({ service_type, priority }) => {
                    setFormData((prev) => ({ ...prev, service_type, priority }));
                  }}
                />
              </div>
              <div className="md:col-span-2">
                <Label>הערות פנימיות</Label>
                <Textarea
                  value={formData.internal_notes}
                  onChange={(e) => setFormData({ ...formData, internal_notes: e.target.value })}
                  rows={2}
                  placeholder="הערות לשימוש פנימי..."
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Exception Questionnaire */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#ED6C02]" />
              שאלון חריגים
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { key: 'is_in_parking', label: 'האם הרכב בחניון תת קרקעי / מקורה?' },
                { key: 'is_at_garage', label: 'האם הרכב במוסך / קרבת מוסך?' },
                { key: 'was_towed_before', label: 'האם בפעם הקודמה אנחנו גררנו למוסך?' },
                { key: 'is_toll_road', label: 'האם הרכב על כביש אגרה?' },
                { key: 'is_dirt_road', label: 'האם הרכב על כביש עפר (לא סלול)?' },
              ].map((item) => (
                <div key={item.key} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`case-${item.key}`}
                    checked={formData[item.key]}
                    onChange={(e) =>
                      setFormData({ ...formData, [item.key]: e.target.checked })
                    }
                    className="w-4 h-4"
                  />
                  <Label htmlFor={`case-${item.key}`} className="cursor-pointer text-sm">
                    {item.label}
                  </Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Customer Questionnaire */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Info className="w-4 h-4 text-[#0D47A1]" />
              שאלון ללקוח
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3">
              {[
                { key: 'questionnaire_engine_starts', label: 'האם הרכב מניע?' },
                {
                  key: 'questionnaire_gearbox_ok',
                  label: 'האם שידית הילוכים, הנדבריקס והגה משוחררים?',
                },
                { key: 'questionnaire_starter_sound', label: 'האם יש צליל התנעה (סטרטר)?' },
                {
                  key: 'questionnaire_automatic_neutral',
                  label: 'האם הרכב אוטומט וניתן לשלב ידית הילוכים לניוטרל?',
                },
                {
                  key: 'questionnaire_steering_free',
                  label: 'האם ההגה משוחרר? לברר אם תקוע או רק קשה',
                },
                {
                  key: 'questionnaire_handbrake_electric',
                  label: 'האם הנדבריקס חשמלי? אם כן האם משוחרר?',
                },
                {
                  key: 'questionnaire_truck_access',
                  label: 'במידה וצריך לגרור האם יש גישה למשאית גרר?',
                },
              ].map((item) => (
                <div key={item.key} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`case-${item.key}`}
                    checked={formData[item.key]}
                    onChange={(e) =>
                      setFormData({ ...formData, [item.key]: e.target.checked })
                    }
                    className="w-4 h-4"
                  />
                  <Label htmlFor={`case-${item.key}`} className="cursor-pointer text-sm">
                    {item.label}
                  </Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Deposit Section */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">ערבונות</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>סוג ערבון</Label>
                <Input
                  value={formData.deposit_type}
                  onChange={(e) => setFormData({ ...formData, deposit_type: e.target.value })}
                />
              </div>
              <div>
                <Label>סכום ערבון</Label>
                <Input
                  type="number"
                  value={formData.deposit_amount}
                  onChange={(e) => setFormData({ ...formData, deposit_amount: e.target.value })}
                />
              </div>
              <div>
                <Label>תאריך קליטת ערבון</Label>
                <Input
                  type="date"
                  value={formData.deposit_date}
                  onChange={(e) => setFormData({ ...formData, deposit_date: e.target.value })}
                />
              </div>
              <div>
                <Label>סטטוס ערבון</Label>
                <Select
                  value={formData.deposit_status}
                  onValueChange={(value) => setFormData({ ...formData, deposit_status: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="בחר סטטוס" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">ממתין</SelectItem>
                    <SelectItem value="collected">נגבה</SelectItem>
                    <SelectItem value="returned">הוחזר</SelectItem>
                    <SelectItem value="cancelled">בוטל</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>סיבת ערבון</Label>
                <Input
                  value={formData.deposit_reason}
                  onChange={(e) => setFormData({ ...formData, deposit_reason: e.target.value })}
                />
              </div>
              <div>
                <Label>נציג ערבון</Label>
                <Input
                  value={formData.deposit_agent}
                  onChange={(e) => setFormData({ ...formData, deposit_agent: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Section */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">פירוט תשלומים</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>סוג תשלום</Label>
                <Input
                  value={formData.payment_type}
                  onChange={(e) => setFormData({ ...formData, payment_type: e.target.value })}
                />
              </div>
              <div>
                <Label>תאריך תשלום</Label>
                <Input
                  type="date"
                  value={formData.payment_date}
                  onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                />
              </div>
              <div>
                <Label>סכום תשלום</Label>
                <Input
                  type="number"
                  value={formData.payment_amount}
                  onChange={(e) => setFormData({ ...formData, payment_amount: e.target.value })}
                />
              </div>
              <div>
                <Label>סה"כ</Label>
                <Input
                  type="number"
                  value={formData.payment_total}
                  onChange={(e) => setFormData({ ...formData, payment_total: e.target.value })}
                />
              </div>
              <div>
                <Label>תשלומים</Label>
                <Input
                  type="number"
                  value={formData.payment_installments}
                  onChange={(e) =>
                    setFormData({ ...formData, payment_installments: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>נמסר ל</Label>
                <Input
                  value={formData.payment_delivered_to}
                  onChange={(e) =>
                    setFormData({ ...formData, payment_delivered_to: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>נציג</Label>
                <Input
                  value={formData.payment_agent}
                  onChange={(e) => setFormData({ ...formData, payment_agent: e.target.value })}
                />
              </div>
              <div>
                <Label>שולם עבור</Label>
                <Input
                  value={formData.payment_paid_for}
                  onChange={(e) => setFormData({ ...formData, payment_paid_for: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Coverage Details */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">פירוט כיסוי</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={formData.coverage_details}
              onChange={(e) => setFormData({ ...formData, coverage_details: e.target.value })}
              rows={3}
              placeholder="פירוט תבילה / כיסוי..."
            />
          </CardContent>
        </Card>

        {/* Early Alert */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">הגדרות נוספות</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>להודיע על הגעת עזרה לפני X דקות</Label>
                <Input
                  type="number"
                  value={formData.early_alert_minutes}
                  onChange={(e) =>
                    setFormData({ ...formData, early_alert_minutes: e.target.value })
                  }
                  placeholder="מספר דקות"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Technical Questionnaire */}
        <Suspense fallback={null}>
          <TechnicalQuestionnaire
            serviceType={formData.service_type}
            answers={formData.questionnaire_answers}
            onChange={(answers) => setFormData({ ...formData, questionnaire_answers: answers })}
          />
        </Suspense>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
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
            צור קריאה
          </Button>
        </div>
      </form>
    </div>
  );
}
