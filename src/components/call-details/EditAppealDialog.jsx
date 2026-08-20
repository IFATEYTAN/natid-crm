import React, { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { queryKeys } from '@/lib/queryKeys';
import { patchAppeal, updateAppealReminder } from '@/lib/srvApi';

/**
 * Edit a curated subset of appeal fields — srv PATCH /appeals/{id}, port of
 * update_call()'s edit_appeal path — plus the future-service window (PATCH
 * /appeals/{id}/reminder, port of f_setFutureServiceTime()), fired as a
 * second request on the same save since they're separate srv endpoints by
 * design (see srv.natid.co.il CLAUDE.md's "one column, one endpoint" note).
 *
 * Only exposes the fields that are safe to edit without deeper context:
 * diagnose/notes/key handling/the arrival-warning threshold, and future
 * service scheduling. Location, client identity, and the questionnaire
 * aren't editable here yet — those need richer UI (address autocomplete,
 * the department-specific questionnaire form) than a first cut needs.
 */
export default function EditAppealDialog({ appeal, appealId, open, onOpenChange }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    diagnose: '',
    key_location: '',
    car_pin: '',
    reminder: '',
    q_notes: '',
    future_service_from: '',
    future_service_to: '',
  });

  useEffect(() => {
    if (!open || !appeal) return;
    setForm({
      diagnose: appeal.diagnose || '',
      key_location: appeal.key_location || '',
      car_pin: appeal.car_pin || '',
      reminder: appeal.reminder ?? '',
      q_notes: appeal.q_notes || '',
      future_service_from: appeal.future_service_from || '',
      future_service_to: appeal.future_service_to || '',
    });
  }, [open, appeal]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const save = useMutation({
    mutationFn: async () => {
      await patchAppeal(appealId, {
        diagnose: form.diagnose,
        key_location: form.key_location,
        car_pin: form.car_pin,
        reminder: form.reminder === '' ? null : Number(form.reminder),
        q_notes: form.q_notes,
      });
      if (form.future_service_from || form.future_service_to) {
        await updateAppealReminder(appealId, {
          future_service_from: form.future_service_from || null,
          future_service_to: form.future_service_to || null,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.appeals.detail(appealId) });
      toast.success('הקריאה עודכנה בהצלחה');
      onOpenChange(false);
    },
    onError: (error) => toast.error(error?.message || 'שגיאה בעדכון קריאה'),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-5 h-5" />
            עריכת קריאה
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label>אבחון</Label>
            <Input value={form.diagnose} onChange={set('diagnose')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>מיקום מפתח</Label>
              <Input value={form.key_location} onChange={set('key_location')} />
            </div>
            <div>
              <Label>קוד PIN</Label>
              <Input value={form.car_pin} onChange={set('car_pin')} dir="ltr" />
            </div>
          </div>
          <div>
            <Label>התראת הגעה מוקדמת (דקות)</Label>
            <Input
              type="number"
              value={form.reminder}
              onChange={set('reminder')}
              dir="ltr"
              className="w-32"
            />
          </div>
          <div>
            <Label>הערות</Label>
            <Textarea value={form.q_notes} onChange={set('q_notes')} className="min-h-[80px]" />
          </div>
          <div className="grid grid-cols-2 gap-3 border-t pt-3">
            <div>
              <Label>שירות עתידי מ-</Label>
              <Input
                type="datetime-local"
                value={(form.future_service_from || '').replace(' ', 'T').slice(0, 16)}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    future_service_from: e.target.value.replace('T', ' ') + ':00',
                  }))
                }
              />
            </div>
            <div>
              <Label>עד</Label>
              <Input
                type="datetime-local"
                value={(form.future_service_to || '').replace(' ', 'T').slice(0, 16)}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    future_service_to: e.target.value.replace('T', ' ') + ':00',
                  }))
                }
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => save.mutate()} disabled={save.isPending} className="gap-2">
            <Pencil className="w-4 h-4" />
            שמור
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            ביטול
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
