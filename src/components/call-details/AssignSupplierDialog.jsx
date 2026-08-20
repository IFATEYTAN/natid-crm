import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
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
import { queryKeys } from '@/lib/queryKeys';
import { listSuppliers, assignSupplier } from '@/lib/srvApi';

/**
 * Assign a supplier to an appeal — srv POST /appeals/{id}/supplier, port of
 * f_save_call()'s dispatch branch (NOT f_upadte_supplier_priority(), see
 * srv.natid.co.il CLAUDE.md). Phase 2 of the dispatcher rebuild plan.
 */
export default function AssignSupplierDialog({ appealId, open, onOpenChange }) {
  const [supplierId, setSupplierId] = useState('');
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: queryKeys.lookups.suppliers({}),
    queryFn: () => listSuppliers(),
    enabled: open,
  });
  const suppliers = data?.data ?? [];

  const assign = useMutation({
    mutationFn: () => assignSupplier(appealId, { supplier_id: Number(supplierId) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.appeals.detail(appealId) });
      toast.success('ספק שובץ בהצלחה');
      onOpenChange(false);
      setSupplierId('');
    },
    onError: (error) => toast.error(error?.message || 'שגיאה בשיבוץ ספק'),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5" />
            שיבוץ ספק
          </DialogTitle>
        </DialogHeader>
        <div className="py-2 space-y-2">
          <Label>בחר ספק</Label>
          <Select value={supplierId} onValueChange={setSupplierId}>
            <SelectTrigger>
              <SelectValue placeholder="בחר ספק..." />
            </SelectTrigger>
            <SelectContent>
              {suppliers.map((s) => (
                <SelectItem key={s.kablan_id} value={String(s.kablan_id)}>
                  {s.kablan_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button
            onClick={() => assign.mutate()}
            disabled={!supplierId || assign.isPending}
            className="gap-2"
          >
            <Truck className="w-4 h-4" />
            שבץ
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            ביטול
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
