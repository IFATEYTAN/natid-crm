import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Zap, MessageSquare, UserCheck, Bell, Save } from 'lucide-react';
import { toast } from 'sonner';

export default function AutomationSettings() {
  const [settings, setSettings] = useState({
    // SMS Automation
    smsOnStatusChange: true,
    smsOnVendorAssignment: true,
    smsOnCompletion: true,
    smsTemplates: {
      assigned: 'שלום {customer_name}, קריאתך {call_number} שובצה לטיפול. הספק בדרך אליך.',
      enroute: 'הספק בדרך למיקומך. זמן הגעה משוער: 20-30 דקות.',
      completed: 'הטיפול בקריאתך סגור. תודה שבחרת בנתי שירותי דרך!',
    },

    // Auto Assignment
    autoAssignEnabled: true,
    autoAssignCriteria: 'rating', // rating, proximity, response_time
    autoAssignOnBotCall: true,
    autoAssignOnOperatorCall: false,

    // Notifications
    notifyManagerOnSLA: true,
    notifyManagerThreshold: 5, // minutes before SLA breach

    // Auto Status Updates
    autoStatusEnabled: false,
    autoCompleteOnVendorConfirm: false,
  });

  const handleSave = () => {
    localStorage.setItem('automationSettings', JSON.stringify(settings));
    toast.success('ההגדרות נשמרו בהצלחה');
  };

  const updateSetting = (key, value) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const updateTemplate = (key, value) => {
    setSettings((prev) => ({
      ...prev,
      smsTemplates: {
        ...prev.smsTemplates,
        [key]: value,
      },
    }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[32px] font-bold text-neutral-soft-800">הגדרות אוטומציה</h1>
        <p className="text-neutral-soft-600 text-sm">ניהול תהליכים אוטומטיים במערכת</p>
      </div>

      {/* SMS Automation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="w-5 h-5 text-[#0078D4]" />
            הודעות SMS אוטומטיות
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">שליחת SMS בשיבוץ ספק</Label>
              <p className="text-sm text-[#616161]">שלח SMS ללקוח כאשר קריאה משובצת לספק</p>
            </div>
            <Switch
              checked={settings.smsOnVendorAssignment}
              onCheckedChange={(checked) => updateSetting('smsOnVendorAssignment', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">שליחת SMS בשינוי סטטוס</Label>
              <p className="text-sm text-[#616161]">עדכן את הלקוח על שינויי סטטוס</p>
            </div>
            <Switch
              checked={settings.smsOnStatusChange}
              onCheckedChange={(checked) => updateSetting('smsOnStatusChange', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">שליחת SMS בהשלמה</Label>
              <p className="text-sm text-[#616161]">שלח הודעת תודה בסיום טיפול</p>
            </div>
            <Switch
              checked={settings.smsOnCompletion}
              onCheckedChange={(checked) => updateSetting('smsOnCompletion', checked)}
            />
          </div>

          <div className="space-y-4 pt-4 border-t">
            <h4 className="font-medium">תבניות הודעות</h4>

            <div>
              <Label className="text-sm">הודעת שיבוץ</Label>
              <Textarea
                value={settings.smsTemplates.assigned}
                onChange={(e) => updateTemplate('assigned', e.target.value)}
                rows={2}
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-sm">הודעת "ספק בדרך"</Label>
              <Textarea
                value={settings.smsTemplates.enroute}
                onChange={(e) => updateTemplate('enroute', e.target.value)}
                rows={2}
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-sm">הודעת השלמה</Label>
              <Textarea
                value={settings.smsTemplates.completed}
                onChange={(e) => updateTemplate('completed', e.target.value)}
                rows={2}
                className="mt-1"
              />
            </div>

            <p className="text-xs text-[#616161]">
              משתנים זמינים: {'{customer_name}'}, {'{call_number}'}, {'{vendor_name}'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Auto Assignment */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserCheck className="w-5 h-5 text-[#2E7D32]" />
            שיבוץ אוטומטי לספקים
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">אפשר שיבוץ אוטומטי</Label>
              <p className="text-sm text-[#616161]">שבץ אוטומטית ספקים זמינים לקריאות חדשות</p>
            </div>
            <Switch
              checked={settings.autoAssignEnabled}
              onCheckedChange={(checked) => updateSetting('autoAssignEnabled', checked)}
            />
          </div>

          {settings.autoAssignEnabled && (
            <>
              <div>
                <Label>קריטריון שיבוץ</Label>
                <Select
                  value={settings.autoAssignCriteria}
                  onValueChange={(value) => updateSetting('autoAssignCriteria', value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rating">דירוג גבוה ביותר</SelectItem>
                    <SelectItem value="proximity">קרוב ביותר</SelectItem>
                    <SelectItem value="response_time">זמן תגובה מהיר ביותר</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">שיבוץ אוטומטי מבוט</Label>
                  <p className="text-sm text-[#616161]">שבץ אוטומטית קריאות שהתקבלו מהבוט</p>
                </div>
                <Switch
                  checked={settings.autoAssignOnBotCall}
                  onCheckedChange={(checked) => updateSetting('autoAssignOnBotCall', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">שיבוץ אוטומטי מנציג</Label>
                  <p className="text-sm text-[#616161]">שבץ אוטומטית קריאות שנוצרו על ידי נציג</p>
                </div>
                <Switch
                  checked={settings.autoAssignOnOperatorCall}
                  onCheckedChange={(checked) => updateSetting('autoAssignOnOperatorCall', checked)}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="w-5 h-5 text-[#ED6C02]" />
            התראות
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">התראת חריגת SLA</Label>
              <p className="text-sm text-[#616161]">שלח התראה למנהל בסכנה לחריגת SLA</p>
            </div>
            <Switch
              checked={settings.notifyManagerOnSLA}
              onCheckedChange={(checked) => updateSetting('notifyManagerOnSLA', checked)}
            />
          </div>

          {settings.notifyManagerOnSLA && (
            <div>
              <Label>זמן התראה לפני חריגה (דקות)</Label>
              <Select
                value={settings.notifyManagerThreshold.toString()}
                onValueChange={(value) => updateSetting('notifyManagerThreshold', parseInt(value))}
              >
                <SelectTrigger className="mt-1 w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 דקות</SelectItem>
                  <SelectItem value="10">10 דקות</SelectItem>
                  <SelectItem value="15">15 דקות</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} className="bg-[#0078D4] hover:bg-[#1976D2] gap-2">
          <Save className="w-4 h-4" />
          שמור הגדרות
        </Button>
      </div>

      {/* Info Box */}
      <Card className="bg-[#E3F2FD] border-[#0078D4]">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Zap className="w-5 h-5 text-[#0078D4] flex-shrink-0 mt-0.5" />
            <div className="space-y-2 text-sm">
              <p className="font-medium text-[#0078D4]">תכונות אוטומציה פעילות</p>
              <ul className="list-disc list-inside space-y-1 text-[#616161]">
                <li>שליחת SMS אוטומטי ללקוחות בעדכוני סטטוס</li>
                <li>שיבוץ אוטומטי של ספקים לפי מיקום, דירוג וזמינות</li>
                <li>התראות למנהלים על חריגות SLA</li>
                <li>רישום אוטומטי של כל הפעולות בהיסטוריה</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
