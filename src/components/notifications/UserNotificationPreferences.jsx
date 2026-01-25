import React, { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Bell,
  BellRing,
  Mail,
  Volume2,
  VolumeX,
  Truck,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  MessageSquare,
  Save,
  Loader2
} from 'lucide-react';
import { showToast } from '@/components/ui/FeedbackToast';

const notificationEvents = [
  { 
    key: 'new_call', 
    label: 'קריאה חדשה', 
    description: 'התראה כאשר נפתחת קריאה חדשה',
    icon: Bell,
    defaultEnabled: true
  },
  { 
    key: 'call_status_change', 
    label: 'שינוי סטטוס קריאה', 
    description: 'התראה כאשר סטטוס קריאה משתנה',
    icon: BellRing,
    defaultEnabled: true
  },
  { 
    key: 'call_assigned', 
    label: 'שיבוץ לקריאה', 
    description: 'התראה כאשר קריאה משובצת אליך',
    icon: CheckCircle,
    defaultEnabled: true
  },
  { 
    key: 'vendor_arrived', 
    label: 'הגעת ספק', 
    description: 'התראה כאשר ספק מגיע ליעד',
    icon: Truck,
    defaultEnabled: true
  },
  { 
    key: 'call_completed', 
    label: 'קריאה הושלמה', 
    description: 'התראה כאשר קריאה מסתיימת',
    icon: CheckCircle,
    defaultEnabled: true
  },
  { 
    key: 'call_cancelled', 
    label: 'ביטול קריאה', 
    description: 'התראה כאשר קריאה מבוטלת',
    icon: XCircle,
    defaultEnabled: false
  },
  { 
    key: 'sla_warning', 
    label: 'אזהרת SLA', 
    description: 'התראה כאשר קריאה מתקרבת לחריגת SLA',
    icon: AlertTriangle,
    defaultEnabled: true
  },
  { 
    key: 'sla_breach', 
    label: 'חריגת SLA', 
    description: 'התראה כאשר קריאה חורגת מ-SLA',
    icon: Clock,
    defaultEnabled: true
  },
  { 
    key: 'new_message', 
    label: 'הודעה חדשה', 
    description: 'התראה על הודעות חדשות בצ\'אט',
    icon: MessageSquare,
    defaultEnabled: true
  }
];

export default function UserNotificationPreferences({ user, onUpdate }) {
  const [preferences, setPreferences] = useState({
    push_enabled: true,
    email_notifications: true,
    sound_enabled: true,
    events: {}
  });

  useEffect(() => {
    if (user) {
      setPreferences({
        push_enabled: user.push_enabled !== false,
        email_notifications: user.email_notifications !== false,
        sound_enabled: user.sound_enabled !== false,
        events: user.notification_preferences || getDefaultEvents()
      });
    }
  }, [user]);

  const getDefaultEvents = () => {
    const defaults = {};
    notificationEvents.forEach(event => {
      defaults[event.key] = event.defaultEnabled;
    });
    return defaults;
  };

  const saveMutation = useMutation({
    mutationFn: async (prefs) => {
      await base44.auth.updateMe({
        push_enabled: prefs.push_enabled,
        email_notifications: prefs.email_notifications,
        sound_enabled: prefs.sound_enabled,
        notification_preferences: prefs.events
      });
    },
    onSuccess: () => {
      showToast.success('העדפות ההתראות נשמרו');
      onUpdate?.();
    },
    onError: () => {
      showToast.error('שגיאה בשמירת ההעדפות');
    }
  });

  const handleToggleEvent = (eventKey) => {
    setPreferences(prev => ({
      ...prev,
      events: {
        ...prev.events,
        [eventKey]: !prev.events[eventKey]
      }
    }));
  };

  const handleToggleChannel = (channel) => {
    setPreferences(prev => ({
      ...prev,
      [channel]: !prev[channel]
    }));
  };

  const handleSave = () => {
    saveMutation.mutate(preferences);
  };

  const enableAll = () => {
    const allEnabled = {};
    notificationEvents.forEach(event => {
      allEnabled[event.key] = true;
    });
    setPreferences(prev => ({ ...prev, events: allEnabled }));
  };

  const disableAll = () => {
    const allDisabled = {};
    notificationEvents.forEach(event => {
      allDisabled[event.key] = false;
    });
    setPreferences(prev => ({ ...prev, events: allDisabled }));
  };

  return (
    <div className="space-y-6">
      {/* General Settings */}
      <Card className="bg-white border border-[#e5e7eb]">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="w-5 h-5 text-[#3b82f6]" />
            הגדרות כלליות
          </CardTitle>
          <CardDescription>הגדר כיצד תרצה לקבל התראות</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-[8px] border border-[#e5e7eb]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[8px] bg-[#f3f4f6] flex items-center justify-center">
                <BellRing className="w-5 h-5 text-[#3b82f6]" />
              </div>
              <div>
                <Label className="font-medium">התראות באפליקציה</Label>
                <p className="text-xs text-[#6b7280]">קבל התראות בזמן אמת באפליקציה</p>
              </div>
            </div>
            <Switch
              checked={preferences.push_enabled}
              onCheckedChange={() => handleToggleChannel('push_enabled')}
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-[8px] border border-[#e5e7eb]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[8px] bg-[#f3f4f6] flex items-center justify-center">
                <Mail className="w-5 h-5 text-[#3b82f6]" />
              </div>
              <div>
                <Label className="font-medium">התראות באימייל</Label>
                <p className="text-xs text-[#6b7280]">קבל סיכום התראות במייל</p>
              </div>
            </div>
            <Switch
              checked={preferences.email_notifications}
              onCheckedChange={() => handleToggleChannel('email_notifications')}
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-[8px] border border-[#e5e7eb]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[8px] bg-[#f3f4f6] flex items-center justify-center">
                {preferences.sound_enabled ? (
                  <Volume2 className="w-5 h-5 text-[#3b82f6]" />
                ) : (
                  <VolumeX className="w-5 h-5 text-[#6b7280]" />
                )}
              </div>
              <div>
                <Label className="font-medium">צלילי התראה</Label>
                <p className="text-xs text-[#6b7280]">השמע צליל בעת קבלת התראה</p>
              </div>
            </div>
            <Switch
              checked={preferences.sound_enabled}
              onCheckedChange={() => handleToggleChannel('sound_enabled')}
            />
          </div>
        </CardContent>
      </Card>

      {/* Event Preferences */}
      <Card className="bg-white border border-[#e5e7eb]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">סוגי התראות</CardTitle>
              <CardDescription>בחר על אילו אירועים תרצה לקבל התראות</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={enableAll}>
                הפעל הכל
              </Button>
              <Button variant="outline" size="sm" onClick={disableAll}>
                השבת הכל
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {notificationEvents.map((event, index) => {
              const Icon = event.icon;
              const isEnabled = preferences.events[event.key] !== false;
              return (
                <div key={event.key}>
                  <div className="flex items-center justify-between p-3 rounded-[8px] hover:bg-[#f9fafb] transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-[8px] flex items-center justify-center ${isEnabled ? 'bg-blue-100' : 'bg-[#f3f4f6]'}`}>
                        <Icon className={`w-4 h-4 ${isEnabled ? 'text-[#3b82f6]' : 'text-[#6b7280]'}`} />
                      </div>
                      <div>
                        <Label className="font-medium cursor-pointer">{event.label}</Label>
                        <p className="text-xs text-[#6b7280]">{event.description}</p>
                      </div>
                    </div>
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={() => handleToggleEvent(event.key)}
                    />
                  </div>
                  {index < notificationEvents.length - 1 && (
                    <Separator className="my-1" />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className="bg-[#3b82f6] hover:bg-[#2563eb] gap-2"
        >
          {saveMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          שמור העדפות
        </Button>
      </div>
    </div>
  );
}