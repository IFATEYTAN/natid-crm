import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import {
  listProducts,
  listBranches,
  listDepartments,
  createProduct,
  updateProduct,
  deactivateProduct,
  restoreProduct,
  deleteProductPermanently,
} from '@/lib/srvApi';
import QueryErrorState from '@/components/ui/QueryErrorState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Package, Plus, Pencil, Trash2, Search, RotateCcw, Ban } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Product catalog — srv GET/POST/PATCH /products (Phase 4 of the dispatcher
 * rebuild plan). Rebuilt against the real `products` table rather than
 * ported field-by-field from the Base44 `Product` entity this page used to
 * read: that entity's shape (sku/cost_price/stock_quantity/supplier/
 * description/vat_included) is a retail-inventory model with no backing in
 * the real schema — Nati's products are a service-catalog concept instead
 * (name/branch/department/price/group_name/main_product). See
 * srv.natid.co.il CLAUDE.md's Phase 4 products section.
 */

const emptyForm = {
  name: '',
  branch: '',
  department: '',
  price: '',
  group_name: '',
  main_product: false,
};

export default function ProductCatalogPage() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [pendingDelete, setPendingDelete] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const {
    data: products = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: queryKeys.products.list(),
    queryFn: () => listProducts().then((r) => r.data),
  });

  const { data: branches = [] } = useQuery({
    queryKey: queryKeys.lookups.branches(),
    queryFn: () => listBranches().then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const { data: departments = [] } = useQuery({
    queryKey: queryKeys.lookups.departments(),
    queryFn: () => listDepartments().then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const branchName = (id) => branches.find((b) => b.branch_id === id)?.branch_name ?? id;
  const departmentName = (id) =>
    departments.find((d) => d.department_id === id)?.department_name ?? id;

  const filtered = products.filter(
    (p) => !search || p.name?.includes(search) || p.group_name?.includes(search)
  );

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.products.list() });

  const openCreate = () => {
    setEditingProduct(null);
    setForm(emptyForm);
    setShowDialog(true);
  };

  const openEdit = (product) => {
    setEditingProduct(product);
    setForm({
      name: product.name || '',
      branch: product.branch != null ? String(product.branch) : '',
      department: product.department != null ? String(product.department) : '',
      price: product.price != null ? String(product.price) : '',
      group_name: product.group_name || '',
      main_product: !!product.main_product,
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.branch || !form.department || !form.price) {
      return toast.error('יש למלא שם, ענף, מחלקה ומחיר');
    }
    setSaving(true);
    try {
      const data = {
        name: form.name,
        branch: parseInt(form.branch, 10),
        department: parseInt(form.department, 10),
        price: parseFloat(form.price),
        group_name: form.group_name,
        main_product: form.main_product,
      };

      if (editingProduct) {
        await updateProduct(editingProduct.id, data);
      } else {
        await createProduct(data);
      }

      invalidate();
      setShowDialog(false);
      toast.success(editingProduct ? 'מוצר עודכן' : 'מוצר נוצר');
    } catch (err) {
      toast.error(err?.message || 'שמירת המוצר נכשלה');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (product) => {
    setBusyId(product.id);
    try {
      await deactivateProduct(product.id);
      invalidate();
      toast.success('המוצר הוצא משימוש');
    } catch (err) {
      toast.error(err?.message || 'הפעולה נכשלה');
    } finally {
      setBusyId(null);
    }
  };

  const handleRestore = async (product) => {
    setBusyId(product.id);
    try {
      await restoreProduct(product.id);
      invalidate();
      toast.success('המוצר שוחזר');
    } catch (err) {
      toast.error(err?.message || 'הפעולה נכשלה');
    } finally {
      setBusyId(null);
    }
  };

  const handlePermanentDelete = async () => {
    if (!pendingDelete) return;
    setBusyId(pendingDelete.id);
    try {
      await deleteProductPermanently(pendingDelete.id);
      invalidate();
      toast.success('המוצר נמחק לצמיתות');
    } catch (err) {
      toast.error(err?.message || 'המחיקה נכשלה');
    } finally {
      setBusyId(null);
      setPendingDelete(null);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="w-6 h-6 text-[#3b82f6]" />
            קטלוג מוצרים
          </h1>
          <p className="text-sm text-gray-500 mt-1">ניהול מוצרים ומחירים לפי מחלקה וענף</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" /> מוצר חדש
        </Button>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="חיפוש לפי שם או קבוצה..."
          className="ps-10"
        />
      </div>

      {isError && <QueryErrorState error={error} entityName="Product" />}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((product) => (
          <Card key={product.id} className={`bg-white ${product.isDeleted ? 'opacity-60' : ''}`}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2 gap-2">
                <div className="min-w-0">
                  <h3 className="font-semibold text-sm truncate">{product.name}</h3>
                  <p className="text-xs text-gray-400">
                    {departmentName(product.department)} · {branchName(product.branch)}
                  </p>
                  {product.group_name && (
                    <p className="text-xs text-gray-400">קבוצה: {product.group_name}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {product.main_product ? (
                    <Badge className="bg-blue-100 text-blue-700 text-xs">מוצר ראשי</Badge>
                  ) : null}
                  {product.isDeleted ? (
                    <Badge className="bg-gray-200 text-gray-600 text-xs">לא בשימוש</Badge>
                  ) : (
                    <Badge className="bg-emerald-100 text-emerald-700 text-xs">פעיל</Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between mt-3">
                <span className="font-bold text-lg">₪{Number(product.price).toLocaleString()}</span>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => openEdit(product)}
                    aria-label="עריכה"
                  >
                    <Pencil className="w-3 h-3" />
                  </Button>
                  {product.isDeleted ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-emerald-600"
                      onClick={() => handleRestore(product)}
                      disabled={busyId === product.id}
                      aria-label="שחזור"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-amber-600"
                      onClick={() => handleDeactivate(product)}
                      disabled={busyId === product.id}
                      aria-label="הוצאה משימוש"
                    >
                      <Ban className="w-3 h-3" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-red-400"
                    onClick={() => setPendingDelete(product)}
                    disabled={busyId === product.id}
                    aria-label="מחיקה לצמיתות"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && !isLoading && !isError && (
        <div className="text-center py-12 text-gray-400">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>לא נמצאו מוצרים</p>
        </div>
      )}

      {/* Product Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'עריכת מוצר' : 'מוצר חדש'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>שם מוצר</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>ענף</Label>
                <Select value={form.branch} onValueChange={(v) => setForm({ ...form, branch: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="בחר ענף" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((b) => (
                      <SelectItem key={b.branch_id} value={String(b.branch_id)}>
                        {b.branch_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>מחלקה</Label>
                <Select
                  value={form.department}
                  onValueChange={(v) => setForm({ ...form, department: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="בחר מחלקה" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => (
                      <SelectItem key={d.department_id} value={String(d.department_id)}>
                        {d.department_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>מחיר (₪)</Label>
                <Input
                  type="number"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                />
              </div>
              <div>
                <Label>קבוצה</Label>
                <Input
                  value={form.group_name}
                  onChange={(e) => setForm({ ...form, group_name: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.main_product}
                onCheckedChange={(v) => setForm({ ...form, main_product: v })}
              />
              <Label className="mb-0">מוצר ראשי</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              ביטול
            </Button>
            <Button onClick={handleSave} isLoading={saving}>
              {editingProduct ? 'עדכן' : 'צור'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permanent delete confirmation */}
      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת מוצר לצמיתות</AlertDialogTitle>
            <AlertDialogDescription>
              האם למחוק את המוצר &quot;{pendingDelete?.name}&quot; לצמיתות? בניגוד להוצאה משימוש,
              פעולה זו לא ניתנת לשחזור.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePermanentDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              מחק לצמיתות
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
