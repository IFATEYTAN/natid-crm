import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Package, Plus, Pencil, Trash2, Search } from 'lucide-react';
import { toast } from 'sonner';

const categoryLabels = {
  battery: 'מצבר',
  tire: 'צמיג',
  fuel: 'דלק',
  lock: 'מנעולן',
  accessory: 'אביזר',
  labor: 'עבודה',
  other: 'אחר',
};

const emptyForm = {
  name: '', sku: '', category: 'other', unit_price: '', cost_price: '',
  stock_quantity: 0, is_active: true, description: '', supplier: '', vat_included: true,
};

export default function ProductCatalogPage() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['allProducts'],
    queryFn: () => base44.entities.Product.list(),
  });

  const filtered = products.filter(p =>
    !search || p.name?.includes(search) || p.sku?.includes(search)
  );

  const openCreate = () => {
    setEditingProduct(null);
    setForm(emptyForm);
    setShowDialog(true);
  };

  const openEdit = (product) => {
    setEditingProduct(product);
    setForm({
      name: product.name || '',
      sku: product.sku || '',
      category: product.category || 'other',
      unit_price: product.unit_price?.toString() || '',
      cost_price: product.cost_price?.toString() || '',
      stock_quantity: product.stock_quantity || 0,
      is_active: product.is_active !== false,
      description: product.description || '',
      supplier: product.supplier || '',
      vat_included: product.vat_included !== false,
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.unit_price) return toast.error('יש למלא שם ומחיר');
    setSaving(true);
    const data = {
      ...form,
      unit_price: parseFloat(form.unit_price),
      cost_price: form.cost_price ? parseFloat(form.cost_price) : null,
      stock_quantity: parseInt(form.stock_quantity) || 0,
    };

    if (editingProduct) {
      await base44.entities.Product.update(editingProduct.id, data);
    } else {
      await base44.entities.Product.create(data);
    }

    queryClient.invalidateQueries({ queryKey: ['allProducts'] });
    queryClient.invalidateQueries({ queryKey: ['products'] });
    setShowDialog(false);
    setSaving(false);
    toast.success(editingProduct ? 'מוצר עודכן' : 'מוצר נוצר');
  };

  const handleDelete = async (id) => {
    await base44.entities.Product.delete(id);
    queryClient.invalidateQueries({ queryKey: ['allProducts'] });
    toast.success('מוצר נמחק');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="w-6 h-6 text-[#3b82f6]" />
            קטלוג מוצרים
          </h1>
          <p className="text-sm text-gray-500 mt-1">ניהול מוצרים למכירה בקריאות שירות</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" /> מוצר חדש
        </Button>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder={'חיפוש לפי שם או מק"ט...'} className="pr-10" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map(product => (
          <Card key={product.id} className={`bg-white ${!product.is_active ? 'opacity-60' : ''}`}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-sm">{product.name}</h3>
                  {product.sku && <p className="text-xs text-gray-400">מק"ט: {product.sku}</p>}
                </div>
                <Badge className="bg-gray-100 text-gray-700 text-xs">{categoryLabels[product.category] || product.category}</Badge>
              </div>
              <div className="flex items-center justify-between mt-3">
                <div>
                  <span className="font-bold text-lg">₪{product.unit_price?.toLocaleString()}</span>
                  {product.cost_price && <span className="text-xs text-gray-400 mr-2">עלות: ₪{product.cost_price}</span>}
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(product)}>
                    <Pencil className="w-3 h-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400" onClick={() => handleDelete(product.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              {product.stock_quantity != null && (
                <p className="text-xs text-gray-400 mt-1">מלאי: {product.stock_quantity}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && !isLoading && (
        <div className="text-center py-12 text-gray-400">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>לא נמצאו מוצרים</p>
        </div>
      )}

      {/* Product Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingProduct ? 'עריכת מוצר' : 'מוצר חדש'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>שם מוצר</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <Label>מק"ט</Label>
                <Input value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>קטגוריה</Label>
                <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>כמות במלאי</Label>
                <Input type="number" value={form.stock_quantity} onChange={e => setForm({ ...form, stock_quantity: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>מחיר מכירה (₪)</Label>
                <Input type="number" value={form.unit_price} onChange={e => setForm({ ...form, unit_price: e.target.value })} />
              </div>
              <div>
                <Label>מחיר עלות (₪)</Label>
                <Input type="number" value={form.cost_price} onChange={e => setForm({ ...form, cost_price: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>ספק</Label>
              <Input value={form.supplier} onChange={e => setForm({ ...form, supplier: e.target.value })} />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} />
                <Label className="mb-0">פעיל</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.vat_included} onCheckedChange={v => setForm({ ...form, vat_included: v })} />
                <Label className="mb-0">כולל מע"מ</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>ביטול</Button>
            <Button onClick={handleSave} isLoading={saving}>{editingProduct ? 'עדכן' : 'צור'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}