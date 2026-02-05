import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
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
import { ArrowRight, User, Car, MapPin, Wrench, AlertTriangle, Save, Loader2 } from 'lucide-react';
import {
  validators,
  validateForm,
  FieldError,
  createValidationSchema,
} from '@/components/forms/FormValidation';
import { showToast } from '@/components/ui/FeedbackToast';
import AICategorization from '@/components/ai/AICategorization';

const newCaseSchema = createValidationSchema({
  caller_name: { label: 'שם המתקשר', validators: [validators.required] },
  caller_phone: { label: 'טלפון המתקשר', validators: [validators.required, validators.phone] },
  location_address: { label: 'כתובת מיקום', validators: [validators.required] },
});

const serviceTypeLabels = {
  towing: 'גרירה',
  flat_tire: "פנצ'ר",
  battery: 'מצבר',
  lockout: 'פתיחת רכב',
  fuel: 'דלק',
  accident: 'תאונה',
  mechanical: 'תקלה מכנית',
  other: 'אחר',
};

const vehicleTypeLabels = {
  car: 'רכב פרטי',
  motorcycle: 'אופנוע',
  truck: 'משאית',
  bus: 'אוטובוס',
  van: 'ואן',
  other: 'אחר',
};

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
    service_type: 'towing',
    location_address: '',
    location_city: '',
    destination_address: '',
    destination_city: '',
    priority: 'normal',
    problem_description: '',
    internal_notes: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [touched, setTouched] = useState({});

  const { data: customers = [], isLoading: customersLoading } = useQuery({
    queryKey: ['customers'],
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
      queryClient.invalidateQueries({ queryKey: ['cases'] });
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
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
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
                  className={`text-right ${touched.caller_phone && formErrors.caller_phone ? 'border-red-500' : ''}`}
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
                  className="text-right"
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
                  onValueChange={(value) => setFormData({ ...formData, service_type: value })}
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
                    setFormData(prev => ({ ...prev, service_type, priority }));
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