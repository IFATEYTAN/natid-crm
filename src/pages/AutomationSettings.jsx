import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { queryKeys } from '@/lib/queryKeys';
import RoleGuard from '@/components/auth/RoleGuard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Zap,
  Settings,
  MapPin,
  Star,
  Clock,
  Truck,
  Save,
  RotateCcw,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const defaultSettings = {
  auto_assign_enabled: true,
  max_distance_km: 30,
  min_vendor_rating: 3.0,
  max_response_time_minutes: 45,
  assignment_expiry_minutes: 5,
  max_reassignment_attempts: 3,
  priority_weights: {
    distance: 40,
    service_match: 20,
    rating: 20,
    response_time: 10,
    completion_rate: 10,
  },
  auto_escalate_on_sla_breach: true,
  notify_admin_on_no_vendors: true,
  prefer_vendors_with_location: true,
};

export default function AutomationSettingsPage() {
  const [settings, setSettings] = useState(defaultSettings);
  const [hasChanges, setHasChanges] = useState(false);
  const queryClient = useQueryClient();

  // Load settings from database
  const settingsQuery = useQuery({
    queryKey: queryKeys.settings.automation(),
    queryFn: async () => {
      const results = await base44.entities.Setting.filter({ key: 'auto_assign_settings' });
      if (results?.[0]?.value) {
        try {
          return JSON.parse(results[0].value);
        } catch {
          return null;
        }
      }
      return null;
    },
  });

  useEffect(() => {
    if (settingsQuery.data) {
      setSettings((prev) => ({ ...prev, ...settingsQuery.data }));
    }
  }, [settingsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async (newSettings) => {
      const existing = await base44.entities.Setting.filter({ key: 'auto_assign_settings' });
      if (existing?.[0]) {
        return base44.entities.Setting.update(existing[0].id, {
          value: JSON.stringify(newSettings),
        });
      } else {
        return base44.entities.Setting.create({
          key: 'auto_assign_settings',
          value: JSON.stringify(newSettings),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.automation() });
      toast.success('הגדרות נשמרו בהצלחה');
      setHasChanges(false);
    },
    onError: (error) => {
      toast.error(`שגיאה בשמירת הגדרות: ${error.message || 'שגיאה לא ידועה'}`);
    },
  });

  const handleSave = () => {
    saveMutation.mutate(settings);
  };

  const handleReset = () => {
    setSettings(defaultSettings);
    setHasChanges(true);
  };

  const updateSetting = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const updateWeight = (key, value) => {
    setSettings((prev) => ({
      ...prev,
      priority_weights: { ...prev.priority_weights, [key]: value },
    }));
    setHasChanges(true);
  };

  const totalWeight = Object.values(settings.priority_weights).reduce((a, b) => a + b, 0);

  return (
    <RoleGuard allowedRoles={['admin']}>
      <div className="space-y-4 sm:space-y-6 max-w-4xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#172B4D] flex items-center gap-2">
              <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-red-600 shrink-0" />
              הגדרות שיבוץ אוטומטי
            </h1>
            <p className="text-[#6B778C] text-sm">קביעת כללים לשיבוץ ספקים אוטומטי</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleReset} className="gap-2 h-11">
              <RotateCcw className="w-4 h-4" />
              איפוס
            </Button>
            <Button
              onClick={handleSave}
              disabled={!hasChanges || saveMutation.isPending}
              className="bg-red-600 hover:bg-red-700 gap-2 h-11"
            >
              {saveMutation.isPending ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              שמור שינויים
            </Button>
          </div>
        </div>

        {/* Main Toggle */}
        <Card className="bg-white border-2 border-red-100">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div
                  className={cn(
                    'w-12 h-12 rounded-full flex items-center justify-center',
                    settings.auto_assign_enabled ? 'bg-green-100' : 'bg-gray-100'
                  )}
                >
                  <Zap
                    className={cn(
                      'w-6 h-6',
                      settings.auto_assign_enabled ? 'text-green-600' : 'text-gray-400'
                    )}
                  />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">שיבוץ אוטומטי</h3>
                  <p className="text-sm text-[#6B778C]">
                    {settings.auto_assign_enabled
                      ? 'המערכת תשבץ ספקים אוטומטית לקריאות חדשות'
                      : 'שיבוץ ידני בלבד'}
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.auto_assign_enabled}
                onCheckedChange={(checked) => updateSetting('auto_assign_enabled', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Distance & Time Settings */}
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MapPin className="w-5 h-5 text-blue-600" />
              הגבלות מרחק וזמן
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="flex justify-between mb-2">
                <Label>מרחק מקסימלי לשיבוץ</Label>
                <span className="text-sm font-medium">{settings.max_distance_km} ק"מ</span>
              </div>
              <Slider
                value={[settings.max_distance_km]}
                onValueChange={([val]) => updateSetting('max_distance_km', val)}
                min={5}
                max={100}
                step={5}
              />
              <p className="text-xs text-[#6B778C] mt-1">ספקים מעבר למרחק זה לא יוצעו</p>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <Label>זמן תגובה מקסימלי לאישור</Label>
                <span className="text-sm font-medium">
                  {settings.assignment_expiry_minutes} דקות
                </span>
              </div>
              <Slider
                value={[settings.assignment_expiry_minutes]}
                onValueChange={([val]) => updateSetting('assignment_expiry_minutes', val)}
                min={2}
                max={15}
                step={1}
              />
              <p className="text-xs text-[#6B778C] mt-1">אם הספק לא יגיב, הקריאה תועבר לספק הבא</p>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <Label>מספר ניסיונות שיבוץ מחדש</Label>
                <span className="text-sm font-medium">{settings.max_reassignment_attempts}</span>
              </div>
              <Slider
                value={[settings.max_reassignment_attempts]}
                onValueChange={([val]) => updateSetting('max_reassignment_attempts', val)}
                min={1}
                max={10}
                step={1}
              />
            </div>
          </CardContent>
        </Card>

        {/* Quality Settings */}
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Star className="w-5 h-5 text-yellow-500" />
              דרישות איכות
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="flex justify-between mb-2">
                <Label>דירוג מינימלי לשיבוץ</Label>
                <span className="text-sm font-medium">{settings.min_vendor_rating} כוכבים</span>
              </div>
              <Slider
                value={[settings.min_vendor_rating]}
                onValueChange={([val]) => updateSetting('min_vendor_rating', val)}
                min={1}
                max={5}
                step={0.5}
              />
              <p className="text-xs text-[#6B778C] mt-1">
                ספקים עם דירוג נמוך יותר לא יוצעו אוטומטית
              </p>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <Label>זמן תגובה מקסימלי ממוצע</Label>
                <span className="text-sm font-medium">
                  {settings.max_response_time_minutes} דקות
                </span>
              </div>
              <Slider
                value={[settings.max_response_time_minutes]}
                onValueChange={([val]) => updateSetting('max_response_time_minutes', val)}
                min={15}
                max={90}
                step={5}
              />
            </div>
          </CardContent>
        </Card>

        {/* Scoring Weights */}
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Settings className="w-5 h-5 text-purple-600" />
              משקולות ניקוד
            </CardTitle>
            <CardDescription>
              קבע את החשיבות היחסית של כל קריטריון בחישוב הציון
              {totalWeight !== 100 && (
                <span className="text-red-500 me-2">(סה"כ: {totalWeight}%, צריך להיות 100%)</span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { key: 'distance', label: 'מרחק גאוגרפי', icon: MapPin, color: 'text-blue-600' },
              {
                key: 'service_match',
                label: 'התאמת סוג שירות',
                icon: Truck,
                color: 'text-green-600',
              },
              { key: 'rating', label: 'דירוג ממוצע', icon: Star, color: 'text-yellow-500' },
              {
                key: 'response_time',
                label: 'זמן תגובה ממוצע',
                icon: Clock,
                color: 'text-orange-600',
              },
              {
                key: 'completion_rate',
                label: 'אחוז השלמה',
                icon: CheckCircle,
                color: 'text-purple-600',
              },
            ].map(({ key, label, icon: Icon, color }) => (
              <div key={key} className="flex items-center gap-3 sm:gap-4">
                <Icon className={cn('w-5 h-5 shrink-0', color)} />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between mb-1 gap-2">
                    <Label className="text-sm truncate">{label}</Label>
                    <span className="text-sm font-medium shrink-0">{settings.priority_weights[key]}%</span>
                  </div>
                  <Slider
                    value={[settings.priority_weights[key]]}
                    onValueChange={([val]) => updateWeight(key, val)}
                    min={0}
                    max={50}
                    step={5}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Additional Options */}
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertCircle className="w-5 h-5 text-red-600" />
              אפשרויות נוספות
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-3 py-3">
              <div className="flex-1 min-w-0">
                <Label className="text-sm">הסלמה אוטומטית בחריגת SLA</Label>
                <p className="text-xs text-[#6B778C]">התראה למנהל כאשר קריאה חורגת מזמן התגובה</p>
              </div>
              <Switch
                className="shrink-0"
                checked={settings.auto_escalate_on_sla_breach}
                onCheckedChange={(checked) => updateSetting('auto_escalate_on_sla_breach', checked)}
              />
            </div>

            <div className="flex items-center justify-between gap-3 py-3 border-t">
              <div className="flex-1 min-w-0">
                <Label className="text-sm">התראה כשאין ספקים זמינים</Label>
                <p className="text-xs text-[#6B778C]">שלח התראה למנהל כשלא נמצא ספק מתאים</p>
              </div>
              <Switch
                className="shrink-0"
                checked={settings.notify_admin_on_no_vendors}
                onCheckedChange={(checked) => updateSetting('notify_admin_on_no_vendors', checked)}
              />
            </div>

            <div className="flex items-center justify-between gap-3 py-3 border-t">
              <div className="flex-1 min-w-0">
                <Label className="text-sm">העדפה לספקים עם מיקום פעיל</Label>
                <p className="text-xs text-[#6B778C]">עדיפות לספקים שמשתפים GPS בזמן אמת</p>
              </div>
              <Switch
                className="shrink-0"
                checked={settings.prefer_vendors_with_location}
                onCheckedChange={(checked) =>
                  updateSetting('prefer_vendors_with_location', checked)
                }
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </RoleGuard>
  );
}