import React, { useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { useAuth } from '@/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowRight,
  User,
  Car,
  MapPin,
  CreditCard,
  AlertTriangle,
  Wrench,
  Save,
  Loader2,
  FileText,
  Search,
} from 'lucide-react';
import {
  validators,
  validateForm,
  FieldError,
  createValidationSchema,
} from '@/components/forms/FormValidation';
import { showToast } from '@/components/ui/FeedbackToast';
import { vehicleTypeLabels } from '@/config/labels';
import { coverageAreas } from '@/config/coverageConstants';
import { format } from 'date-fns';

// ─── Type Definitions ───────────────────────────────────────────────────────
const FORM_TYPES = {
  paid_call: {
    title: 'קריאה בתשלום',
    icon: CreditCard,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  accident: {
    title: 'דו"ח תאונה',
    icon: AlertTriangle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
  },
  mechanical: {
    title: 'תקלה מכאנית',
    icon: Wrench,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
  },
};

const DEPARTMENT_LABELS = {
  towing: 'מחלקת גרירה',
  replacement_vehicle: 'מחלקת רכב חליפי',
  tire_windshield: 'מחלקת פנמ"ר ושמשות',
  radio_disc: 'מחלקת רדיו דיסק',
};

const PAYMENT_TYPE_OPTIONS = [
  { value: 'cash', label: 'מזומן' },
  { value: 'credit', label: 'אשראי' },
  { value: 'bank_transfer', label: 'העברה בנקאית' },
  { value: 'check', label: 'שיק' },
];

const PAYMENT_STATUS_OPTIONS = [
  { value: 'pending', label: 'ממתין לתשלום' },
  { value: 'paid', label: 'שולם' },
  { value: 'cancelled', label: 'בוטל' },
];

const PAYMENT_REASON_OPTIONS = [
  { value: 'coverage_exceeded', label: 'חריגת כיסוי' },
  { value: 'not_subscriber', label: 'לקוח לא מנוי' },
  { value: 'expired_subscription', label: 'מנוי פג תוקף' },
  { value: 'not_covered', label: 'שירות לא מכוסה' },
  { value: 'extra_distance', label: 'חריגת מרחק' },
  { value: 'special_request', label: 'בקשה מיוחדת' },
  { value: 'other', label: 'אחר' },
];

const ACCIDENT_SEVERITY_OPTIONS = [
  { value: 'minor', label: 'קלה' },
  { value: 'moderate', label: 'בינונית' },
  { value: 'severe', label: 'חמורה' },
  { value: 'total_loss', label: 'אובדן מוחלט' },
];

const ROAD_TYPE_OPTIONS = [
  { value: 'urban', label: 'עירוני' },
  { value: 'intercity', label: 'בינעירוני' },
  { value: 'highway', label: 'כביש מהיר' },
  { value: 'dirt_road', label: 'דרך שטח' },
];

const MECHANICAL_FAILURE_OPTIONS = [
  { value: 'engine', label: 'מנוע' },
  { value: 'transmission', label: 'תיבת הילוכים' },
  { value: 'brakes', label: 'בלמים' },
  { value: 'electrical', label: 'חשמל' },
  { value: 'cooling', label: 'מערכת קירור' },
  { value: 'fuel_system', label: 'מערכת דלק' },
  { value: 'steering', label: 'הגה' },
  { value: 'suspension', label: 'מתלים' },
  { value: 'exhaust', label: 'מערכת פליטה' },
  { value: 'battery', label: 'מצבר' },
  { value: 'alternator', label: 'אלטרנטור' },
  { value: 'starter', label: 'סטרטר' },
  { value: 'other', label: 'אחר' },
];

// ─── Validation Schemas ─────────────────────────────────────────────────────
const baseSchema = createValidationSchema({
  customer_name: { label: 'שם לקוח', validators: [validators.required] },
  customer_phone: {
    label: 'טלפון',
    validators: [validators.required, validators.phone],
  },
  location_address: {
    label: 'כתובת מיקום',
    validators: [validators.required],
  },
});

const paidCallSchema = createValidationSchema({
  customer_name: { label: 'שם לקוח', validators: [validators.required] },
  customer_phone: {
    label: 'טלפון',
    validators: [validators.required, validators.phone],
  },
  location_address: {
    label: 'כתובת מיקום',
    validators: [validators.required],
  },
  payment_amount: {
    label: 'סכום לתשלום',
    validators: [validators.required, validators.positiveNumber],
  },
  payment_type: { label: 'סוג תשלום', validators: [validators.required] },
});

const accidentSchema = createValidationSchema({
  customer_name: { label: 'שם לקוח', validators: [validators.required] },
  customer_phone: {
    label: 'טלפון',
    validators: [validators.required, validators.phone],
  },
  location_address: {
    label: 'כתובת מיקום',
    validators: [validators.required],
  },
  accident_date: {
    label: 'תאריך תאונה',
    validators: [validators.required],
  },
});

const mechanicalSchema = createValidationSchema({
  customer_name: { label: 'שם לקוח', validators: [validators.required] },
  customer_phone: {
    label: 'טלפון',
    validators: [validators.required, validators.phone],
  },
  location_address: {
    label: 'כתובת מיקום',
    validators: [validators.required],
  },
  failure_type: { label: 'סוג תקלה', validators: [validators.required] },
});

function getSchema(type) {
  switch (type) {
    case 'paid_call':
      return paidCallSchema;
    case 'accident':
      return accidentSchema;
    case 'mechanical':
      return mechanicalSchema;
    default:
      return baseSchema;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function SpecialCaseForm() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const formType = searchParams.get('type') || 'paid_call';
  const departmentParam = searchParams.get('department') || '';
  const customerIdParam = searchParams.get('customer_id') || '';

  const typeConfig = FORM_TYPES[formType] || FORM_TYPES.paid_call;
  const TypeIcon = typeConfig.icon;

  const caseNumber = useMemo(
    () => `SC-${Date.now().toString().slice(-8)}`,
    []
  );

  const [formData, setFormData] = useState({
    // Common - header
    department: departmentParam,
    case_number: caseNumber,
    dispatcher_name: user?.name || '',
    // Common - customer
    customer_id: customerIdParam,
    customer_name: '',
    customer_id_number: '',
    customer_phone: '',
    customer_address: '',
    vehicle_number: '',
    vehicle_type: 'car',
    vehicle_model: '',
    insurance_company: '',
    package_name: '',
    // Common - location
    location_area: '',
    location_city: '',
    location_address: '',
    destination_address: '',
    // paid_call fields
    payment_type: '',
    payment_amount: '',
    payment_installments: '1',
    payment_collected_by: '',
    payment_receipt_number: '',
    payment_status: 'pending',
    payment_notes: '',
    payment_reason: '',
    payment_reason_details: '',
    // accident fields
    accident_date: '',
    accident_time: '',
    accident_severity: '',
    accident_description: '',
    accident_police_report: '',
    accident_police_station: '',
    accident_injuries: false,
    accident_injury_details: '',
    accident_other_vehicles: '',
    accident_other_driver_name: '',
    accident_other_driver_phone: '',
    accident_other_driver_insurance: '',
    accident_other_vehicle_number: '',
    accident_road_type: '',
    accident_weather: '',
    accident_witnesses: '',
    accident_photos_taken: false,
    // mechanical fields
    failure_type: '',
    failure_description: '',
    engine_starts: false,
    vehicle_driveable: false,
    warning_lights: '',
    last_service_date: '',
    last_service_km: '',
    current_km: '',
    failure_recurring: false,
    failure_previous_repairs: '',
    // General
    problem_description: '',
    internal_notes: '',
  });

  const [formErrors, setFormErrors] = useState({});
  const [touched, setTouched] = useState({});

  // Fetch customers for autocomplete
  const { data: customers = [] } = useQuery({
    queryKey: queryKeys.customers.all(),
    queryFn: () => base44.entities.Customer.list(),
  });

  // Pre-fill customer if customer_id provided
  React.useEffect(() => {
    if (customerIdParam && customers.length > 0) {
      const customer = customers.find((c) => c.id === customerIdParam);
      if (customer) {
        setFormData((prev) => ({
          ...prev,
          customer_id: customer.id,
          customer_name: customer.name || '',
          customer_id_number: customer.id_number || '',
          customer_phone: customer.phone || '',
          customer_address: customer.address || '',
          vehicle_number: customer.vehicle_number || '',
          vehicle_type: customer.vehicle_type || 'car',
          vehicle_model: customer.vehicle_model || '',
          insurance_company: customer.insurance_company || '',
          package_name: customer.package_name || '',
        }));
      }
    }
  }, [customerIdParam, customers]);

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const schema = getSchema(formType);
    const { errors } = validateForm(formData, schema);
    setFormErrors(errors);
  };

  // Customer search & selection
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerResults, setShowCustomerResults] = useState(false);

  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return [];
    const q = customerSearch.toLowerCase();
    return customers
      .filter(
        (c) =>
          c.name?.toLowerCase().includes(q) ||
          c.phone?.includes(customerSearch) ||
          c.id_number?.includes(customerSearch) ||
          c.vehicle_number?.includes(customerSearch)
      )
      .slice(0, 10);
  }, [customers, customerSearch]);

  const selectCustomer = (customer) => {
    setFormData((prev) => ({
      ...prev,
      customer_id: customer.id,
      customer_name: customer.name || '',
      customer_id_number: customer.id_number || '',
      customer_phone: customer.phone || '',
      customer_address: customer.address || '',
      vehicle_number: customer.vehicle_number || '',
      vehicle_type: customer.vehicle_type || prev.vehicle_type,
      vehicle_model: customer.vehicle_model || '',
      insurance_company: customer.insurance_company || '',
      package_name: customer.package_name || '',
    }));
    setCustomerSearch('');
    setShowCustomerResults(false);
  };

  // Submit mutation
  const createMutation = useMutation({
    mutationFn: async (data) => {
      return base44.entities.Case.create({
        ...data,
        case_number: data.case_number,
        status: 'new',
        special_case_type: formType,
        service_type:
          formType === 'accident'
            ? 'accident'
            : formType === 'mechanical'
              ? 'mechanical'
              : 'towing',
        created_date: new Date().toISOString(),
      });
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cases.all() });
      showToast.success(`${typeConfig.title} נוצר בהצלחה`);
      navigate(createPageUrl(`CallDetails?id=${result.id}`));
    },
    onError: (error) => {
      showToast.error(
        `שגיאה ביצירת ${typeConfig.title}: ${error.message || 'שגיאה לא ידועה'}`
      );
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const schema = getSchema(formType);
    const allTouched = {};
    Object.keys(schema).forEach((key) => {
      allTouched[key] = true;
    });
    setTouched((prev) => ({ ...prev, ...allTouched }));

    const { isValid, errors } = validateForm(formData, schema);
    setFormErrors(errors);

    if (!isValid) {
      showToast.error('יש לתקן את השגיאות בטופס');
      return;
    }
    createMutation.mutate(formData);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          aria-label="חזרה"
        >
          <ArrowRight className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${typeConfig.bgColor}`}>
            <TypeIcon className={`w-6 h-6 ${typeConfig.color}`} />
          </div>
          <div>
            <h1 className="text-[32px] font-bold text-[#212121]">
              {typeConfig.title}
            </h1>
            <p className="text-[#616161] text-sm">טופס אירוע מיוחד</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ── Header Section ──────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#212121]" />
              פרטי כותרת
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>סוג אירוע</Label>
                <Input value={typeConfig.title} disabled className="bg-gray-50" />
              </div>
              <div>
                <Label>מחלקה</Label>
                <Select
                  value={formData.department}
                  onValueChange={(v) => updateField('department', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="בחר מחלקה" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(DEPARTMENT_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>מספר קריאה</Label>
                <Input
                  value={formData.case_number}
                  disabled
                  className="bg-gray-50"
                  dir="ltr"
                />
              </div>
              <div>
                <Label>שם מוקדן</Label>
                <Input
                  value={formData.dispatcher_name}
                  disabled
                  className="bg-gray-50"
                />
              </div>
              <div>
                <Label>תאריך יצירה</Label>
                <Input
                  value={format(new Date(), 'dd/MM/yyyy HH:mm')}
                  disabled
                  className="bg-gray-50"
                  dir="ltr"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Customer Section ────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="w-4 h-4 text-[#212121]" />
              פרטי לקוח
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Customer Search */}
            <div className="relative">
              <Label>חיפוש לקוח קיים</Label>
              <div className="relative">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="חפש לפי שם, טלפון, ת.ז. או מספר רכב..."
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    setShowCustomerResults(true);
                  }}
                  onFocus={() => setShowCustomerResults(true)}
                  className="ps-9"
                />
              </div>
              {showCustomerResults && filteredCustomers.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredCustomers.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className="w-full text-start px-4 py-2 hover:bg-gray-50 border-b last:border-b-0"
                      onClick={() => selectCustomer(c)}
                    >
                      <div className="font-medium text-sm">{c.name}</div>
                      <div className="text-xs text-gray-500">
                        {c.phone && `טלפון: ${c.phone}`}
                        {c.vehicle_number && ` | רכב: ${c.vehicle_number}`}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {formData.customer_id && (
              <Badge className="bg-green-100 text-green-700">
                לקוח נבחר: {formData.customer_name}
              </Badge>
            )}

            {/* Customer Fields */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>שם לקוח *</Label>
                <Input
                  value={formData.customer_name}
                  onChange={(e) => updateField('customer_name', e.target.value)}
                  onBlur={() => handleBlur('customer_name')}
                  className={
                    touched.customer_name && formErrors.customer_name
                      ? 'border-red-500'
                      : ''
                  }
                />
                {touched.customer_name && (
                  <FieldError error={formErrors.customer_name} />
                )}
              </div>
              <div>
                <Label>ת.ז.</Label>
                <Input
                  value={formData.customer_id_number}
                  onChange={(e) =>
                    updateField('customer_id_number', e.target.value)
                  }
                  dir="ltr"
                  className="text-end"
                />
              </div>
              <div>
                <Label>טלפון *</Label>
                <Input
                  value={formData.customer_phone}
                  onChange={(e) =>
                    updateField('customer_phone', e.target.value)
                  }
                  onBlur={() => handleBlur('customer_phone')}
                  dir="ltr"
                  className={`text-end ${
                    touched.customer_phone && formErrors.customer_phone
                      ? 'border-red-500'
                      : ''
                  }`}
                  placeholder="0501234567"
                />
                {touched.customer_phone && (
                  <FieldError error={formErrors.customer_phone} />
                )}
              </div>
              <div>
                <Label>כתובת</Label>
                <Input
                  value={formData.customer_address}
                  onChange={(e) =>
                    updateField('customer_address', e.target.value)
                  }
                />
              </div>
              <div>
                <Label>מספר רכב</Label>
                <Input
                  value={formData.vehicle_number}
                  onChange={(e) =>
                    updateField('vehicle_number', e.target.value)
                  }
                  dir="ltr"
                  className="text-end"
                />
              </div>
              <div>
                <Label>סוג רכב</Label>
                <Select
                  value={formData.vehicle_type}
                  onValueChange={(v) => updateField('vehicle_type', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="בחר סוג רכב" />
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
                  onChange={(e) =>
                    updateField('vehicle_model', e.target.value)
                  }
                />
              </div>
              <div>
                <Label>חברת ביטוח</Label>
                <Input
                  value={formData.insurance_company}
                  onChange={(e) =>
                    updateField('insurance_company', e.target.value)
                  }
                />
              </div>
              <div>
                <Label>שם חבילה</Label>
                <Input
                  value={formData.package_name}
                  onChange={(e) =>
                    updateField('package_name', e.target.value)
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Location Section ────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#212121]" />
              מיקום
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>אזור</Label>
                <Select
                  value={formData.location_area}
                  onValueChange={(v) => updateField('location_area', v)}
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
                  value={formData.location_city}
                  onChange={(e) =>
                    updateField('location_city', e.target.value)
                  }
                />
              </div>
              <div>
                <Label>כתובת מיקום *</Label>
                <Input
                  value={formData.location_address}
                  onChange={(e) =>
                    updateField('location_address', e.target.value)
                  }
                  onBlur={() => handleBlur('location_address')}
                  className={
                    touched.location_address && formErrors.location_address
                      ? 'border-red-500'
                      : ''
                  }
                />
                {touched.location_address && (
                  <FieldError error={formErrors.location_address} />
                )}
              </div>
              <div>
                <Label>כתובת יעד</Label>
                <Input
                  value={formData.destination_address}
                  onChange={(e) =>
                    updateField('destination_address', e.target.value)
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Type-Specific Sections ──────────────────────────────── */}
        {formType === 'paid_call' && (
          <PaidCallSection
            formData={formData}
            updateField={updateField}
            formErrors={formErrors}
            touched={touched}
            handleBlur={handleBlur}
          />
        )}

        {formType === 'accident' && (
          <AccidentSection
            formData={formData}
            updateField={updateField}
            formErrors={formErrors}
            touched={touched}
            handleBlur={handleBlur}
          />
        )}

        {formType === 'mechanical' && (
          <MechanicalSection
            formData={formData}
            updateField={updateField}
            formErrors={formErrors}
            touched={touched}
            handleBlur={handleBlur}
          />
        )}

        {/* ── General Notes ───────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#212121]" />
              הערות
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label>תיאור הבעיה</Label>
                <Textarea
                  value={formData.problem_description}
                  onChange={(e) =>
                    updateField('problem_description', e.target.value)
                  }
                  rows={3}
                  placeholder="תאר את הבעיה..."
                />
              </div>
              <div>
                <Label>הערות פנימיות</Label>
                <Textarea
                  value={formData.internal_notes}
                  onChange={(e) =>
                    updateField('internal_notes', e.target.value)
                  }
                  rows={2}
                  placeholder="הערות למוקדנים..."
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Submit ──────────────────────────────────────────────── */}
        <div className="flex gap-3 justify-end">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            ביטול
          </Button>
          <Button
            type="submit"
            disabled={createMutation.isPending}
            className="gap-2"
          >
            {createMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {createMutation.isPending ? 'שומר...' : `צור ${typeConfig.title}`}
          </Button>
        </div>
      </form>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  TYPE 1: PAID CALL SECTION
// ═══════════════════════════════════════════════════════════════════════════════
function PaidCallSection({
  formData,
  updateField,
  formErrors,
  touched,
  handleBlur,
}) {
  return (
    <>
      {/* Payment Details */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-blue-600" />
            פרטי תשלום
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>סוג תשלום *</Label>
              <Select
                value={formData.payment_type}
                onValueChange={(v) => updateField('payment_type', v)}
              >
                <SelectTrigger
                  className={
                    touched.payment_type && formErrors.payment_type
                      ? 'border-red-500'
                      : ''
                  }
                >
                  <SelectValue placeholder="בחר סוג תשלום" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {touched.payment_type && (
                <FieldError error={formErrors.payment_type} />
              )}
            </div>
            <div>
              <Label>סכום לתשלום *</Label>
              <Input
                type="number"
                value={formData.payment_amount}
                onChange={(e) =>
                  updateField('payment_amount', e.target.value)
                }
                onBlur={() => handleBlur('payment_amount')}
                dir="ltr"
                className={`text-end ${
                  touched.payment_amount && formErrors.payment_amount
                    ? 'border-red-500'
                    : ''
                }`}
                placeholder="₪"
              />
              {touched.payment_amount && (
                <FieldError error={formErrors.payment_amount} />
              )}
            </div>
            <div>
              <Label>מספר תשלומים</Label>
              <Input
                type="number"
                min="1"
                value={formData.payment_installments}
                onChange={(e) =>
                  updateField('payment_installments', e.target.value)
                }
                dir="ltr"
                className="text-end"
              />
            </div>
            <div>
              <Label>נגבה ע&quot;י</Label>
              <Input
                value={formData.payment_collected_by}
                onChange={(e) =>
                  updateField('payment_collected_by', e.target.value)
                }
              />
            </div>
            <div>
              <Label>מספר קבלה</Label>
              <Input
                value={formData.payment_receipt_number}
                onChange={(e) =>
                  updateField('payment_receipt_number', e.target.value)
                }
                dir="ltr"
                className="text-end"
              />
            </div>
            <div>
              <Label>סטטוס תשלום</Label>
              <Select
                value={formData.payment_status}
                onValueChange={(v) => updateField('payment_status', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-3">
              <Label>הערות תשלום</Label>
              <Textarea
                value={formData.payment_notes}
                onChange={(e) =>
                  updateField('payment_notes', e.target.value)
                }
                rows={2}
                placeholder="הערות לגבי התשלום..."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Reason */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">סיבת חיוב</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>סיבת החיוב</Label>
              <Select
                value={formData.payment_reason}
                onValueChange={(v) => updateField('payment_reason', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="בחר סיבה" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_REASON_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>פירוט</Label>
              <Input
                value={formData.payment_reason_details}
                onChange={(e) =>
                  updateField('payment_reason_details', e.target.value)
                }
                placeholder="פרט את סיבת החיוב..."
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  TYPE 2: ACCIDENT SECTION
// ═══════════════════════════════════════════════════════════════════════════════
function AccidentSection({
  formData,
  updateField,
  formErrors,
  touched,
  handleBlur,
}) {
  return (
    <>
      {/* Accident Details */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            פרטי תאונה
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>תאריך תאונה *</Label>
              <Input
                type="date"
                value={formData.accident_date}
                onChange={(e) =>
                  updateField('accident_date', e.target.value)
                }
                onBlur={() => handleBlur('accident_date')}
                className={
                  touched.accident_date && formErrors.accident_date
                    ? 'border-red-500'
                    : ''
                }
              />
              {touched.accident_date && (
                <FieldError error={formErrors.accident_date} />
              )}
            </div>
            <div>
              <Label>שעת תאונה</Label>
              <Input
                type="time"
                value={formData.accident_time}
                onChange={(e) =>
                  updateField('accident_time', e.target.value)
                }
              />
            </div>
            <div>
              <Label>חומרת תאונה</Label>
              <Select
                value={formData.accident_severity}
                onValueChange={(v) => updateField('accident_severity', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="בחר חומרה" />
                </SelectTrigger>
                <SelectContent>
                  {ACCIDENT_SEVERITY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>סוג כביש</Label>
              <Select
                value={formData.accident_road_type}
                onValueChange={(v) => updateField('accident_road_type', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="בחר סוג כביש" />
                </SelectTrigger>
                <SelectContent>
                  {ROAD_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>תנאי מזג אוויר</Label>
              <Input
                value={formData.accident_weather}
                onChange={(e) =>
                  updateField('accident_weather', e.target.value)
                }
                placeholder="בהיר, גשום, ערפל..."
              />
            </div>
            <div>
              <Label>דו&quot;ח משטרה</Label>
              <Input
                value={formData.accident_police_report}
                onChange={(e) =>
                  updateField('accident_police_report', e.target.value)
                }
                placeholder="מספר דו״ח"
                dir="ltr"
                className="text-end"
              />
            </div>
            <div>
              <Label>תחנת משטרה</Label>
              <Input
                value={formData.accident_police_station}
                onChange={(e) =>
                  updateField('accident_police_station', e.target.value)
                }
              />
            </div>
            <div className="md:col-span-3">
              <Label>תיאור התאונה</Label>
              <Textarea
                value={formData.accident_description}
                onChange={(e) =>
                  updateField('accident_description', e.target.value)
                }
                rows={3}
                placeholder="תאר את נסיבות התאונה..."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Injuries */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">נפגעים ועדים</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="accident_injuries"
                checked={formData.accident_injuries}
                onChange={(e) =>
                  updateField('accident_injuries', e.target.checked)
                }
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="accident_injuries" className="mb-0 cursor-pointer">
                יש נפגעים
              </Label>
            </div>
            {formData.accident_injuries && (
              <div>
                <Label>פרטי נפגעים</Label>
                <Textarea
                  value={formData.accident_injury_details}
                  onChange={(e) =>
                    updateField('accident_injury_details', e.target.value)
                  }
                  rows={2}
                  placeholder="מספר נפגעים, חומרה..."
                />
              </div>
            )}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="accident_photos_taken"
                checked={formData.accident_photos_taken}
                onChange={(e) =>
                  updateField('accident_photos_taken', e.target.checked)
                }
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label
                htmlFor="accident_photos_taken"
                className="mb-0 cursor-pointer"
              >
                צולמו תמונות
              </Label>
            </div>
            <div>
              <Label>עדים</Label>
              <Input
                value={formData.accident_witnesses}
                onChange={(e) =>
                  updateField('accident_witnesses', e.target.value)
                }
                placeholder="שמות וטלפונים של עדים..."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Other Vehicle */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Car className="w-4 h-4 text-[#212121]" />
            רכב נגדי
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>מספר כלי רכב מעורבים</Label>
              <Input
                value={formData.accident_other_vehicles}
                onChange={(e) =>
                  updateField('accident_other_vehicles', e.target.value)
                }
                dir="ltr"
                className="text-end"
                type="number"
                min="0"
              />
            </div>
            <div>
              <Label>מספר רכב נגדי</Label>
              <Input
                value={formData.accident_other_vehicle_number}
                onChange={(e) =>
                  updateField(
                    'accident_other_vehicle_number',
                    e.target.value
                  )
                }
                dir="ltr"
                className="text-end"
              />
            </div>
            <div>
              <Label>שם נהג נגדי</Label>
              <Input
                value={formData.accident_other_driver_name}
                onChange={(e) =>
                  updateField('accident_other_driver_name', e.target.value)
                }
              />
            </div>
            <div>
              <Label>טלפון נהג נגדי</Label>
              <Input
                value={formData.accident_other_driver_phone}
                onChange={(e) =>
                  updateField('accident_other_driver_phone', e.target.value)
                }
                dir="ltr"
                className="text-end"
                placeholder="0501234567"
              />
            </div>
            <div className="md:col-span-2">
              <Label>ביטוח נהג נגדי</Label>
              <Input
                value={formData.accident_other_driver_insurance}
                onChange={(e) =>
                  updateField(
                    'accident_other_driver_insurance',
                    e.target.value
                  )
                }
                placeholder="חברת ביטוח ומספר פוליסה..."
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  TYPE 3: MECHANICAL FAILURE SECTION
// ═══════════════════════════════════════════════════════════════════════════════
function MechanicalSection({
  formData,
  updateField,
  formErrors,
  touched,
  handleBlur,
}) {
  return (
    <>
      {/* Failure Details */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Wrench className="w-4 h-4 text-orange-600" />
            פרטי תקלה מכאנית
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>סוג תקלה *</Label>
              <Select
                value={formData.failure_type}
                onValueChange={(v) => updateField('failure_type', v)}
              >
                <SelectTrigger
                  className={
                    touched.failure_type && formErrors.failure_type
                      ? 'border-red-500'
                      : ''
                  }
                >
                  <SelectValue placeholder="בחר סוג תקלה" />
                </SelectTrigger>
                <SelectContent>
                  {MECHANICAL_FAILURE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {touched.failure_type && (
                <FieldError error={formErrors.failure_type} />
              )}
            </div>
            <div className="flex items-center gap-3 pt-6">
              <input
                type="checkbox"
                id="engine_starts"
                checked={formData.engine_starts}
                onChange={(e) =>
                  updateField('engine_starts', e.target.checked)
                }
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="engine_starts" className="mb-0 cursor-pointer">
                המנוע מניע
              </Label>
            </div>
            <div className="flex items-center gap-3 pt-6">
              <input
                type="checkbox"
                id="vehicle_driveable"
                checked={formData.vehicle_driveable}
                onChange={(e) =>
                  updateField('vehicle_driveable', e.target.checked)
                }
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label
                htmlFor="vehicle_driveable"
                className="mb-0 cursor-pointer"
              >
                הרכב נוסע
              </Label>
            </div>
            <div>
              <Label>נורות אזהרה</Label>
              <Input
                value={formData.warning_lights}
                onChange={(e) =>
                  updateField('warning_lights', e.target.value)
                }
                placeholder="מנוע, שמן, טמפרטורה..."
              />
            </div>
            <div className="md:col-span-2">
              <Label>תיאור התקלה</Label>
              <Textarea
                value={formData.failure_description}
                onChange={(e) =>
                  updateField('failure_description', e.target.value)
                }
                rows={2}
                placeholder="תאר את הסימפטומים, מתי התחילה התקלה..."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vehicle Condition */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">מצב רכב וטיפולים</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>תאריך טיפול אחרון</Label>
              <Input
                type="date"
                value={formData.last_service_date}
                onChange={(e) =>
                  updateField('last_service_date', e.target.value)
                }
              />
            </div>
            <div>
              <Label>ק&quot;מ בטיפול אחרון</Label>
              <Input
                type="number"
                value={formData.last_service_km}
                onChange={(e) =>
                  updateField('last_service_km', e.target.value)
                }
                dir="ltr"
                className="text-end"
              />
            </div>
            <div>
              <Label>ק&quot;מ נוכחי</Label>
              <Input
                type="number"
                value={formData.current_km}
                onChange={(e) => updateField('current_km', e.target.value)}
                dir="ltr"
                className="text-end"
              />
            </div>
            <div className="flex items-center gap-3 pt-2">
              <input
                type="checkbox"
                id="failure_recurring"
                checked={formData.failure_recurring}
                onChange={(e) =>
                  updateField('failure_recurring', e.target.checked)
                }
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label
                htmlFor="failure_recurring"
                className="mb-0 cursor-pointer"
              >
                תקלה חוזרת
              </Label>
            </div>
            {formData.failure_recurring && (
              <div className="md:col-span-2">
                <Label>תיקונים קודמים</Label>
                <Textarea
                  value={formData.failure_previous_repairs}
                  onChange={(e) =>
                    updateField('failure_previous_repairs', e.target.value)
                  }
                  rows={2}
                  placeholder="פרט תיקונים קודמים שבוצעו..."
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
