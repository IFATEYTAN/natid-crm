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
import { ShieldCheck, Plus, CheckCircle2, XCircle, AlertTriangle, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

const checkTypeLabels = {
  insurance_coverage: 'כיסוי ביטוחי',
  membership_valid: 'תוקף מנוי',
  service_limit: 'מגבלת שירותים',
  vehicle_match: 'התאמת רכב',
  general: 'בדיקה כללית',
};

const resultConfig = {
  eligible: { label: 'זכאי', class: 'bg-green-100 text-green-800', icon: CheckCircle2 },
  not_eligible: { label: 'לא זכאי', class: 'bg-red-100 text-red-800', icon: XCircle },
  partial: { label: 'זכאי חלקית', class: 'bg-yellow-100 text-yellow-800', icon: AlertTriangle },
  pending_review: { label: 'ממתין לבדיקה', class: 'bg-blue-100 text-blue-800', icon: HelpCircle },
  unknown: { label: 'לא ידוע', class: 'bg-gray-100 text-gray-600', icon: HelpCircle },
};

export default function EligibilityCheckSection({ call, callId, currentUser }) {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    check_type: 'general',
    question: '',
    answer: '',
    result: 'pending_review',
    reason: '',
    notes: '',
  });

  const { data: checks = [] } = useQuery({
    queryKey: queryKeys.eligibilityChecks.byCall(callId),
    queryFn: () => base44.entities.EligibilityCheck.filter({ call_id: callId }, '-created_date'),
    enabled: !!callId,
  });

  const handleCreate = async () => {
    if (!form.question) return toast.error('יש למלא שאלה/חריגה');
    setSaving(true);
    await base44.entities.EligibilityCheck.create({
      call_id: callId,
      call_number: call?.call_number,
      customer_name: call?.customer_name,
      customer_phone: call?.customer_phone,
      insurance_company: call?.insurance_company,
      membership_number: call?.membership_number,
      vehicle_plate: call?.vehicle_plate,
      check_type: form.check_type,
      question: form.question,
      answer: form.answer,
      result: form.result,
      reason: form.reason,
      checked_by: currentUser?.full_name || 'מוקדן',
      notes: form.notes,
    });
    queryClient.invalidateQueries({ queryKey: queryKeys.eligibilityChecks.byCall(callId) });
    setShowDialog(false);
    setForm({
      check_type: 'general',
      question: '',
      answer: '',
      result: 'pending_review',
      reason: '',
      notes: '',
    });
    setSaving(false);
    toast.success('בדיקת זכאות נשמרה');
  };

  const handleUpdateResult = async (checkId, newResult) => {
    await base44.entities.EligibilityCheck.update(checkId, {
      result: newResult,
      approved_by: currentUser?.full_name,
    });
    queryClient.invalidateQueries({ queryKey: queryKeys.eligibilityChecks.byCall(callId) });
    toast.success('תוצאה עודכנה');
  };

  return (
    <Card className="bg-white">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#3b82f6]" />
            בדיקת זכאות / חריגים
            {checks.length > 0 && (
              <Badge className="bg-blue-100 text-blue-800 text-xs">{checks.length}</Badge>
            )}
          </CardTitle>
          <Button size="sm" onClick={() => setShowDialog(true)} className="gap-1">
            <Plus className="w-3 h-3" /> בדיקה חדשה
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {checks.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">לא בוצעו בדיקות זכאות</p>
        ) : (
          <div className="space-y-3">
            {checks.map((check) => {
              const rc = resultConfig[check.result] || resultConfig.unknown;
              const ResultIcon = rc.icon;
              return (
                <div key={check.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={rc.class}>
                        <ResultIcon className="w-3 h-3 ms-1" />
                        {rc.label}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {checkTypeLabels[check.check_type]}
                      </Badge>
                    </div>
                    {check.result === 'pending_review' && (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          className="h-7 text-xs bg-green-600 hover:bg-green-700"
                          onClick={() => handleUpdateResult(check.id, 'eligible')}
                        >
                          אשר זכאות
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-7 text-xs"
                          onClick={() => handleUpdateResult(check.id, 'not_eligible')}
                        >
                          דחה
                        </Button>
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{check.question}</p>
                    {check.answer && (
                      <p className="text-xs text-gray-600 mt-1">תשובה: {check.answer}</p>
                    )}
                    {check.reason && (
                      <p className="text-xs text-gray-500 mt-1">נימוק: {check.reason}</p>
                    )}
                  </div>
                  <div className="flex gap-3 text-xs text-gray-400">
                    {check.checked_by && <span>בדק: {check.checked_by}</span>}
                    {check.approved_by && <span>אישר: {check.approved_by}</span>}
                    {check.insurance_company && <span>חב' ביטוח: {check.insurance_company}</span>}
                    <span>
                      {format(new Date(check.created_date), 'dd/MM/yy HH:mm', { locale: he })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>בדיקת זכאות חדשה</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>סוג בדיקה</Label>
                <Select
                  value={form.check_type}
                  onValueChange={(v) => setForm({ ...form, check_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(checkTypeLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>שאלה / חריגה</Label>
                <Textarea
                  value={form.question}
                  onChange={(e) => setForm({ ...form, question: e.target.value })}
                  placeholder='למשל: האם הלקוח מכוסה לגרירה מעל 50 ק"מ?'
                  className="h-16"
                />
              </div>
              <div>
                <Label>תשובה</Label>
                <Textarea
                  value={form.answer}
                  onChange={(e) => setForm({ ...form, answer: e.target.value })}
                  placeholder="תשובה מחברת הביטוח..."
                  className="h-16"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>תוצאה</Label>
                  <Select
                    value={form.result}
                    onValueChange={(v) => setForm({ ...form, result: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(resultConfig).map(([k, v]) => (
                        <SelectItem key={k} value={k}>
                          {v.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>נימוק</Label>
                  <Input
                    value={form.reason}
                    onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                ביטול
              </Button>
              <Button onClick={handleCreate} isLoading={saving}>
                שמור בדיקה
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
