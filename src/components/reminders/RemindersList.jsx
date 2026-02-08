import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Bell, Plus, Check, Clock, AlertTriangle, X } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';

const priorityConfig = {
  high: { label: 'גבוה', class: 'bg-red-100 text-red-800' },
  medium: { label: 'בינוני', class: 'bg-yellow-100 text-yellow-800' },
  low: { label: 'נמוך', class: 'bg-gray-100 text-gray-600' },
};

const statusConfig = {
  pending: { label: 'ממתין', class: 'bg-blue-100 text-blue-800', icon: Clock },
  done: { label: 'בוצע', class: 'bg-green-100 text-green-800', icon: Check },
  dismissed: { label: 'נדחה', class: 'bg-gray-100 text-gray-600', icon: X },
  overdue: { label: 'איחור', class: 'bg-red-100 text-red-800', icon: AlertTriangle },
};

const typeLabels = {
  manual: 'ידנית',
  auto_followup: 'מעקב אוטומטי',
  auto_deposit_expiry: 'תפוגת עירבון',
  auto_future_service: 'שירות עתידי',
};

export default function RemindersList({ callId, call, currentUser, showAll = false }) {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', remind_at: '', priority: 'medium', assigned_to_name: '',
  });

  const queryKey = showAll ? ['reminders-all'] : ['reminders', callId];
  const { data: reminders = [] } = useQuery({
    queryKey,
    queryFn: () => {
      if (showAll) return base44.entities.Reminder.filter({ status: 'pending' }, 'remind_at', 50);
      return base44.entities.Reminder.filter({ call_id: callId }, '-created_date');
    },
    enabled: showAll || !!callId,
  });

  // Mark overdue
  const now = new Date();
  const processedReminders = reminders.map(r => ({
    ...r,
    status: r.status === 'pending' && r.remind_at && new Date(r.remind_at) < now ? 'overdue' : r.status,
  }));

  const pendingCount = processedReminders.filter(r => r.status === 'pending' || r.status === 'overdue').length;

  const handleCreate = async () => {
    if (!form.title || !form.remind_at) return toast.error('יש למלא כותרת ותאריך');
    setSaving(true);
    await base44.entities.Reminder.create({
      call_id: callId || null,
      call_number: call?.call_number || null,
      reminder_type: 'manual',
      title: form.title,
      description: form.description,
      remind_at: new Date(form.remind_at).toISOString(),
      assigned_to: currentUser?.email,
      assigned_to_name: form.assigned_to_name || currentUser?.full_name || 'מוקדן',
      status: 'pending',
      priority: form.priority,
    });
    queryClient.invalidateQueries({ queryKey });
    setShowDialog(false);
    setForm({ title: '', description: '', remind_at: '', priority: 'medium', assigned_to_name: '' });
    setSaving(false);
    toast.success('תזכורת נוצרה');
  };

  const handleComplete = async (id) => {
    await base44.entities.Reminder.update(id, { status: 'done', completed_at: new Date().toISOString() });
    queryClient.invalidateQueries({ queryKey });
    toast.success('תזכורת סומנה כבוצעה');
  };

  const handleDismiss = async (id) => {
    await base44.entities.Reminder.update(id, { status: 'dismissed' });
    queryClient.invalidateQueries({ queryKey });
  };

  return (
    <Card className="bg-white">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#3b82f6]" />
            תזכורות
            {pendingCount > 0 && (
              <Badge className="bg-red-100 text-red-800 text-xs">{pendingCount}</Badge>
            )}
          </CardTitle>
          <Button size="sm" onClick={() => setShowDialog(true)} className="gap-1">
            <Plus className="w-3 h-3" /> תזכורת חדשה
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {processedReminders.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">אין תזכורות</p>
        ) : (
          <div className="space-y-2">
            {processedReminders.map((rem) => {
              const StatusIcon = statusConfig[rem.status]?.icon || Clock;
              return (
                <div key={rem.id} className={`border rounded-lg p-3 flex items-start justify-between gap-3 ${rem.status === 'overdue' ? 'border-red-300 bg-red-50' : rem.status === 'done' ? 'opacity-50' : ''}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={statusConfig[rem.status]?.class || 'bg-gray-100'}>
                        <StatusIcon className="w-3 h-3 ml-1" />
                        {statusConfig[rem.status]?.label}
                      </Badge>
                      <Badge className={priorityConfig[rem.priority]?.class}>{priorityConfig[rem.priority]?.label}</Badge>
                      {rem.reminder_type !== 'manual' && (
                        <Badge variant="outline" className="text-xs">{typeLabels[rem.reminder_type]}</Badge>
                      )}
                    </div>
                    <p className="font-medium text-sm mt-1">{rem.title}</p>
                    {rem.description && <p className="text-xs text-gray-500 mt-0.5">{rem.description}</p>}
                    <div className="flex gap-3 text-xs text-gray-400 mt-1">
                      {rem.remind_at && <span>תזכור: {format(new Date(rem.remind_at), 'dd/MM/yy HH:mm', { locale: he })}</span>}
                      {rem.assigned_to_name && <span>ל: {rem.assigned_to_name}</span>}
                      {showAll && rem.call_number && (
                        <Link to={createPageUrl(`CallDetails?id=${rem.call_id}`)} className="text-blue-600 hover:underline">
                          קריאה {rem.call_number}
                        </Link>
                      )}
                    </div>
                  </div>
                  {(rem.status === 'pending' || rem.status === 'overdue') && (
                    <div className="flex gap-1 shrink-0">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-green-600" onClick={() => handleComplete(rem.id)}>
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-gray-400" onClick={() => handleDismiss(rem.id)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent>
            <DialogHeader><DialogTitle>תזכורת חדשה</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>כותרת</Label>
                <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="למשל: חזור ללקוח..." />
              </div>
              <div>
                <Label>תיאור</Label>
                <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="h-16" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>תאריך ושעה</Label>
                  <Input type="datetime-local" value={form.remind_at} onChange={e => setForm({ ...form, remind_at: e.target.value })} />
                </div>
                <div>
                  <Label>עדיפות</Label>
                  <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">נמוך</SelectItem>
                      <SelectItem value="medium">בינוני</SelectItem>
                      <SelectItem value="high">גבוה</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>מקבל התזכורת</Label>
                <Input value={form.assigned_to_name} onChange={e => setForm({ ...form, assigned_to_name: e.target.value })} placeholder={currentUser?.full_name || 'שם המוקדן'} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>ביטול</Button>
              <Button onClick={handleCreate} isLoading={saving}>צור תזכורת</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}