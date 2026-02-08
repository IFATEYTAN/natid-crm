import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { ShoppingCart, Plus, Trash2, Package } from 'lucide-react';
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

export default function CallProductsSection({ call, callId, currentUser }) {
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: callProducts = [] } = useQuery({
    queryKey: ['callProducts', callId],
    queryFn: () => base44.entities.CallProduct.filter({ call_id: callId }),
    enabled: !!callId,
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.filter({ is_active: true }),
  });

  const totalAmount = callProducts.reduce((sum, cp) => sum + (cp.total_price || 0), 0);

  const selectedProduct = products.find(p => p.id === selectedProductId);
  const calcTotal = selectedProduct
    ? selectedProduct.unit_price * quantity * (1 - discount / 100)
    : 0;

  const handleAdd = async () => {
    if (!selectedProduct) return toast.error('יש לבחור מוצר');
    setSaving(true);
    await base44.entities.CallProduct.create({
      call_id: callId,
      call_number: call?.call_number,
      product_id: selectedProduct.id,
      product_name: selectedProduct.name,
      product_sku: selectedProduct.sku || '',
      quantity,
      unit_price: selectedProduct.unit_price,
      discount_percent: discount,
      total_price: Math.round(calcTotal * 100) / 100,
      sold_by: currentUser?.full_name || 'מוקדן',
      notes,
    });
    queryClient.invalidateQueries({ queryKey: ['callProducts', callId] });
    setShowAddDialog(false);
    setSelectedProductId('');
    setQuantity(1);
    setDiscount(0);
    setNotes('');
    setSaving(false);
    toast.success('מוצר נוסף לקריאה');
  };

  const handleRemove = async (cpId) => {
    await base44.entities.CallProduct.delete(cpId);
    queryClient.invalidateQueries({ queryKey: ['callProducts', callId] });
    toast.success('מוצר הוסר');
  };

  return (
    <Card className="bg-white">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-[#3b82f6]" />
            מוצרים ורכישות
            {callProducts.length > 0 && (
              <Badge className="bg-blue-100 text-blue-800 text-xs">{callProducts.length} פריטים</Badge>
            )}
          </CardTitle>
          <Button size="sm" onClick={() => setShowAddDialog(true)} className="gap-1">
            <Plus className="w-3 h-3" /> הוסף מוצר
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {callProducts.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">לא נוספו מוצרים לקריאה זו</p>
        ) : (
          <div className="space-y-2">
            {/* Header */}
            <div className="grid grid-cols-12 gap-2 text-xs text-gray-500 font-medium px-2 pb-1 border-b">
              <div className="col-span-4">מוצר</div>
              <div className="col-span-1 text-center">כמות</div>
              <div className="col-span-2 text-center">מחיר</div>
              <div className="col-span-2 text-center">הנחה</div>
              <div className="col-span-2 text-center">סה"כ</div>
              <div className="col-span-1"></div>
            </div>

            {callProducts.map((cp) => (
              <div key={cp.id} className="grid grid-cols-12 gap-2 items-center text-sm px-2 py-1.5 hover:bg-gray-50 rounded">
                <div className="col-span-4">
                  <div className="font-medium">{cp.product_name}</div>
                  {cp.product_sku && <div className="text-xs text-gray-400">מק"ט: {cp.product_sku}</div>}
                </div>
                <div className="col-span-1 text-center">{cp.quantity}</div>
                <div className="col-span-2 text-center">₪{cp.unit_price?.toLocaleString()}</div>
                <div className="col-span-2 text-center">
                  {cp.discount_percent > 0 ? `${cp.discount_percent}%` : '-'}
                </div>
                <div className="col-span-2 text-center font-medium">₪{cp.total_price?.toLocaleString()}</div>
                <div className="col-span-1 text-center">
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400 hover:text-red-600"
                    onClick={() => handleRemove(cp.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}

            {/* Total */}
            <div className="border-t pt-2 px-2 flex justify-between items-center">
              <span className="font-medium text-sm">סה"כ מוצרים:</span>
              <span className="font-bold text-lg text-[#111827]">₪{totalAmount.toLocaleString()}</span>
            </div>
          </div>
        )}

        {/* Add Product Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent>
            <DialogHeader><DialogTitle>הוספת מוצר לקריאה</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>מוצר</Label>
                <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                  <SelectTrigger><SelectValue placeholder="בחר מוצר..." /></SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        <div className="flex items-center gap-2">
                          <Package className="w-3 h-3 text-gray-400" />
                          {p.name} {p.sku && `(${p.sku})`} - ₪{p.unit_price}
                          {p.category && <Badge variant="outline" className="text-xs mr-1">{categoryLabels[p.category] || p.category}</Badge>}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>כמות</Label>
                  <Input type="number" min={1} value={quantity} onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))} />
                </div>
                <div>
                  <Label>הנחה (%)</Label>
                  <Input type="number" min={0} max={100} value={discount} onChange={e => setDiscount(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))} />
                </div>
              </div>
              {selectedProduct && (
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <span className="text-sm text-gray-600">סה"כ: </span>
                  <span className="font-bold text-lg">₪{calcTotal.toFixed(2)}</span>
                </div>
              )}
              <div>
                <Label>הערות</Label>
                <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="הערות..." />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>ביטול</Button>
              <Button onClick={handleAdd} isLoading={saving} disabled={!selectedProductId}>הוסף מוצר</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}