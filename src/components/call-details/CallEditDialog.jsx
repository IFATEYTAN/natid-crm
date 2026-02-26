import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { toast } from 'sonner';

const statusOptions = [
  { value: 'waiting_treatment', label: 'ממתין לטיפול' },
  { value: 'awaiting_assignment', label: 'ממתין לשיבוץ' },
  { value: 'assigning', label: 'בתהליך שיבוץ' },
  { value: 'vendor_enroute', label: 'ספק בדרך' },
  { value: 'in_progress', label: 'בטיפול' },
  { value: 'vendor_arrived', label: 'נותן השירות הגיע' },
  { value: 'future_service', label: 'שירות עתידי' },
  { value: 'in_followup', label: 'במעקב' },
  { value: 'in_storage', label: 'באחסנה' },
  { value: 'continued_treatment', label: 'המשך טיפול' },
  { value: 'awaiting_payment', label: 'המתנה לחיוב' },
  { value: 'completed', label: 'הושלם' },
  { value: 'cancelled', label: 'בוטל' },
];

const priorityOptions = [
  { value: 'normal', label: 'רגיל' },
  { value: 'urgent', label: 'דחוף' },
  { value: 'critical', label: 'קריטי' },
];

const vehicleTypeOptions = [
  { value: 'private', label: 'פרטי' },
  { value: 'commercial_light', label: 'מסחרי קל' },
  { value: 'truck', label: 'משאית' },
  { value: 'motorcycle', label: 'אופנוע' },
];

const fuelTypeOptions = [
  { value: 'gasoline', label: 'בנזין' },
  { value: 'diesel', label: 'דיזל' },
  { value: 'hybrid', label: 'היברידי' },
  { value: 'electric', label: 'חשמלי' },
];

const issueTypeOptions = [
  { value: 'mechanical', label: 'תקלה מכנית' },
  { value: 'stopped_driving', label: 'הפסקת נסיעה' },
  { value: 'flat_tire', label: "פנצ'ר" },
  { value: 'stuck_wheel', label: 'גלגל תקוע' },
  { value: 'accident', label: 'תאונה' },
  { value: 'no_fuel', label: 'אין דלק' },
  { value: 'dead_battery', label: 'מצבר ריק' },
  { value: 'locked_keys', label: 'מפתחות נעולים' },
  { value: 'other', label: 'אחר' },
];

const areaOptions = [
  { value: 'center', label: 'המרכז' },
  { value: 'sharon', label: 'השרון' },
  { value: 'north', label: 'צפון' },
  { value: 'south', label: 'דרום' },
  { value: 'jerusalem', label: 'ירושלים' },
  { value: 'lowlands', label: 'שפלה' },
];

const paymentTypeOptions = [
  { value: 'none', label: 'ללא' },
  { value: 'credit_card', label: 'כרטיס אשראי' },
  { value: 'cash', label: 'מזומן' },
  { value: 'bank_transfer', label: 'העברה בנקאית' },
];

function FieldRow({ label, children }) {
  return (
    <div>
      <Label className="text-xs text-gray-500 mb-1">{label}</Label>
      {children}
    </div>
  );
}

function SelectField({ value, onValueChange, options, placeholder }) {
  return (
    <Select value={value || ''} onValueChange={onValueChange}>
      <SelectTrigger className="h-9">
        <SelectValue placeholder={placeholder || 'בחר...'} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function BoolField({ label, checked, onCheckedChange }) {
  return (
    <div className="flex items-center justify-between py-1">
      <Label className="text-sm">{label}</Label>
      <Switch checked={!!checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

export default function CallEditDialog({ open, onOpenChange, call, callId, currentUser }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (call && open) {
      setForm({ ...call });
    }
  }, [call, open]);

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    setSaving(true);
    // Remove read-only fields
    const { id, created_date, updated_date, created_by, __type, ...data } = form;
    await base44.entities.Call.update(callId, data);

    // Log history
    await base44.entities.CallHistory.create({
      call_id: callId,
      call_number: call?.call_number,
      change_type: 'other',
      notes: 'עריכה כללית של פרטי הקריאה',
      changed_by: currentUser?.full_name || 'operator',
    });

    queryClient.invalidateQueries({ queryKey: queryKeys.calls.detail(callId) });
    toast.success('הקריאה עודכנה בהצלחה');
    setSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>עריכת קריאה {call?.call_number || ''}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="customer" dir="rtl">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="customer">לקוח</TabsTrigger>
            <TabsTrigger value="insurance">ביטוח</TabsTrigger>
            <TabsTrigger value="vehicle">רכב</TabsTrigger>
            <TabsTrigger value="issue">תקלה</TabsTrigger>
            <TabsTrigger value="location">מיקום</TabsTrigger>
            <TabsTrigger value="vendor">ספק</TabsTrigger>
            <TabsTrigger value="technical">שאלון טכני</TabsTrigger>
            <TabsTrigger value="payment">תשלומים</TabsTrigger>
            <TabsTrigger value="status">סטטוס</TabsTrigger>
          </TabsList>

          {/* Customer */}
          <TabsContent value="customer" className="space-y-3 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <FieldRow label="שם לקוח">
                <Input value={form.customer_name || ''} onChange={(e) => set('customer_name', e.target.value)} />
              </FieldRow>
              <FieldRow label="תעודת זהות">
                <Input value={form.customer_id_number || ''} onChange={(e) => set('customer_id_number', e.target.value)} />
              </FieldRow>
              <FieldRow label="טלפון ראשי">
                <Input value={form.customer_phone || ''} onChange={(e) => set('customer_phone', e.target.value)} dir="ltr" />
              </FieldRow>
              <FieldRow label="טלפון משני">
                <Input value={form.customer_phone_2 || ''} onChange={(e) => set('customer_phone_2', e.target.value)} dir="ltr" />
              </FieldRow>
              <FieldRow label="אימייל">
                <Input value={form.customer_email || ''} onChange={(e) => set('customer_email', e.target.value)} dir="ltr" />
              </FieldRow>
              <FieldRow label="כתובת מגורים">
                <Input value={form.customer_address || ''} onChange={(e) => set('customer_address', e.target.value)} />
              </FieldRow>
            </div>
          </TabsContent>

          {/* Insurance */}
          <TabsContent value="insurance" className="space-y-3 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <FieldRow label="חברת ביטוח">
                <Input value={form.insurance_company || ''} onChange={(e) => set('insurance_company', e.target.value)} />
              </FieldRow>
              <FieldRow label="חבילה">
                <Input value={form.membership_package || ''} onChange={(e) => set('membership_package', e.target.value)} />
              </FieldRow>
              <FieldRow label="מספר מנוי">
                <Input value={form.membership_number || ''} onChange={(e) => set('membership_number', e.target.value)} dir="ltr" />
              </FieldRow>
            </div>
            <FieldRow label="פירוט כיסוי">
              <Textarea value={form.coverage_details || ''} onChange={(e) => set('coverage_details', e.target.value)} className="h-24" />
            </FieldRow>
          </TabsContent>

          {/* Vehicle */}
          <TabsContent value="vehicle" className="space-y-3 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <FieldRow label="מספר רכב">
                <Input value={form.vehicle_plate || ''} onChange={(e) => set('vehicle_plate', e.target.value)} dir="ltr" />
              </FieldRow>
              <FieldRow label="דגם רכב">
                <Input value={form.vehicle_model || ''} onChange={(e) => set('vehicle_model', e.target.value)} />
              </FieldRow>
              <FieldRow label="שנת ייצור">
                <Input type="number" value={form.vehicle_year || ''} onChange={(e) => set('vehicle_year', e.target.value ? Number(e.target.value) : null)} />
              </FieldRow>
              <FieldRow label="סוג רכב">
                <SelectField value={form.vehicle_type} onValueChange={(v) => set('vehicle_type', v)} options={vehicleTypeOptions} />
              </FieldRow>
              <FieldRow label="סוג דלק">
                <SelectField value={form.fuel_type} onValueChange={(v) => set('fuel_type', v)} options={fuelTypeOptions} />
              </FieldRow>
              <FieldRow label="קודן לרכב">
                <Input value={form.vehicle_code || ''} onChange={(e) => set('vehicle_code', e.target.value)} />
              </FieldRow>
            </div>
          </TabsContent>

          {/* Issue */}
          <TabsContent value="issue" className="space-y-3 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <FieldRow label="סוג תקלה">
                <SelectField value={form.issue_type} onValueChange={(v) => set('issue_type', v)} options={issueTypeOptions} />
              </FieldRow>
              <FieldRow label="מיקום מפתח">
                <Input value={form.key_location || ''} onChange={(e) => set('key_location', e.target.value)} />
              </FieldRow>
            </div>
            <FieldRow label="תיאור התקלה">
              <Textarea value={form.issue_description || ''} onChange={(e) => set('issue_description', e.target.value)} className="h-24" />
            </FieldRow>
            <FieldRow label="הוראות תפעול">
              <Textarea value={form.operation_instructions || ''} onChange={(e) => set('operation_instructions', e.target.value)} className="h-20" />
            </FieldRow>
          </TabsContent>

          {/* Location */}
          <TabsContent value="location" className="space-y-4 mt-4">
            <h3 className="font-semibold text-sm">מיקום למתן שירות</h3>
            <div className="grid grid-cols-2 gap-3">
              <FieldRow label="כתובת">
                <Input value={form.pickup_location_address || ''} onChange={(e) => set('pickup_location_address', e.target.value)} />
              </FieldRow>
              <FieldRow label="עיר">
                <Input value={form.pickup_location_city || ''} onChange={(e) => set('pickup_location_city', e.target.value)} />
              </FieldRow>
              <FieldRow label="אזור">
                <SelectField value={form.pickup_location_area} onValueChange={(v) => set('pickup_location_area', v)} options={areaOptions} />
              </FieldRow>
            </div>

            <h3 className="font-semibold text-sm border-t pt-3">יעד פריקה (מוסך)</h3>
            <div className="grid grid-cols-2 gap-3">
              <FieldRow label="שם מוסך">
                <Input value={form.dropoff_garage_name || ''} onChange={(e) => set('dropoff_garage_name', e.target.value)} />
              </FieldRow>
              <FieldRow label="טלפון מוסך">
                <Input value={form.dropoff_garage_phone || ''} onChange={(e) => set('dropoff_garage_phone', e.target.value)} dir="ltr" />
              </FieldRow>
              <FieldRow label="כתובת יעד">
                <Input value={form.dropoff_location_address || ''} onChange={(e) => set('dropoff_location_address', e.target.value)} />
              </FieldRow>
              <FieldRow label="עיר יעד">
                <Input value={form.dropoff_location_city || ''} onChange={(e) => set('dropoff_location_city', e.target.value)} />
              </FieldRow>
              <FieldRow label="אזור יעד">
                <SelectField value={form.dropoff_location_area} onValueChange={(v) => set('dropoff_location_area', v)} options={areaOptions} />
              </FieldRow>
            </div>

            <h3 className="font-semibold text-sm border-t pt-3">מיקום אחסנה</h3>
            <div className="grid grid-cols-2 gap-3">
              <FieldRow label="כתובת אחסנה">
                <Input value={form.storage_location_address || ''} onChange={(e) => set('storage_location_address', e.target.value)} />
              </FieldRow>
              <FieldRow label="עיר אחסנה">
                <Input value={form.storage_location_city || ''} onChange={(e) => set('storage_location_city', e.target.value)} />
              </FieldRow>
              <FieldRow label="אזור אחסנה">
                <SelectField value={form.storage_location_area} onValueChange={(v) => set('storage_location_area', v)} options={areaOptions} />
              </FieldRow>
              <FieldRow label="ימי אחסנה">
                <Input type="number" value={form.storage_days || ''} onChange={(e) => set('storage_days', e.target.value ? Number(e.target.value) : null)} />
              </FieldRow>
            </div>
          </TabsContent>

          {/* Vendor */}
          <TabsContent value="vendor" className="space-y-3 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <FieldRow label="שם נותן שירות">
                <Input value={form.assigned_vendor_name || ''} onChange={(e) => set('assigned_vendor_name', e.target.value)} />
              </FieldRow>
              <FieldRow label="אזור נותן שירות">
                <SelectField value={form.assigned_vendor_area} onValueChange={(v) => set('assigned_vendor_area', v)} options={areaOptions} />
              </FieldRow>
              <FieldRow label="הודעה מוקדמת (דקות)">
                <Input type="number" value={form.early_notification_minutes ?? 30} onChange={(e) => set('early_notification_minutes', e.target.value ? Number(e.target.value) : null)} />
              </FieldRow>
              <FieldRow label="מרחק ק״מ">
                <Input type="number" value={form.estimated_distance_km || ''} onChange={(e) => set('estimated_distance_km', e.target.value ? Number(e.target.value) : null)} />
              </FieldRow>
            </div>
            <FieldRow label="הערות נותן שירות">
              <Textarea value={form.vendor_notes || ''} onChange={(e) => set('vendor_notes', e.target.value)} className="h-20" />
            </FieldRow>
            <FieldRow label="הערות מוקדן">
              <Textarea value={form.operator_notes || ''} onChange={(e) => set('operator_notes', e.target.value)} className="h-20" />
            </FieldRow>
          </TabsContent>

          {/* Technical questionnaire */}
          <TabsContent value="technical" className="space-y-3 mt-4">
            <BoolField label="גישה מלאה למשאית גרר" checked={form.is_road_accessible} onCheckedChange={(v) => set('is_road_accessible', v)} />
            <BoolField label="חניון תת קרקעי/מקורה" checked={form.is_underground_parking} onCheckedChange={(v) => set('is_underground_parking', v)} />
            <BoolField label="ידית ההילוכים על N" checked={form.is_gear_neutral} onCheckedChange={(v) => set('is_gear_neutral', v)} />
            <BoolField label="ההגה נעול" checked={form.is_steering_locked} onCheckedChange={(v) => set('is_steering_locked', v)} />
            <BoolField label="בלם יד משוחרר" checked={form.is_handbrake_released} onCheckedChange={(v) => set('is_handbrake_released', v)} />
            <BoolField label="כביש אגרה" checked={form.is_toll_road} onCheckedChange={(v) => set('is_toll_road', v)} />
            <BoolField label="לקוח ליד הרכב" checked={form.is_customer_with_vehicle} onCheckedChange={(v) => set('is_customer_with_vehicle', v)} />
            <BoolField label="יש מפתח" checked={form.has_key} onCheckedChange={(v) => set('has_key', v)} />
            <BoolField label="לקוח VIP" checked={form.is_vip} onCheckedChange={(v) => set('is_vip', v)} />
          </TabsContent>

          {/* Payment */}
          <TabsContent value="payment" className="space-y-3 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <FieldRow label="עלות לספק (לפני מע״מ)">
                <Input type="number" value={form.cost_to_vendor || ''} onChange={(e) => set('cost_to_vendor', e.target.value ? Number(e.target.value) : null)} />
              </FieldRow>
              <FieldRow label="סכום מהלקוח">
                <Input type="number" value={form.payment_amount_customer || ''} onChange={(e) => set('payment_amount_customer', e.target.value ? Number(e.target.value) : null)} />
              </FieldRow>
              <FieldRow label="אמצעי תשלום">
                <SelectField value={form.payment_type} onValueChange={(v) => set('payment_type', v)} options={paymentTypeOptions} />
              </FieldRow>
              <FieldRow label="תאריך תשלום">
                <Input type="date" value={form.payment_date || ''} onChange={(e) => set('payment_date', e.target.value)} />
              </FieldRow>
              <FieldRow label="סיבת תשלום">
                <Input value={form.payment_reason || ''} onChange={(e) => set('payment_reason', e.target.value)} />
              </FieldRow>
            </div>
            <BoolField label="לקוח משלם" checked={form.payment_required} onCheckedChange={(v) => set('payment_required', v)} />
          </TabsContent>

          {/* Status */}
          <TabsContent value="status" className="space-y-3 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <FieldRow label="סטטוס קריאה">
                <SelectField value={form.call_status} onValueChange={(v) => set('call_status', v)} options={statusOptions} />
              </FieldRow>
              <FieldRow label="עדיפות">
                <SelectField value={form.call_priority} onValueChange={(v) => set('call_priority', v)} options={priorityOptions} />
              </FieldRow>
              <FieldRow label="מקור הקריאה">
                <SelectField value={form.created_by_source} onValueChange={(v) => set('created_by_source', v)} options={[
                  { value: 'bot', label: 'בוט' },
                  { value: 'operator', label: 'מוקדן' },
                  { value: 'customer_app', label: 'אפליקציית לקוח' },
                  { value: 'vendor_interface', label: 'ממשק ספק' },
                ]} />
              </FieldRow>
              <FieldRow label="יעד SLA (דקות)">
                <Input type="number" value={form.sla_target ?? 30} onChange={(e) => set('sla_target', e.target.value ? Number(e.target.value) : null)} />
              </FieldRow>
            </div>
            <FieldRow label="שירות עתידי - תאריך">
              <Input type="date" value={form.future_service_date || ''} onChange={(e) => set('future_service_date', e.target.value)} />
            </FieldRow>
            <FieldRow label="שירות עתידי - טווח שעות">
              <Input value={form.future_service_time_range || ''} onChange={(e) => set('future_service_time_range', e.target.value)} placeholder="09:00-12:00" />
            </FieldRow>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>ביטול</Button>
          <Button onClick={handleSave} isLoading={saving} className="gap-2">
            <Save className="w-4 h-4" />
            שמור שינויים
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}