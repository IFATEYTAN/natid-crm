import React, { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, FileText, DollarSign, Shield, MapPin, Upload, X, File } from 'lucide-react';
import { format, addYears } from 'date-fns';
import { showToast } from '@/components/ui/FeedbackToast';
import { coverageAreas } from '@/config/coverageConstants';

const serviceTypes = [
  { key: 'towing', label: 'גרירה' },
  { key: 'flat_tire', label: 'החלפת גלגל' },
  { key: 'battery_jump', label: 'הנעה ממצבר' },
  { key: 'fuel_delivery', label: 'הבאת דלק' },
  { key: 'locksmith', label: 'מנעולן' },
  { key: 'mechanic', label: 'מכונאי' },
];

export default function ContractFormDialog({ open, onOpenChange, vendors, contract, onSuccess }) {
  const isEdit = !!contract;

  const [formData, setFormData] = useState({
    vendor_id: '',
    vendor_name: '',
    contract_number: '',
    contract_type: 'per_call',
    status: 'draft',
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: format(addYears(new Date(), 1), 'yyyy-MM-dd'),
    auto_renew: false,
    renewal_period_months: 12,
    payment_terms: 'net_30',
    rate_per_call: 0,
    monthly_fee: 0,
    hourly_rate: 0,
    minimum_calls: 0,
    maximum_calls: 0,
    bonus_threshold: 0,
    bonus_rate: 0,
    penalty_late_arrival: 0,
    penalty_cancellation: 0,
    coverage_areas: [],
    service_types: [],
    sla_response_minutes: 5,
    sla_arrival_minutes: 30,
    insurance_required: true,
    insurance_minimum_amount: 1000000,
    special_terms: '',
    notes: '',
    document_url: '',
  });

  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (contract) {
      setFormData({
        ...formData,
        ...contract,
        start_date: contract.start_date?.split('T')[0] || formData.start_date,
        end_date: contract.end_date?.split('T')[0] || formData.end_date,
      });
    } else {
      // Generate contract number
      setFormData((prev) => ({
        ...prev,
        contract_number: `CON-${Date.now().toString().slice(-6)}`,
      }));
    }
  }, [contract, open]);

  const handleVendorChange = (vendorId) => {
    const vendor = vendors.find((v) => v.id === vendorId);
    setFormData((prev) => ({
      ...prev,
      vendor_id: vendorId,
      vendor_name: vendor?.vendor_name || '',
      coverage_areas: vendor?.coverage_areas || [],
      service_types: vendor?.service_type || [],
    }));
  };

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.VendorContract.create(data),
    onSuccess: () => {
      onSuccess?.();
    },
    onError: (error) => {
      showToast.error('שגיאה ביצירת החוזה');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.VendorContract.update(contract.id, data),
    onSuccess: () => {
      onSuccess?.();
    },
    onError: (error) => {
      showToast.error('שגיאה בעדכון החוזה');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.vendor_id) {
      showToast.error('נא לבחור ספק');
      return;
    }

    if (isEdit) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleAreaChange = (area, checked) => {
    setFormData((prev) => ({
      ...prev,
      coverage_areas: checked
        ? [...prev.coverage_areas, area]
        : prev.coverage_areas.filter((a) => a !== area),
    }));
  };

  const handleServiceChange = (service, checked) => {
    setFormData((prev) => ({
      ...prev,
      service_types: checked
        ? [...prev.service_types, service]
        : prev.service_types.filter((s) => s !== service),
    }));
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      showToast.error('הקובץ גדול מדי (מקסימום 10MB)');
      return;
    }

    try {
      setUploading(true);
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData((prev) => ({ ...prev, document_url: file_url }));
      showToast.success('הקובץ הועלה בהצלחה');
    } catch (error) {
      console.error('Upload error:', error);
      showToast.error('שגיאה בהעלאת הקובץ');
    } finally {
      setUploading(false);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto text-right" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-right">
            <FileText className="w-5 h-5" />
            {isEdit ? 'עריכת חוזה' : 'יצירת חוזה חדש'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="basic" className="w-full" dir="rtl">
            <TabsList className="grid grid-cols-4 w-full" dir="rtl">
              <TabsTrigger value="basic">פרטים בסיסיים</TabsTrigger>
              <TabsTrigger value="pricing">תמחור</TabsTrigger>
              <TabsTrigger value="coverage">כיסוי</TabsTrigger>
              <TabsTrigger value="terms">תנאים</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>ספק *</Label>
                  <Select
                    value={formData.vendor_id}
                    onValueChange={handleVendorChange}
                    disabled={isEdit}
                    dir="rtl"
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="בחר ספק" />
                    </SelectTrigger>
                    <SelectContent dir="rtl">
                      {vendors.map((vendor) => (
                        <SelectItem key={vendor.id} value={vendor.id}>
                          {vendor.vendor_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>מספר חוזה</Label>
                  <Input
                    value={formData.contract_number}
                    onChange={(e) => setFormData({ ...formData, contract_number: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>סוג חוזה *</Label>
                  <Select
                    value={formData.contract_type}
                    onValueChange={(v) => setFormData({ ...formData, contract_type: v })}
                    dir="rtl"
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent dir="rtl">
                      <SelectItem value="per_call">לפי קריאה</SelectItem>
                      <SelectItem value="monthly">חודשי</SelectItem>
                      <SelectItem value="yearly">שנתי</SelectItem>
                      <SelectItem value="hourly">שעתי</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>סטטוס</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(v) => setFormData({ ...formData, status: v })}
                    dir="rtl"
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent dir="rtl">
                      <SelectItem value="draft">טיוטה</SelectItem>
                      <SelectItem value="pending_approval">ממתין לאישור</SelectItem>
                      <SelectItem value="active">פעיל</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>תאריך התחלה *</Label>
                  <Input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label>תאריך סיום *</Label>
                  <Input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                <Switch
                  checked={formData.auto_renew}
                  onCheckedChange={(checked) => setFormData({ ...formData, auto_renew: checked })}
                />
                <div>
                  <Label>חידוש אוטומטי</Label>
                  <p className="text-xs text-gray-500">החוזה יחודש אוטומטית בתום התקופה</p>
                </div>
                {formData.auto_renew && (
                  <div className="mr-auto">
                    <Label>תקופת חידוש (חודשים)</Label>
                    <Input
                      type="number"
                      className="w-20"
                      value={formData.renewal_period_months}
                      onChange={(e) =>
                        setFormData({ ...formData, renewal_period_months: Number(e.target.value) })
                      }
                    />
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="pricing" className="space-y-4 mt-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-3 flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  תעריפים
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  {formData.contract_type === 'per_call' && (
                    <div>
                      <Label>תעריף לקריאה (₪)</Label>
                      <Input
                        type="number"
                        value={formData.rate_per_call || ''}
                        onChange={(e) =>
                          setFormData({ ...formData, rate_per_call: Number(e.target.value) })
                        }
                      />
                    </div>
                  )}
                  {formData.contract_type === 'monthly' && (
                    <div>
                      <Label>דמי חודש (₪)</Label>
                      <Input
                        type="number"
                        value={formData.monthly_fee || ''}
                        onChange={(e) =>
                          setFormData({ ...formData, monthly_fee: Number(e.target.value) })
                        }
                      />
                    </div>
                  )}
                  {formData.contract_type === 'hourly' && (
                    <div>
                      <Label>תעריף שעתי (₪)</Label>
                      <Input
                        type="number"
                        value={formData.hourly_rate || ''}
                        onChange={(e) =>
                          setFormData({ ...formData, hourly_rate: Number(e.target.value) })
                        }
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>מינימום קריאות</Label>
                  <Input
                    type="number"
                    value={formData.minimum_calls || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, minimum_calls: Number(e.target.value) })
                    }
                  />
                </div>
                <div>
                  <Label>מקסימום קריאות</Label>
                  <Input
                    type="number"
                    value={formData.maximum_calls || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, maximum_calls: Number(e.target.value) })
                    }
                  />
                </div>
              </div>

              <div className="p-4 bg-green-50 rounded-lg">
                <h4 className="font-medium text-green-800 mb-3">בונוסים</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>סף לבונוס (קריאות)</Label>
                    <Input
                      type="number"
                      value={formData.bonus_threshold || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, bonus_threshold: Number(e.target.value) })
                      }
                    />
                  </div>
                  <div>
                    <Label>אחוז בונוס (%)</Label>
                    <Input
                      type="number"
                      value={formData.bonus_rate || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, bonus_rate: Number(e.target.value) })
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 bg-red-50 rounded-lg">
                <h4 className="font-medium text-red-800 mb-3">קנסות</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>קנס איחור בהגעה (₪)</Label>
                    <Input
                      type="number"
                      value={formData.penalty_late_arrival || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, penalty_late_arrival: Number(e.target.value) })
                      }
                    />
                  </div>
                  <div>
                    <Label>קנס ביטול (₪)</Label>
                    <Input
                      type="number"
                      value={formData.penalty_cancellation || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, penalty_cancellation: Number(e.target.value) })
                      }
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label>תנאי תשלום</Label>
                <Select
                  value={formData.payment_terms}
                  onValueChange={(v) => setFormData({ ...formData, payment_terms: v })}
                  dir="rtl"
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="net_0">מיידי</SelectItem>
                    <SelectItem value="net_15">שוטף + 15</SelectItem>
                    <SelectItem value="net_30">שוטף + 30</SelectItem>
                    <SelectItem value="net_45">שוטף + 45</SelectItem>
                    <SelectItem value="net_60">שוטף + 60</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="coverage" className="space-y-4 mt-4">
              <div>
                <Label className="mb-3 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  אזורי כיסוי
                </Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {coverageAreas.map((area) => (
                    <div key={area.key} className="flex items-center gap-2">
                      <Checkbox
                        id={`area-${area.key}`}
                        checked={formData.coverage_areas.includes(area.key)}
                        onCheckedChange={(checked) => handleAreaChange(area.key, checked)}
                      />
                      <label htmlFor={`area-${area.key}`} className="text-sm cursor-pointer">
                        {area.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label className="mb-3">סוגי שירות</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {serviceTypes.map((service) => (
                    <div key={service.key} className="flex items-center gap-2">
                      <Checkbox
                        id={`service-${service.key}`}
                        checked={formData.service_types.includes(service.key)}
                        onCheckedChange={(checked) => handleServiceChange(service.key, checked)}
                      />
                      <label htmlFor={`service-${service.key}`} className="text-sm cursor-pointer">
                        {service.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-purple-50 rounded-lg">
                <h4 className="font-medium text-purple-800 mb-3">SLA - רמת שירות</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>זמן תגובה מקסימלי (דקות)</Label>
                    <Input
                      type="number"
                      value={formData.sla_response_minutes || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, sla_response_minutes: Number(e.target.value) })
                      }
                    />
                  </div>
                  <div>
                    <Label>זמן הגעה מקסימלי (דקות)</Label>
                    <Input
                      type="number"
                      value={formData.sla_arrival_minutes || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, sla_arrival_minutes: Number(e.target.value) })
                      }
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="terms" className="space-y-4 mt-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  דרישות ביטוח
                </h4>
                <div className="flex items-center gap-4 mb-3">
                  <Switch
                    checked={formData.insurance_required}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, insurance_required: checked })
                    }
                  />
                  <Label>נדרש ביטוח</Label>
                </div>
                {formData.insurance_required && (
                  <div>
                    <Label>סכום ביטוח מינימלי (₪)</Label>
                    <Input
                      type="number"
                      value={formData.insurance_minimum_amount || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          insurance_minimum_amount: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                )}
              </div>

              <div>
                <Label>מסמך החוזה (PDF)</Label>
                <div className="mt-2">
                  {formData.document_url ? (
                    <div className="flex items-center gap-2 p-3 bg-gray-50 border rounded-lg">
                      <File className="w-5 h-5 text-blue-600" />
                      <span className="text-sm flex-1 truncate">מסמך מצורף</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setFormData({ ...formData, document_url: '' })}
                        className="text-red-500 hover:bg-red-50"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        accept="application/pdf"
                        onChange={handleFileUpload}
                        disabled={uploading}
                        className="hidden"
                        id="contract-upload"
                      />
                      <Label
                        htmlFor="contract-upload"
                        className="flex items-center gap-2 px-4 py-2 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors w-full justify-center text-gray-600"
                      >
                        {uploading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Upload className="w-4 h-4" />
                        )}
                        {uploading ? 'מעלה...' : 'העלה קובץ PDF'}
                      </Label>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <Label>תנאים מיוחדים</Label>
                <Textarea
                  rows={4}
                  value={formData.special_terms}
                  onChange={(e) => setFormData({ ...formData, special_terms: e.target.value })}
                  placeholder="תנאים מיוחדים שחלים על חוזה זה..."
                />
              </div>

              <div>
                <Label>הערות פנימיות</Label>
                <Textarea
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="הערות פנימיות (לא יוצגו לספק)..."
                />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6 flex justify-start gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              ביטול
            </Button>
            <Button type="submit" disabled={isPending} className="bg-[#3b82f6] hover:bg-[#2563eb]">
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin ml-2" />
                  שומר...
                </>
              ) : isEdit ? (
                'עדכן חוזה'
              ) : (
                'צור חוזה'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}