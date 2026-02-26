import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { queryKeys } from '@/lib/queryKeys';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
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
import { Wallet, Plus, CreditCard, RotateCcw, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

const paymentMethodLabels = {
  credit_card: 'כרטיס אשראי',
  cash: 'מזומן',
  bank_transfer: 'העברה בנקאית',
  check: "צ'ק",
};

const statusConfig = {
  active: { label: 'פעיל', class: 'bg-green-100 text-green-800' },
  charged: { label: 'חויב', class: 'bg-red-100 text-red-800' },
  refunded: { label: 'הוחזר', class: 'bg-blue-100 text-blue-800' },
  cancelled: { label: 'בוטל', class: 'bg-gray-100 text-gray-800' },
  expired: { label: 'פג תוקף', class: 'bg-orange-100 text-orange-800' },
};

export default function DepositSection({ call, callId, currentUser }) {
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showActionDialog, setShowActionDialog] = useState(null); // { deposit, action: 'charge'|'refund'|'cancel' }
  const [form, setForm] = useState({
    amount: '',
    payment_method: 'credit_card',
    credit_card_last4: '',
    notes: '',
  });
  const [actionForm, setActionForm] = useState({ amount: '', reason: '' });
  const [saving, setSaving] = useState(false);

  const { data: deposits = [] } = useQuery({
    queryKey: queryKeys.deposits.byCall(callId),
    queryFn: () => base44.entities.Deposit.filter({ call_id: callId }, '-created_date'),
    enabled: !!callId,
  });

  const activeDeposits = deposits.filter((d) => d.status === 'active');

  const handleCreate = async () => {
    if (!form.amount || parseFloat(form.amount) <= 0) return toast.error('יש להזין סכום');
    setSaving(true);
    const now = new Date();
    const expiry = new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000);
    await base44.entities.Deposit.create({
      call_id: callId,
      call_number: call?.call_number,
      customer_name: call?.customer_name,
      customer_phone: call?.customer_phone,
      amount: parseFloat(form.amount),
      payment_method: form.payment_method,
      status: 'active',
      deposit_date: now.toISOString(),
      expiry_date: expiry.toISOString(),
      credit_card_last4: form.credit_card_last4,
      notes: form.notes,
      created_by_name: currentUser?.full_name || 'מוקדן',
    });
    queryClient.invalidateQueries({ queryKey: queryKeys.deposits.byCall(callId) });
    setShowCreateDialog(false);
    setForm({ amount: '', payment_method: 'credit_card', credit_card_last4: '', notes: '' });
    setSaving(false);
    toast.success('עירבון נרשם בהצלחה');
  };

  const handleAction = async () => {
    if (!showActionDialog) return;
    const { deposit, action } = showActionDialog;
    setSaving(true);

    const updates = {};
    if (action === 'charge') {
      updates.status = 'charged';
      updates.charged_date = new Date().toISOString();
      updates.charged_amount = actionForm.amount ? parseFloat(actionForm.amount) : deposit.amount;
      updates.charge_reason = actionForm.reason;
    } else if (action === 'refund') {
      updates.status = 'refunded';
      updates.refund_date = new Date().toISOString();
      updates.refund_reason = actionForm.reason;
    } else if (action === 'cancel') {
      updates.status = 'cancelled';
      updates.notes = (deposit.notes || '') + '\nבוטל: ' + actionForm.reason;
    }

    await base44.entities.Deposit.update(deposit.id, updates);
    queryClient.invalidateQueries({ queryKey: queryKeys.deposits.byCall(callId) });
    setShowActionDialog(null);
    setActionForm({ amount: '', reason: '' });
    setSaving(false);
    toast.success(
      action === 'charge' ? 'העירבון חויב' : action === 'refund' ? 'העירבון הוחזר' : 'העירבון בוטל'
    );
  };

  const getDaysLeft = (expiryDate) => {
    if (!expiryDate) return null;
    const diff = new Date(expiryDate) - new Date();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  return (
    <Card className="bg-white">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Wallet className="w-4 h-4 text-[#3b82f6]" />
            עירבונות (קש"ס)
            {activeDeposits.length > 0 && (
              <Badge className="bg-green-100 text-green-800 text-xs">
                {activeDeposits.length} פעילים
              </Badge>
            )}
          </CardTitle>
          <Button size="sm" onClick={() => setShowCreateDialog(true)} className="gap-1">
            <Plus className="w-3 h-3" /> עירבון חדש
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {deposits.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">אין עירבונות לקריאה זו</p>
        ) : (
          <div className="space-y-3">
            {deposits.map((dep) => {
              const daysLeft = getDaysLeft(dep.expiry_date);
              return (
                <div key={dep.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className={statusConfig[dep.status]?.class}>
                        {statusConfig[dep.status]?.label}
                      </Badge>
                      <span className="font-bold text-lg">₪{dep.amount?.toLocaleString()}</span>
                      <span className="text-xs text-gray-500">
                        {paymentMethodLabels[dep.payment_method]}
                      </span>
                      {dep.credit_card_last4 && (
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <CreditCard className="w-3 h-3" />
                          ****{dep.credit_card_last4}
                        </span>
                      )}
                    </div>
                    {dep.status === 'active' && (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-7 text-xs"
                          onClick={() => {
                            setShowActionDialog({ deposit: dep, action: 'charge' });
                            setActionForm({ amount: String(dep.amount), reason: '' });
                          }}
                        >
                          חייב
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => {
                            setShowActionDialog({ deposit: dep, action: 'refund' });
                            setActionForm({ amount: '', reason: '' });
                          }}
                        >
                          <RotateCcw className="w-3 h-3 ml-1" /> החזר
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-gray-500"
                          onClick={() => {
                            setShowActionDialog({ deposit: dep, action: 'cancel' });
                            setActionForm({ amount: '', reason: '' });
                          }}
                        >
                          בטל
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-4 text-xs text-gray-500">
                    <span>
                      נלקח:{' '}
                      {dep.deposit_date
                        ? format(new Date(dep.deposit_date), 'dd/MM/yy HH:mm', { locale: he })
                        : '-'}
                    </span>
                    {dep.status === 'active' && daysLeft !== null && (
                      <span className={daysLeft <= 3 ? 'text-red-600 font-medium' : ''}>
                        {daysLeft > 0 ? `${daysLeft} ימים לתפוגה` : 'פג תוקף!'}
                      </span>
                    )}
                    {dep.status === 'charged' && (
                      <span>
                        חויב: ₪{dep.charged_amount} - {dep.charge_reason}
                      </span>
                    )}
                    {dep.status === 'refunded' && <span>הוחזר: {dep.refund_reason}</span>}
                    {dep.created_by_name && <span>ע"י: {dep.created_by_name}</span>}
                  </div>
                  {dep.notes && <p className="text-xs text-gray-400">{dep.notes}</p>}
                </div>
              );
            })}
          </div>
        )}

        {/* Create Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>עירבון חדש (קש"ס)</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>סכום (₪)</Label>
                <Input
                  type="number"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div>
                <Label>אמצעי תשלום</Label>
                <Select
                  value={form.payment_method}
                  onValueChange={(v) => setForm({ ...form, payment_method: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(paymentMethodLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {form.payment_method === 'credit_card' && (
                <div>
                  <Label>4 ספרות אחרונות</Label>
                  <Input
                    maxLength={4}
                    value={form.credit_card_last4}
                    onChange={(e) => setForm({ ...form, credit_card_last4: e.target.value })}
                    placeholder="1234"
                  />
                </div>
              )}
              <div>
                <Label>הערות</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="הערות..."
                  className="h-20"
                />
              </div>
              <p className="text-xs text-gray-400 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> העירבון יפוג אוטומטית אחרי 21 יום
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                ביטול
              </Button>
              <Button onClick={handleCreate} isLoading={saving}>
                שמור עירבון
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Action Dialog (charge/refund/cancel) */}
        <Dialog open={!!showActionDialog} onOpenChange={() => setShowActionDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {showActionDialog?.action === 'charge' && 'חיוב עירבון'}
                {showActionDialog?.action === 'refund' && 'החזרת עירבון'}
                {showActionDialog?.action === 'cancel' && 'ביטול עירבון'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {showActionDialog?.action === 'charge' && (
                <div>
                  <Label>סכום לחיוב (₪)</Label>
                  <Input
                    type="number"
                    value={actionForm.amount}
                    onChange={(e) => setActionForm({ ...actionForm, amount: e.target.value })}
                  />
                </div>
              )}
              <div>
                <Label>סיבה</Label>
                <Textarea
                  value={actionForm.reason}
                  onChange={(e) => setActionForm({ ...actionForm, reason: e.target.value })}
                  placeholder="הזן סיבה..."
                  className="h-20"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowActionDialog(null)}>
                ביטול
              </Button>
              <Button
                onClick={handleAction}
                isLoading={saving}
                variant={showActionDialog?.action === 'charge' ? 'destructive' : 'default'}
              >
                {showActionDialog?.action === 'charge' && 'חייב'}
                {showActionDialog?.action === 'refund' && 'החזר'}
                {showActionDialog?.action === 'cancel' && 'בטל'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
