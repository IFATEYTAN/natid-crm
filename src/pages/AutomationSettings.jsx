import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Zap,
  MessageSquare,
  UserCheck,
  Bell,
  Save,
  Clock,
  AlertTriangle,
  CheckCircle,
  Star,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Play,
  Pause
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from "@/lib/utils";

// 7 Automations from spec
const AUTOMATIONS_CONFIG = [
  {
    id: 'new-call',
    name: 'קריאה חדשה נוצרה',
    description: 'מופעל כאשר קריאה חדשה נוצרת במערכת (סטטוס: ממתין לטיפול)',
    trigger: 'קריאה חדשה נוצרה (call_status = "ממתין לטיפול")',
    actions: [
      'שליחת SMS ללקוח: "שלום {customer_name}, קריאה #{call_id} נפתחה בהצלחה. נציג יחזור אליך בקרוב. נתי שירותי דרך 🚗"',
      'הוספת רשומה להיסטוריית קריאה (change_type = "סטטוס", new_value = "קריאה נפתחה")',
      'אם עדיפות = "דחוף" או "קריטי": שליחת התראה לכל משתמשי המוקד'
    ],
    category: 'status',
    enabled: true
  },
  {
    id: 'vendor-assigned',
    name: 'ספק שובץ',
    description: 'מופעל כאשר ספק משובץ לקריאה',
    trigger: 'assigned_vendor_id השתנה מ-NULL לערך',
    actions: [
      'עדכון סטטוס קריאה ל"בשיוך", עדכון assigned_at',
      'שליחת SMS לספק: "קריאה חדשה #{call_id}: {customer_name}, {pickup_location_address}. טלפון: {customer_phone}"',
      'שליחת SMS ללקוח: "ספק שובץ! {vendor_name} יגיע תוך {estimated_time}. טלפון ספק: {vendor_phone}"',
      'הוספת רשומה להיסטוריית קריאה (change_type = "שיוך ספק")',
      'הפעלת אנימציית חגיגה (2 שניות)'
    ],
    category: 'assignment',
    enabled: true
  },
  {
    id: 'vendor-enroute',
    name: 'ספק בדרך',
    description: 'מופעל כאשר הספק מתחיל נסיעה ללקוח',
    trigger: 'call_status השתנה ל"ספק בדרך"',
    actions: [
      'שליחת SMS ללקוח: "הספק בדרך אליך! זמן הגעה משוער: {vendor_arrival_time_estimated}. נתי שירותי דרך 🚗"',
      'הוספת רשומה להיסטוריית קריאה (change_type = "סטטוס", new_value = "ספק בדרך")',
      'הפעלת אנימציית משאית נוסעת'
    ],
    category: 'status',
    enabled: true
  },
  {
    id: 'sla-warning',
    name: 'התראת SLA קרובה',
    description: 'מופעל כאשר קריאה מתקרבת לחריגת SLA',
    trigger: '(NOW() - created_at) > (sla_target - 10 דקות) וסטטוס בממתין',
    actions: [
      'עדכון sla_status ל"קרוב לחריגה"',
      'הצגת Toast התראה: "קריאה #{call_id} קרובה לחריגת SLA!" (צבע אזהרה)',
      'הדגשת השורה באדום בטבלת הקריאות',
      'שליחת אימייל למנהל מוקד: "התראת SLA - קריאה #{call_id}"'
    ],
    category: 'sla',
    enabled: true
  },
  {
    id: 'sla-breach',
    name: 'חריגת SLA',
    description: 'מופעל כאשר קריאה חורגת מיעד ה-SLA',
    trigger: '(NOW() - created_at) > sla_target וקריאה לא הושלמה/בוטלה',
    actions: [
      'עדכון sla_status ל"חרג"',
      'הצגת Toast קריטי: "קריאה #{call_id} חרגה מ-SLA!" (צבע שגיאה)',
      'הוספת רשומה להיסטוריית קריאה (change_type = "אחר", new_value = "חריגת SLA")',
      'שליחת אימייל דחוף למנהל מוקד + מנהל מערכת',
      'הפעלת אנימציית רעידה (התראה)'
    ],
    category: 'sla',
    enabled: true
  },
  {
    id: 'call-completed',
    name: 'קריאה הושלמה',
    description: 'מופעל כאשר קריאה מסומנת כהושלמה',
    trigger: 'call_status השתנה ל"הושלם"',
    actions: [
      'עדכון closed_at ו-closed_by',
      'עדכון סטטיסטיקות ספק: total_calls_completed += 1, last_call_date = NOW()',
      'חישוב מחדש של דירוג ממוצע וזמן תגובה ממוצע לספק',
      'שליחת SMS ללקוח: "תודה {customer_name}! איך היה השירות? דרג אותנו: [LINK]"',
      'הוספת רשומה להיסטוריית קריאה',
      'הפעלת אנימציית הצלחה (2 שניות)'
    ],
    category: 'status',
    enabled: true
  },
  {
    id: 'rating-received',
    name: 'דירוג התקבל',
    description: 'מופעל כאשר לקוח מדרג את השירות',
    trigger: 'customer_rating עודכן (לא NULL)',
    actions: [
      'אם דירוג >= 4: שליחת SMS ללקוח: "תודה על הדירוג! נשמח לראותך שוב. נתי שירותי דרך ❤️"',
      'אם דירוג <= 2: שליחת אימייל למנהל מוקד: "דירוג נמוך בקריאה #{call_id}: {customer_rating}/5"',
      'אם דירוג <= 2: סימון קריאה למעקב',
      'חישוב מחדש של דירוג ממוצע לספק'
    ],
    category: 'feedback',
    enabled: false
  }
];

export default function AutomationSettings() {
  const [automations, setAutomations] = useState(AUTOMATIONS_CONFIG);
  const [expandedAutomations, setExpandedAutomations] = useState({});
  const [smsTemplates, setSmsTemplates] = useState({
    newCall: 'שלום {customer_name}, קריאה #{call_id} נפתחה בהצלחה. נציג יחזור אליך בקרוב. נתי שירותי דרך 🚗',
    vendorAssigned: 'ספק שובץ! {vendor_name} יגיע תוך {estimated_time}. טלפון ספק: {vendor_phone}',
    vendorEnroute: 'הספק בדרך אליך! זמן הגעה משוער: {vendor_arrival_time_estimated}. נתי שירותי דרך 🚗',
    completed: 'תודה {customer_name}! איך היה השירות? דרג אותנו: [LINK]',
    ratingThanks: 'תודה על הדירוג! נשמח לראותך שוב. נתי שירותי דרך ❤️'
  });
  const [slaSettings, setSlaSettings] = useState({
    warningMinutes: 10,
    notifyManager: true,
    notifyAdmin: true
  });

  const toggleAutomation = (automationId) => {
    setAutomations(prev => prev.map(a =>
      a.id === automationId ? { ...a, enabled: !a.enabled } : a
    ));
  };

  const toggleExpanded = (automationId) => {
    setExpandedAutomations(prev => ({
      ...prev,
      [automationId]: !prev[automationId]
    }));
  };

  const handleSave = () => {
    localStorage.setItem('automationSettings', JSON.stringify({
      automations,
      smsTemplates,
      slaSettings
    }));
    toast.success('ההגדרות נשמרו בהצלחה');
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'status': return <RefreshCw className="w-4 h-4" />;
      case 'assignment': return <UserCheck className="w-4 h-4" />;
      case 'sla': return <AlertTriangle className="w-4 h-4" />;
      case 'feedback': return <Star className="w-4 h-4" />;
      default: return <Zap className="w-4 h-4" />;
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'status': return 'text-[#3B82F6] bg-[#EFF6FF]';
      case 'assignment': return 'text-[#10B981] bg-[#ECFDF5]';
      case 'sla': return 'text-[#F59E0B] bg-[#FFFBEB]';
      case 'feedback': return 'text-[#8B5CF6] bg-[#F5F3FF]';
      default: return 'text-[#6B7280] bg-[#F3F4F6]';
    }
  };

  const getCategoryLabel = (category) => {
    switch (category) {
      case 'status': return 'שינוי סטטוס';
      case 'assignment': return 'שיוך ספק';
      case 'sla': return 'SLA';
      case 'feedback': return 'משוב';
      default: return 'כללי';
    }
  };

  const enabledCount = automations.filter(a => a.enabled).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-bold text-[#212121]">אוטומציות</h1>
          <p className="text-[14px] text-[#616161] mt-1">
            ניהול תהליכים אוטומטיים במערכת
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-left">
            <div className="text-[24px] font-bold text-[#3B82F6]">{enabledCount}/{automations.length}</div>
            <div className="text-[13px] text-[#6B7280]">אוטומציות פעילות</div>
          </div>
          <Button onClick={handleSave} className="bg-[#3B82F6] hover:bg-[#2563EB] gap-2">
            <Save className="w-4 h-4" />
            שמור הגדרות
          </Button>
        </div>
      </div>

      {/* Automations List */}
      <div className="space-y-4">
        <h2 className="text-[18px] font-semibold text-[#212121]">כל האוטומציות ({automations.length})</h2>

        {automations.map((automation) => (
          <Card key={automation.id} className={cn(
            "transition-all duration-200",
            automation.enabled ? "border-[#3B82F6] shadow-sm" : "border-[#E5E7EB]"
          )}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <div className={cn(
                    "p-2 rounded-lg mt-0.5",
                    getCategoryColor(automation.category)
                  )}>
                    {getCategoryIcon(automation.category)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <CardTitle className="text-[16px] font-semibold">
                        {automation.name}
                      </CardTitle>
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[11px] font-medium",
                        getCategoryColor(automation.category)
                      )}>
                        {getCategoryLabel(automation.category)}
                      </span>
                    </div>
                    <p className="text-[13px] text-[#6B7280]">
                      {automation.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={automation.enabled}
                    onCheckedChange={() => toggleAutomation(automation.id)}
                  />
                  <div className={cn(
                    "px-3 py-1 rounded-full text-[12px] font-medium",
                    automation.enabled
                      ? "bg-[#DBEAFE] text-[#1D4ED8]"
                      : "bg-[#F3F4F6] text-[#6B7280]"
                  )}>
                    {automation.enabled ? 'פעיל' : 'מושבת'}
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              {/* Trigger */}
              <div className="bg-[#F9FAFB] rounded-lg p-3 mb-3">
                <div className="flex items-center gap-2 text-[13px]">
                  <Play className="w-4 h-4 text-[#3B82F6]" />
                  <span className="font-medium text-[#374151]">טריגר:</span>
                  <span className="text-[#6B7280]">{automation.trigger}</span>
                </div>
              </div>

              {/* Expand/Collapse Actions */}
              <button
                onClick={() => toggleExpanded(automation.id)}
                className="flex items-center gap-1 text-[13px] text-[#3B82F6] hover:text-[#2563EB] transition-colors"
              >
                {expandedAutomations[automation.id] ? (
                  <>
                    <ChevronUp className="w-4 h-4" />
                    הסתר פעולות
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    הצג {automation.actions.length} פעולות
                  </>
                )}
              </button>

              {/* Actions List */}
              {expandedAutomations[automation.id] && (
                <div className="mt-3 space-y-2 border-t border-[#E5E7EB] pt-3">
                  <h4 className="text-[13px] font-semibold text-[#374151] mb-2">פעולות:</h4>
                  {automation.actions.map((action, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-[13px]">
                      <span className="text-[#3B82F6] font-bold">{idx + 1}.</span>
                      <span className="text-[#6B7280]">{action}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* SMS Templates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[16px]">
            <MessageSquare className="w-5 h-5 text-[#3B82F6]" />
            תבניות הודעות SMS
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-[13px]">הודעת קריאה חדשה</Label>
            <Textarea
              value={smsTemplates.newCall}
              onChange={(e) => setSmsTemplates(prev => ({ ...prev, newCall: e.target.value }))}
              rows={2}
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-[13px]">הודעת שיוך ספק</Label>
            <Textarea
              value={smsTemplates.vendorAssigned}
              onChange={(e) => setSmsTemplates(prev => ({ ...prev, vendorAssigned: e.target.value }))}
              rows={2}
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-[13px]">הודעת ספק בדרך</Label>
            <Textarea
              value={smsTemplates.vendorEnroute}
              onChange={(e) => setSmsTemplates(prev => ({ ...prev, vendorEnroute: e.target.value }))}
              rows={2}
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-[13px]">הודעת השלמת קריאה</Label>
            <Textarea
              value={smsTemplates.completed}
              onChange={(e) => setSmsTemplates(prev => ({ ...prev, completed: e.target.value }))}
              rows={2}
              className="mt-1"
            />
          </div>
          <p className="text-[12px] text-[#9CA3AF]">
            משתנים זמינים: {'{customer_name}'}, {'{call_id}'}, {'{vendor_name}'}, {'{vendor_phone}'}, {'{estimated_time}'}, {'{vendor_arrival_time_estimated}'}
          </p>
        </CardContent>
      </Card>

      {/* SLA Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[16px]">
            <Clock className="w-5 h-5 text-[#F59E0B]" />
            הגדרות SLA
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-[14px]">זמן התראה לפני חריגה</Label>
              <p className="text-[12px] text-[#6B7280]">כמה דקות לפני חריגת SLA לשלוח התראה</p>
            </div>
            <Select
              value={slaSettings.warningMinutes.toString()}
              onValueChange={(value) => setSlaSettings(prev => ({ ...prev, warningMinutes: parseInt(value) }))}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 דקות</SelectItem>
                <SelectItem value="10">10 דקות</SelectItem>
                <SelectItem value="15">15 דקות</SelectItem>
                <SelectItem value="20">20 דקות</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-[14px]">התראה למנהל מוקד</Label>
              <p className="text-[12px] text-[#6B7280]">שלח אימייל למנהל מוקד בחריגת SLA</p>
            </div>
            <Switch
              checked={slaSettings.notifyManager}
              onCheckedChange={(checked) => setSlaSettings(prev => ({ ...prev, notifyManager: checked }))}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-[14px]">התראה למנהל מערכת</Label>
              <p className="text-[12px] text-[#6B7280]">שלח אימייל גם למנהל מערכת בחריגות קריטיות</p>
            </div>
            <Switch
              checked={slaSettings.notifyAdmin}
              onCheckedChange={(checked) => setSlaSettings(prev => ({ ...prev, notifyAdmin: checked }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Info Box */}
      <Card className="bg-[#EFF6FF] border-[#3B82F6]">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Zap className="w-5 h-5 text-[#3B82F6] flex-shrink-0 mt-0.5" />
            <div className="space-y-2 text-[13px]">
              <p className="font-medium text-[#1D4ED8]">מידע על אוטומציות</p>
              <ul className="list-disc list-inside space-y-1 text-[#4B5563]">
                <li>אוטומציות רצות ברקע ומופעלות אוטומטית לפי הטריגר המוגדר</li>
                <li>ניתן להפעיל או לכבות כל אוטומציה בנפרד</li>
                <li>שינויים בתבניות SMS יחולו על הודעות עתידיות בלבד</li>
                <li>לוג מלא של כל הפעולות זמין ביומן הפעילות</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
