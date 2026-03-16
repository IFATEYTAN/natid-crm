/**
 * InsuranceAgentPackages.jsx
 * -------------------------------------------------------
 * מודול חבילות משולבות לסוכני ביטוח (משימה 313 + 282)
 * -------------------------------------------------------
 * מאפשר הגדרת חבילות שירות מיוחדות לסוכני ביטוח:
 * - הגדרת שירותים כלולים בחבילה
 * - מחיר חבילה מיוחד לסוכן
 * - מגבלות שימוש (כמות קריאות, תקופה)
 * - שיוך חבילה ללקוח / לסוכן
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { showToast } from '@/components/ui/FeedbackToast';
import { Package, Plus, Pencil, Trash2, CheckCircle, Users, ShieldCheck } from 'lucide-react';

// Service types available in packages
const PACKAGE_SERVICES = [
  { key: 'towing', label: 'גרירה' },
  { key: 'flat_tire', label: "פנצ'ר" },
  { key: 'battery', label: 'מצבר' },
  { key: 'lockout', label: 'פתיחת רכב' },
  { key: 'fuel', label: 'דלק' },
  { key: 'accident', label: 'תאונה' },
  { key: 'mechanical', label: 'תקלה מכנית' },
];

const PACKAGE_PERIODS = [
  { key: 'monthly', label: 'חודשי' },
  { key: 'quarterly', label: 'רבעוני' },
  { key: 'annual', label: 'שנתי' },
  { key: 'unlimited', label: 'ללא הגבלה' },
];

const emptyPackage = {
  name: '',
  description: '',
  agent_name: '',
  agent_phone: '',
  insurance_company: '',
  included_services: [],
  max_calls: '',
  period: 'annual',
  price_per_call: '',
  package_price: '',
  discount_percent: '',
  notes: '',
  is_active: true,
};

export default function InsuranceAgentPackages() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingPackage, setEditingPackage] = useState(null);
  const [formData, setFormData] = useState(emptyPackage);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch packages from base44 entity
  const { data: packages = [], isLoading } = useQuery({
    queryKey: ['insuranceAgentPackages'],
    queryFn: () => base44.entities.InsuranceAgentPackage?.list?.() || Promise.resolve([]),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.InsuranceAgentPackage.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insuranceAgentPackages'] });
      showToast.success('חבילה נוצרה בהצלחה');
      setShowDialog(false);
      setFormData(emptyPackage);
    },
    onError: (err) => showToast.error(`שגיאה ביצירת חבילה: ${err.message}`),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.InsuranceAgentPackage.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insuranceAgentPackages'] });
      showToast.success('חבילה עודכנה בהצלחה');
      setShowDialog(false);
      setEditingPackage(null);
    },
    onError: (err) => showToast.error(`שגיאה בעדכון חבילה: ${err.message}`),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.InsuranceAgentPackage.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insuranceAgentPackages'] });
      showToast.success('חבילה נמחקה');
    },
    onError: (err) => showToast.error(`שגיאה במחיקת חבילה: ${err.message}`),
  });

  const handleOpenNew = () => {
    setEditingPackage(null);
    setFormData(emptyPackage);
    setShowDialog(true);
  };

  const handleOpenEdit = (pkg) => {
    setEditingPackage(pkg);
    setFormData({ ...pkg });
    setShowDialog(true);
  };

  const handleSubmit = () => {
    if (!formData.name?.trim()) {
      showToast.error('שם החבילה הוא שדה חובה');
      return;
    }
    if (editingPackage) {
      updateMutation.mutate({ id: editingPackage.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const toggleService = (serviceKey) => {
    setFormData((prev) => {
      const current = prev.included_services || [];
      const updated = current.includes(serviceKey)
        ? current.filter((s) => s !== serviceKey)
        : [...current, serviceKey];
      return { ...prev, included_services: updated };
    });
  };

  const filteredPackages = packages.filter(
    (p) =>
      p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.agent_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.insurance_company?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-bold text-[#212121] flex items-center gap-2">
            <Package className="w-7 h-7 text-blue-600" />
            חבילות משולבות לסוכני ביטוח
          </h1>
          <p className="text-[#616161] text-sm mt-1">
            הגדרת חבילות שירות מיוחדות לסוכנים ולחברות ביטוח (משימה 313 + 282)
          </p>
        </div>
        <Button onClick={handleOpenNew} className="gap-2 bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4" />
          חבילה חדשה
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Input
          placeholder="חיפוש לפי שם חבילה, סוכן, חברת ביטוח..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pr-4"
        />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Package className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">{packages.length}</div>
                <div className="text-xs text-gray-500">סה"כ חבילות</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {packages.filter((p) => p.is_active).length}
                </div>
                <div className="text-xs text-gray-500">חבילות פעילות</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-50 rounded-lg">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {new Set(packages.map((p) => p.insurance_company).filter(Boolean)).size}
                </div>
                <div className="text-xs text-gray-500">חברות ביטוח</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Packages Grid */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-400">טוען חבילות...</div>
      ) : filteredPackages.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-400">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>אין חבילות מוגדרות עדיין</p>
            <Button onClick={handleOpenNew} variant="outline" className="mt-4 gap-2">
              <Plus className="w-4 h-4" />
              צור חבילה ראשונה
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPackages.map((pkg) => (
            <Card key={pkg.id} className={`border-2 ${pkg.is_active ? 'border-blue-100' : 'border-gray-100 opacity-60'}`}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-blue-600" />
                      {pkg.name}
                    </CardTitle>
                    {pkg.insurance_company && (
                      <p className="text-xs text-gray-500 mt-1">{pkg.insurance_company}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant={pkg.is_active ? 'default' : 'secondary'} className="text-xs">
                      {pkg.is_active ? 'פעיל' : 'לא פעיל'}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {pkg.agent_name && (
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">סוכן: </span>{pkg.agent_name}
                    {pkg.agent_phone && <span className="mr-2 text-gray-400">{pkg.agent_phone}</span>}
                  </div>
                )}
                {pkg.description && (
                  <p className="text-sm text-gray-500">{pkg.description}</p>
                )}
                {/* Included Services */}
                {pkg.included_services?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {pkg.included_services.map((s) => (
                      <Badge key={s} variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                        {PACKAGE_SERVICES.find((ps) => ps.key === s)?.label || s}
                      </Badge>
                    ))}
                  </div>
                )}
                {/* Pricing */}
                <div className="flex items-center gap-4 text-sm">
                  {pkg.package_price && (
                    <span className="font-semibold text-green-700">מחיר חבילה: ₪{pkg.package_price}</span>
                  )}
                  {pkg.price_per_call && (
                    <span className="text-gray-500">לקריאה: ₪{pkg.price_per_call}</span>
                  )}
                  {pkg.discount_percent && (
                    <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-xs">
                      {pkg.discount_percent}% הנחה
                    </Badge>
                  )}
                </div>
                {pkg.max_calls && (
                  <div className="text-xs text-gray-500">
                    עד {pkg.max_calls} קריאות | {PACKAGE_PERIODS.find((p) => p.key === pkg.period)?.label || pkg.period}
                  </div>
                )}
                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <Button variant="outline" size="sm" className="gap-1" onClick={() => handleOpenEdit(pkg)}>
                    <Pencil className="w-3 h-3" />
                    עריכה
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => {
                      if (confirm('האם למחוק חבילה זו?')) deleteMutation.mutate(pkg.id);
                    }}
                  >
                    <Trash2 className="w-3 h-3" />
                    מחיקה
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingPackage ? 'עריכת חבילה' : 'חבילה חדשה'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>שם החבילה *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="לדוגמה: חבילת פרימיום - מגדל"
                />
              </div>
              <div>
                <Label>חברת ביטוח</Label>
                <Input
                  value={formData.insurance_company}
                  onChange={(e) => setFormData({ ...formData, insurance_company: e.target.value })}
                  placeholder="מגדל, הפניקס, כלל..."
                />
              </div>
              <div>
                <Label>שם הסוכן</Label>
                <Input
                  value={formData.agent_name}
                  onChange={(e) => setFormData({ ...formData, agent_name: e.target.value })}
                />
              </div>
              <div>
                <Label>טלפון סוכן</Label>
                <Input
                  value={formData.agent_phone}
                  onChange={(e) => setFormData({ ...formData, agent_phone: e.target.value })}
                  placeholder="050..."
                />
              </div>
              <div>
                <Label>תקופת חבילה</Label>
                <Select
                  value={formData.period}
                  onValueChange={(v) => setFormData({ ...formData, period: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PACKAGE_PERIODS.map((p) => (
                      <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Included Services */}
            <div>
              <Label className="mb-2 block">שירותים כלולים בחבילה</Label>
              <div className="grid grid-cols-3 gap-2">
                {PACKAGE_SERVICES.map((s) => (
                  <div
                    key={s.key}
                    onClick={() => toggleService(s.key)}
                    className={`cursor-pointer p-2 rounded-lg border text-sm text-center transition-colors ${
                      formData.included_services?.includes(s.key)
                        ? 'bg-blue-50 border-blue-400 text-blue-700 font-medium'
                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {s.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Pricing */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>מחיר חבילה (₪)</Label>
                <Input
                  type="number"
                  value={formData.package_price}
                  onChange={(e) => setFormData({ ...formData, package_price: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div>
                <Label>מחיר לקריאה (₪)</Label>
                <Input
                  type="number"
                  value={formData.price_per_call}
                  onChange={(e) => setFormData({ ...formData, price_per_call: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div>
                <Label>הנחה (%)</Label>
                <Input
                  type="number"
                  value={formData.discount_percent}
                  onChange={(e) => setFormData({ ...formData, discount_percent: e.target.value })}
                  placeholder="0"
                  min="0"
                  max="100"
                />
              </div>
              <div>
                <Label>מקסימום קריאות</Label>
                <Input
                  type="number"
                  value={formData.max_calls}
                  onChange={(e) => setFormData({ ...formData, max_calls: e.target.value })}
                  placeholder="ללא הגבלה"
                />
              </div>
            </div>

            <div>
              <Label>תיאור החבילה</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                placeholder="תיאור קצר של החבילה..."
              />
            </div>

            <div>
              <Label>הערות</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
                placeholder="הערות נוספות..."
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4"
              />
              <Label htmlFor="is_active" className="cursor-pointer">חבילה פעילה</Label>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDialog(false)}>ביטול</Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {editingPackage ? 'שמור שינויים' : 'צור חבילה'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
