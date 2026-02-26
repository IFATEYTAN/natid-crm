import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Calculator } from 'lucide-react';
import { showToast } from '@/components/ui/FeedbackToast';

const rateTypeLabels = {
  base: 'תעריף בסיס',
  time_surcharge: 'תוספת שעות',
  area_surcharge: 'תוספת אזור',
  toll_road: 'כביש אגרה',
  vehicle_type: 'סוג רכב',
  service_type: 'סוג שירות',
};

const areaOptions = [
  { value: 'center', label: 'מרכז' },
  { value: 'sharon', label: 'שרון' },
  { value: 'north', label: 'צפון' },
  { value: 'south', label: 'דרום' },
  { value: 'jerusalem', label: 'ירושלים' },
  { value: 'lowlands', label: 'שפלה' },
];

const vehicleTypeOptions = [
  { value: 'private', label: 'פרטי' },
  { value: 'commercial_light', label: 'מסחרי קל' },
  { value: 'truck', label: 'משאית' },
  { value: 'motorcycle', label: 'אופנוע' },
];

const emptyForm = {
  name: '', rate_type: 'base', condition_key: '', condition_label: '',
  amount: '', is_percentage: false, is_active: true,
  applies_from_hour: '', applies_to_hour: '',
  applies_to_areas: [], applies_to_vehicle_types: [],
  priority_order: 0, notes: '',
};

export default function PricingAgreementsTab() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingRate, setEditingRate] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const { data: rates = [], isLoading } = useQuery({
    queryKey: ['operationalRates'],
    queryFn: () => base44.entities.OperationalRate.list(),
  });

  const openCreate = () => {
    setEditingRate(null);
    setForm(emptyForm);
    setShowDialog(true);
  };

  const openEdit = (rate) => {
    setEditingRate(rate);
    setForm({
      name: rate.name || '',
      rate_type: rate.rate_type || 'base',
      condition_key: rate.condition_key || '',
      condition_label: rate.condition_label || '',
      amount: rate.amount?.toString() || '',
      is_percentage: rate.is_percentage || false,
      is_active: rate.is_active !== false,
      applies_from_hour: rate.applies_from_hour?.toString() || '',
      applies_to_hour: rate.applies_to_hour?.toString() || '',
      applies_to_areas: rate.applies_to_areas || [],
      applies_to_vehicle_types: rate.applies_to_vehicle_types || [],
      priority_order: rate.priority_order || 0,
      notes: rate.notes || '',
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.amount) return showToast.error('יש למלא שם וסכום');
    setSaving(true);
    const data = {
      ...form,
      amount: parseFloat(form.amount),
      applies_from_hour: form.applies_from_hour ? parseInt(form.applies_from_hour) : null,
      applies_to_hour: form.applies_to_hour ? parseInt(form.applies_to_hour) : null,
      priority_order: parseInt(form.priority_order) || 0,
    };

    if (editingRate) {
      await base44.entities.OperationalRate.update(editingRate.id, data);
    } else {
      await base44.entities.OperationalRate.create(data);
    }

    queryClient.invalidateQueries({ queryKey: ['operationalRates'] });
    setShowDialog(false);
    setSaving(false);
    showToast.success(editingRate ? 'תעריף עודכן' : 'תעריף נוצר');
  };

  const handleDelete = async (id) => {
    await base44.entities.OperationalRate.delete(id);
    queryClient.invalidateQueries({ queryKey: ['operationalRates'] });
    showToast.success('תעריף נמחק');
  };

  const toggleArea = (area) => {
    setForm(prev => ({
      ...prev,
      applies_to_areas: prev.applies_to_areas.includes(area)
        ? prev.applies_to_areas.filter(a => a !== area)
        : [...prev.applies_to_areas, area]
    }));
  };

  const toggleVehicle = (type) => {
    setForm(prev => ({
      ...prev,
      applies_to_vehicle_types: prev.applies_to_vehicle_types.includes(type)
        ? prev.applies_to_vehicle_types.filter(t => t !== type)
        : [...prev.applies_to_vehicle_types, type]
    }));
  };

  const grouped = Object.keys(rateTypeLabels).map(type => ({
    type,
    label: rateTypeLabels[type],
    rates: rates.filter(r => r.rate_type === type).sort((a, b) => (a.priority_order || 0) - (b.priority_order || 0)),
  }));

  return (
    <div className="space-y-6 text-right" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-[#3b82f6]" />
            תעריפון תפעול
          </h2>
          <p className="text-sm text-gray-500 mt-1">ניהול תעריפים לפי שעה, אזור, סוג רכב וכביש אגרה</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" /> תעריף חדש
        </Button>
      </div>

      {grouped.map(group => (
        <Card key={group.type} className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-600">{group.label}</CardTitle>
          </CardHeader>
          <CardContent>
            {group.rates.length === 0 ? (
              <p className="text-xs text-gray-400 py-2">אין תעריפים מסוג זה</p>
            ) : (
              <div className="space-y-2">
                {group.rates.map(rate => (
                  <div key={rate.id} className={`flex items-center justify-between p-3 rounded-lg border ${rate.is_active ? 'bg-white' : 'bg-gray-50 opacity-60'}`}>
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="font-medium text-sm">{rate.name}</div>
                        <div className="text-xs text-gray-500 flex items-center gap-2">
                          {rate.condition_label && <span>{rate.condition_label}</span>}
                          {rate.applies_from_hour != null && <span>שעות: {rate.applies_from_hour}:00-{rate.applies_to_hour}:00</span>}
                          {rate.applies_to_areas?.length > 0 && (
                            <span>אזורים: {rate.applies_to_areas.map(a => areaOptions.find(o => o.value === a)?.label || a).join(', ')}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={rate.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}>
                        {rate.is_percentage ? `${rate.amount}%` : `₪${rate.amount}`}
                      </Badge>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(rate)}>
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400" onClick={() => handleDelete(rate.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader><DialogTitle className="text-right">{editingRate ? 'עריכת תעריף' : 'תעריף חדש'}</DialogTitle></DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 text-right">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>שם תעריף</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <Label>סוג</Label>
                <Select value={form.rate_type} onValueChange={v => setForm({ ...form, rate_type: v })}>
                  <SelectTrigger dir="rtl"><SelectValue /></SelectTrigger>
                  <SelectContent dir="rtl">
                    {Object.entries(rateTypeLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>סכום</Label>
                <Input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
              </div>
              <div className="flex items-end gap-3 pb-1">
                <div className="flex items-center gap-2">
                  <Switch checked={form.is_percentage} onCheckedChange={v => setForm({ ...form, is_percentage: v })} />
                  <Label className="mb-0">{form.is_percentage ? 'אחוז (%)' : 'סכום קבוע (₪)'}</Label>
                </div>
              </div>
            </div>
            <div>
              <Label>תיאור תנאי</Label>
              <Input value={form.condition_label} onChange={e => setForm({ ...form, condition_label: e.target.value })} placeholder="למשל: תוספת לילה, תוספת צפון..." />
            </div>
            {form.rate_type === 'time_surcharge' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>משעה</Label>
                  <Input type="number" min={0} max={23} value={form.applies_from_hour} onChange={e => setForm({ ...form, applies_from_hour: e.target.value })} placeholder="0" />
                </div>
                <div>
                  <Label>עד שעה</Label>
                  <Input type="number" min={0} max={23} value={form.applies_to_hour} onChange={e => setForm({ ...form, applies_to_hour: e.target.value })} placeholder="24" />
                </div>
              </div>
            )}
            {form.rate_type === 'area_surcharge' && (
              <div>
                <Label>אזורים</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {areaOptions.map(a => (
                    <Badge key={a.value}
                      className={`cursor-pointer ${form.applies_to_areas.includes(a.value) ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}
                      onClick={() => toggleArea(a.value)}>
                      {a.label}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {form.rate_type === 'vehicle_type' && (
              <div>
                <Label>סוגי רכב</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {vehicleTypeOptions.map(v => (
                    <Badge key={v.value}
                      className={`cursor-pointer ${form.applies_to_vehicle_types.includes(v.value) ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}
                      onClick={() => toggleVehicle(v.value)}>
                      {v.label}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            <div className="flex items-center gap-2 mt-4">
              <Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} />
              <Label className="mb-0 mt-0 pt-0 flex self-center items-center h-full pt-[2px]">תעריף פעיל</Label>
            </div>
            <div className="mt-4">
              <Label>הערות</Label>
              <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="h-16" />
            </div>
          </div>
          <DialogFooter className="flex justify-start gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowDialog(false)}>ביטול</Button>
            <Button onClick={handleSave} isLoading={saving}>{editingRate ? 'עדכן' : 'צור'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}