import React, { useState } from 'react';
import {
  useNotificationSettings,
  useCreateNotificationSetting,
  useUpdateNotificationSetting,
  useDeleteNotificationSetting,
} from '@/features/settings/hooks/useSettings';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Bell,
  BellRing,
  Mail,
  MessageSquare,
  Smartphone,
  Plus,
  Settings,
  Trash2,
} from 'lucide-react';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { SlideUp } from '@/components/animations/AnimatedComponents';
import { showToast } from '@/components/ui/FeedbackToast';
import { cn } from '@/lib/utils';

const eventLabels = {
  call_status_change: 'שינוי סטטוס קריאה',
  call_assigned: 'שיבוץ קריאה',
  sla_near_breach: 'קרוב לחריגת SLA',
  new_interaction: 'אינטראקציה חדשה',
  call_unassigned: 'קריאה ללא שיבוץ',
  low_rating: 'דירוג נמוך',
  call_cancelled: 'קריאה בוטלה',
  vendor_delayed: 'עיכוב ספק',
};

const eventIcons = {
  call_status_change: Bell,
  call_assigned: BellRing,
  sla_near_breach: Bell,
  new_interaction: MessageSquare,
  call_unassigned: Bell,
  low_rating: Bell,
  call_cancelled: Bell,
  vendor_delayed: Bell,
};

const defaultForm = {
  name: '',
  event: '',
  channels: { inApp: true, email: false, sms: false },
  enabled: true,
};

export default function NotificationSettingsPage() {
  const { data: settings = [], isLoading } = useNotificationSettings();
  const createMutation = useCreateNotificationSetting();
  const updateMutation = useUpdateNotificationSetting();
  const deleteMutation = useDeleteNotificationSetting();
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState(defaultForm);

  const handleCreate = () => {
    if (!form.name || !form.event) return;
    createMutation.mutate(form, {
      onSuccess: () => {
        setShowDialog(false);
        setForm(defaultForm);
      },
    });
  };

  const handleToggle = (id, currentEnabled) => {
    updateMutation.mutate(
      { id, data: { enabled: !currentEnabled } },
      { onSuccess: () => showToast.success('ההגדרה עודכנה') }
    );
  };

  if (isLoading) {
    return <PageLoader text="טוען הגדרות התראות..." />;
  }

  return (
    <SlideUp>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#111827]">הגדרות התראות</h1>
            <p className="text-[#6b7280] text-sm">הגדרת התראות אוטומטיות לאירועים במערכת</p>
          </div>
          <Button onClick={() => setShowDialog(true)} className="h-11 text-base w-full sm:w-auto">
            <Plus className="w-5 h-5 ms-1" />
            הגדרה חדשה
          </Button>
        </div>

        {/* Create Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-md" dir="rtl">
            <DialogHeader>
              <DialogTitle>צור הגדרת התראה חדשה</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1">
                <Label>שם ההגדרה</Label>
                <Input
                  placeholder="לדוגמה: התראה על קריאה חדשה"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>אירוע</Label>
                <Select value={form.event} onValueChange={(v) => setForm((p) => ({ ...p, event: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="בחר אירוע" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(eventLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>ערוצי שליחה</Label>
                {[
                  { key: 'inApp', label: 'באפליקציה' },
                  { key: 'email', label: 'אימייל' },
                  { key: 'sms', label: 'SMS' },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center gap-2">
                    <Switch
                      checked={form.channels[key]}
                      onCheckedChange={(v) => setForm((p) => ({ ...p, channels: { ...p.channels, [key]: v } }))}
                    />
                    <Label>{label}</Label>
                  </div>
                ))}
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setShowDialog(false)}>ביטול</Button>
              <Button onClick={handleCreate} isLoading={createMutation.isPending} disabled={!form.name || !form.event}>
                צור הגדרה
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <Card className="bg-white border border-[#e5e7eb]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[8px] bg-[#f3f4f6] flex items-center justify-center">
                  <Bell className="w-5 h-5 text-[#3b82f6]" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-[#111827]">{settings.length}</div>
                  <div className="text-sm text-[#6b7280]">סה"כ הגדרות</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border border-[#e5e7eb]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[8px] bg-[#f3f4f6] flex items-center justify-center">
                  <BellRing className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-[#111827]">
                    {settings.filter((s) => s.enabled).length}
                  </div>
                  <div className="text-sm text-[#6b7280]">פעילות</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Notification Settings List */}
        <Card className="bg-white border border-[#e5e7eb]">
          <CardHeader>
            <CardTitle className="text-lg">רשימת התראות מוגדרות</CardTitle>
          </CardHeader>
          <CardContent>
            {settings.length === 0 ? (
              <div className="text-center py-12">
                <Bell className="w-12 h-12 mx-auto text-[#6b7280] mb-3" />
                <h3 className="font-medium text-[#111827] mb-1">אין הגדרות התראות</h3>
                <p className="text-sm text-[#6b7280]">
                  צור הגדרות התראות כדי לקבל עדכונים אוטומטיים
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {settings.map((setting) => {
                  const Icon = eventIcons[setting.event] || Bell;
                  return (
                    <div
                      key={setting.id}
                      className="flex items-start sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-[8px] border border-[#e5e7eb] hover:bg-[#f9fafb] transition-colors"
                    >
                      <div className="w-10 h-10 rounded-[8px] bg-[#f3f4f6] flex items-center justify-center">
                        <Icon className="w-5 h-5 text-[#6b7280]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-[#111827]">{setting.name}</div>
                        <div className="text-sm text-[#6b7280]">
                          {eventLabels[setting.event] || setting.event}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          {setting.channels?.inApp && (
                            <Badge variant="outline" className="text-xs">
                              <Bell className="w-3 h-3 ms-1" />
                              באפליקציה
                            </Badge>
                          )}
                          {setting.channels?.email && (
                            <Badge variant="outline" className="text-xs">
                              <Mail className="w-3 h-3 ms-1" />
                              אימייל
                            </Badge>
                          )}
                          {setting.channels?.sms && (
                            <Badge variant="outline" className="text-xs">
                              <Smartphone className="w-3 h-3 ms-1" />
                              SMS
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                        <Switch
                          checked={setting.enabled}
                          onCheckedChange={() => handleToggle(setting.id, setting.enabled)}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-[#6b7280] hover:text-[#ef4444] h-10 w-10"
                          onClick={() =>
                            deleteMutation.mutate(setting.id, {
                              onSuccess: () => showToast.success('ההגדרה נמחקה'),
                            })
                          }
                          aria-label="מחיקה"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Available Events */}
        <Card className="bg-white border border-[#e5e7eb]">
          <CardHeader>
            <CardTitle className="text-lg">אירועים זמינים</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {Object.entries(eventLabels).map(([key, label]) => {
                const Icon = eventIcons[key] || Bell;
                return (
                  <div key={key} className="p-3 sm:p-4 rounded-[8px] border border-[#e5e7eb] bg-[#f9fafb]">
                    <div className="flex items-center gap-2">
                      <Icon className="w-5 h-5 text-[#6b7280] shrink-0" />
                      <span className="text-sm text-[#111827]">{label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </SlideUp>
  );
}