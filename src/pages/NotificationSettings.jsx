import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
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

export default function NotificationSettingsPage() {
  const queryClient = useQueryClient();

  const { data: settings = [], isLoading } = useQuery({
    queryKey: ['notification-settings'],
    queryFn: () => base44.entities.NotificationSetting.list('-created_date', 50),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }) => base44.entities.NotificationSetting.update(id, { enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-settings'] });
      showToast.success('ההגדרה עודכנה');
    },
    onError: () => {
      showToast.error('שגיאה בעדכון ההגדרה');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.NotificationSetting.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-settings'] });
      showToast.success('ההגדרה נמחקה');
    },
    onError: () => {
      showToast.error('שגיאה במחיקת ההגדרה');
    },
  });

  const handleToggle = (id, currentEnabled) => {
    toggleMutation.mutate({ id, enabled: !currentEnabled });
  };

  if (isLoading) {
    return <PageLoader text="טוען הגדרות התראות..." />;
  }

  return (
    <SlideUp>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#111827]">הגדרות התראות</h1>
            <p className="text-[#6b7280] text-sm">הגדרת התראות אוטומטיות לאירועים במערכת</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                      className="flex items-center gap-4 p-4 rounded-[8px] border border-[#e5e7eb] hover:bg-[#f9fafb] transition-colors"
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
                              <Bell className="w-3 h-3 ml-1" />
                              באפליקציה
                            </Badge>
                          )}
                          {setting.channels?.email && (
                            <Badge variant="outline" className="text-xs">
                              <Mail className="w-3 h-3 ml-1" />
                              אימייל
                            </Badge>
                          )}
                          {setting.channels?.sms && (
                            <Badge variant="outline" className="text-xs">
                              <Smartphone className="w-3 h-3 ml-1" />
                              SMS
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={setting.enabled}
                          onCheckedChange={() => handleToggle(setting.id, setting.enabled)}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-[#6b7280] hover:text-[#ef4444]"
                          onClick={() => deleteMutation.mutate(setting.id)}
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {Object.entries(eventLabels).map(([key, label]) => {
                const Icon = eventIcons[key] || Bell;
                return (
                  <div key={key} className="p-3 rounded-[8px] border border-[#e5e7eb] bg-[#f9fafb]">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-[#6b7280]" />
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
