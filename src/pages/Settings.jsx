import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Settings as SettingsIcon, Building2, Clock, Save, Database, Loader2 } from 'lucide-react';
import { SlideUp } from '@/components/animations/AnimatedComponents';
import { showToast } from '@/components/ui/FeedbackToast';
import { base44 } from '@/api/base44Client';

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    companyName: 'נתי שירותי דרך',
    defaultSlaMinutes: 30,
    timezone: 'Asia/Jerusalem',
    workingHoursStart: '08:00',
    workingHoursEnd: '22:00',
  });
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState(null);

  const handleSave = () => {
    // In a real app, this would save to backend
    localStorage.setItem('systemSettings', JSON.stringify(settings));
    showToast.success('ההגדרות נשמרו בהצלחה');
  };

  useEffect(() => {
    const saved = localStorage.getItem('systemSettings');
    if (saved) {
      setSettings(JSON.parse(saved));
    }
  }, []);

  const handleSeedDemoData = async () => {
    if (
      !window.confirm('פעולה זו תיצור נתוני דמו במערכת (משתמשים, לקוחות, ספקים, קריאות). להמשיך?')
    ) {
      return;
    }
    setSeeding(true);
    setSeedResult(null);
    try {
      const result = await base44.functions.invoke('seedDemoData', {
        seed_users: true,
        seed_customers: true,
        seed_vendors: true,
        seed_calls: true,
        seed_history: true,
        seed_ratings: true,
        seed_notifications: true,
        seed_queue: true,
        clear_existing: false,
      });
      setSeedResult(result);
      showToast.success('נתוני דמו נוצרו בהצלחה');
    } catch (e) {
      console.error('Seed failed:', e);
      showToast.error('שגיאה ביצירת נתוני דמו: ' + (e.message || 'שגיאה לא ידועה'));
    } finally {
      setSeeding(false);
    }
  };

  return (
    <SlideUp>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-[#111827]">הגדרות מערכת</h1>
          <p className="text-[#6b7280] text-sm">הגדרות כלליות של המערכת</p>
        </div>

        {/* Company Info */}
        <Card className="bg-white border border-[#e5e7eb]">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#3b82f6]" />
              פרטי החברה
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>שם החברה</Label>
              <Input
                value={settings.companyName}
                onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        {/* SLA Settings */}
        <Card className="bg-white border border-[#e5e7eb]">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#3b82f6]" />
              הגדרות SLA
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>זמן SLA ברירת מחדל (בדקות)</Label>
              <Input
                type="number"
                value={settings.defaultSlaMinutes}
                onChange={(e) =>
                  setSettings({ ...settings, defaultSlaMinutes: parseInt(e.target.value) || 30 })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>שעת התחלת יום עבודה</Label>
                <div className="relative">
                  <Clock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    type="time"
                    value={settings.workingHoursStart}
                    onChange={(e) =>
                      setSettings({ ...settings, workingHoursStart: e.target.value })
                    }
                    className="pr-9 [&::-webkit-calendar-picker-indicator]:hidden"
                  />
                </div>
              </div>
              <div>
                <Label>שעת סיום יום עבודה</Label>
                <div className="relative">
                  <Clock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    type="time"
                    value={settings.workingHoursEnd}
                    onChange={(e) => setSettings({ ...settings, workingHoursEnd: e.target.value })}
                    className="pr-9 [&::-webkit-calendar-picker-indicator]:hidden"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Timezone */}
        <Card className="bg-white border border-[#e5e7eb]">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <SettingsIcon className="w-5 h-5 text-[#3b82f6]" />
              הגדרות אזור
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <Label>אזור זמן</Label>
              <Select
                value={settings.timezone}
                onValueChange={(val) => setSettings({ ...settings, timezone: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Asia/Jerusalem">ישראל (Asia/Jerusalem)</SelectItem>
                  <SelectItem value="UTC">UTC</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} className="bg-[#3b82f6] hover:bg-[#2563eb] gap-2">
            <Save className="w-4 h-4" />
            שמור הגדרות
          </Button>
        </div>

        {/* Demo Data */}
        <Card className="bg-white border border-[#e5e7eb] border-dashed">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Database className="w-5 h-5 text-[#f59e0b]" />
              נתוני דמו
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-[#6b7280]">
              יצירת נתוני דמו למערכת: משתמשים (12), לקוחות, ספקים (10), קריאות (30), דירוגים, התראות
              ועוד. לשימוש בסביבת בדיקות בלבד.
            </p>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={handleSeedDemoData}
                disabled={seeding}
                className="gap-2 border-[#f59e0b] text-[#f59e0b] hover:bg-[#fef3c7]"
              >
                {seeding ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Database className="w-4 h-4" />
                )}
                {seeding ? 'יוצר נתוני דמו...' : 'טען נתוני דמו'}
              </Button>
              {seedResult && <span className="text-sm text-green-600">נתוני דמו נוצרו בהצלחה</span>}
            </div>
          </CardContent>
        </Card>
      </div>
    </SlideUp>
  );
}
