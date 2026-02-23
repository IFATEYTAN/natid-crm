import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/components/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { AlertCircle, ArrowRight, Save } from 'lucide-react';
import { toast } from 'sonner';

const customerTypeLabels = {
  insurance_company: 'חברת ביטוח',
  fleet: 'ציי רכב',
  individual: 'פרטי',
  garage: 'מוסך',
  other: 'אחר',
};

const statusLabels = {
  active: 'פעיל',
  inactive: 'לא פעיל',
  suspended: 'מושהה',
};

const contractTypeLabels = {
  monthly: 'חודשי',
  yearly: 'שנתי',
  per_case: 'לפי מקרה',
  none: 'ללא',
};

export default function EditCustomer() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const id = searchParams.get('id');
  const queryClient = useQueryClient();
  const [form, setForm] = useState(null);

  const { data: customer, isLoading, isError } = useQuery({
    queryKey: ['customer', id],
    enabled: !!id,
    queryFn: async () => {
      const res = await base44.entities.Customer.filter({ id });
      return res?.[0] || null;
    },
  });

  useEffect(() => {
    if (customer && !form) {
      setForm({ ...customer });
    }
  }, [customer]);

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Customer.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', id] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('הלקוח עודכן בהצלחה');
    },
  });

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const { id: _id, created_date, updated_date, created_by, ...data } = form;
    updateMutation.mutate(data);
  };

  if (!id) {
    return (
      <div className="flex items-center justify-center min-h-[300px]" dir="rtl">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-orange-500 mb-3" />
            <h2 className="text-lg font-bold mb-1">חסר מזהה לקוח</h2>
            <Link to={createPageUrl('Customers')}>
              <Button variant="outline">חזרה לרשימת לקוחות</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading || !form) return <PageLoader text="טוען פרטי לקוח..." />;

  if (isError || !customer) {
    return (
      <div className="flex items-center justify-center min-h-[300px]" dir="rtl">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-3" />
            <h2 className="text-lg font-bold mb-1">הלקוח לא נמצא</h2>
            <Link to={createPageUrl('Customers')}>
              <Button variant="outline">חזרה לרשימת לקוחות</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">עריכת לקוח</h1>
          <p className="text-sm text-[#6b7280]">{customer.name}</p>
        </div>
        <Button variant="outline" className="gap-1" onClick={() => navigate(-1)}>
          <ArrowRight className="w-4 h-4" /> חזרה
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">פרטים כלליים</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>שם לקוח / חברה *</Label>
              <Input value={form.name || ''} onChange={(e) => handleChange('name', e.target.value)} required />
            </div>
            <div>
              <Label>סוג לקוח</Label>
              <Select value={form.customer_type || ''} onValueChange={(v) => handleChange('customer_type', v)}>
                <SelectTrigger><SelectValue placeholder="בחר סוג" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(customerTypeLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>סטטוס</Label>
              <Select value={form.status || 'active'} onValueChange={(v) => handleChange('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(statusLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>סוג חוזה</Label>
              <Select value={form.contract_type || 'none'} onValueChange={(v) => handleChange('contract_type', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(contractTypeLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">פרטי קשר</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>איש קשר</Label>
              <Input value={form.contact_person || ''} onChange={(e) => handleChange('contact_person', e.target.value)} />
            </div>
            <div>
              <Label>טלפון *</Label>
              <Input value={form.phone || ''} onChange={(e) => handleChange('phone', e.target.value)} required dir="ltr" />
            </div>
            <div>
              <Label>אימייל</Label>
              <Input type="email" value={form.email || ''} onChange={(e) => handleChange('email', e.target.value)} dir="ltr" />
            </div>
            <div>
              <Label>כתובת</Label>
              <Input value={form.address || ''} onChange={(e) => handleChange('address', e.target.value)} />
            </div>
            <div>
              <Label>עיר</Label>
              <Input value={form.city || ''} onChange={(e) => handleChange('city', e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">SLA ותקציב</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>SLA תגובה (דקות)</Label>
              <Input type="number" value={form.sla_response_minutes || ''} onChange={(e) => handleChange('sla_response_minutes', e.target.value ? Number(e.target.value) : null)} />
            </div>
            <div>
              <Label>SLA הגעה (דקות)</Label>
              <Input type="number" value={form.sla_arrival_minutes || ''} onChange={(e) => handleChange('sla_arrival_minutes', e.target.value ? Number(e.target.value) : null)} />
            </div>
            <div>
              <Label>תקציב חודשי</Label>
              <Input type="number" value={form.monthly_budget || ''} onChange={(e) => handleChange('monthly_budget', e.target.value ? Number(e.target.value) : null)} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">הערות</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={form.notes || ''}
              onChange={(e) => handleChange('notes', e.target.value)}
              rows={4}
              placeholder="הערות נוספות..."
            />
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>ביטול</Button>
          <Button type="submit" className="gap-2" isLoading={updateMutation.isPending}>
            <Save className="w-4 h-4" />
            שמור שינויים
          </Button>
        </div>
      </form>
    </div>
  );
}