import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Play, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useSeedDemoData } from '@/features/settings/hooks/useDemoData';

const SEED_OPTIONS = [
  { key: 'seed_users', label: 'משתמשי דמו', description: 'admin, operator, vendor (לבדיקות E2E)' },
  { key: 'seed_customers', label: 'לקוחות', description: 'חברות ביטוח + צי רכב' },
  { key: 'seed_vendors', label: 'ספקים + צי רכב', description: 'ספקים חיצוניים ויחידות פנימיות' },
  { key: 'seed_calls', label: 'קריאות שירות', description: '~250 קריאות מ-60 הימים האחרונים' },
  { key: 'seed_queue', label: 'תור עבודה', description: 'קריאות ממתינות עם דירוג עדיפות' },
];

const DEFAULT_SELECTION = SEED_OPTIONS.reduce((acc, o) => ({ ...acc, [o.key]: true }), {});

export default function DemoDataPanel() {
  const [selection, setSelection] = useState(DEFAULT_SELECTION);
  const seed = useSeedDemoData();

  const toggle = (key) => setSelection((prev) => ({ ...prev, [key]: !prev[key] }));

  const onSeed = () => {
    if (
      window.confirm(
        'האם ליצור נתוני דמו? פעולה זו תוסיף ~250 קריאות, ספקים ולקוחות למערכת. השתמשי באופציה זו רק בסביבת בדיקות.'
      )
    ) {
      seed.mutate(selection);
    }
  };

  const data = seed.data?.data ?? seed.data;
  const results = data?.results;

  return (
    <Card className="bg-white border border-[#e5e7eb]">
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-md bg-[#a855f7]/10 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-[#a855f7]" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg text-[#111827] flex items-center gap-2">
              נתוני דמו לבדיקות
              <Badge className="bg-purple-100 text-purple-800 text-xs">Sandbox</Badge>
            </CardTitle>
            <CardDescription className="text-[#6b7280]">
              יצירת נתוני בדיקה ריאליסטיים (~250 קריאות מבוססות נתוני אמת מ-2025) לבדיקות מקצה לקצה
              ללא תלות ב-API של נתי. מומלץ להריץ פעם אחת בסביבת staging לפני בדיקות E2E.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-[#111827]">מה ליצור?</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {SEED_OPTIONS.map((opt) => (
              <label
                key={opt.key}
                className="flex items-start gap-3 cursor-pointer p-3 rounded-md border border-[#e5e7eb] hover:bg-[#f9fafb]"
              >
                <Checkbox
                  checked={selection[opt.key]}
                  onCheckedChange={() => toggle(opt.key)}
                  className="mt-0.5"
                />
                <div>
                  <div className="text-sm font-medium text-[#111827]">{opt.label}</div>
                  <div className="text-xs text-[#6b7280]">{opt.description}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-3 pt-2 border-t border-[#e5e7eb]">
          <Button
            onClick={onSeed}
            disabled={seed.isPending}
            className="bg-[#a855f7] hover:bg-[#9333ea] gap-2"
          >
            {seed.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            צור נתוני דמו
          </Button>
          <p className="text-xs text-[#6b7280] flex-1 self-center">
            הפעולה מוגבלת ל-2 הרצות בדקה (rate limit) ועלולה לקחת עד דקה.
          </p>
        </div>

        {data?.success && results && (
          <div className="rounded-md border border-green-200 bg-green-50 p-4 space-y-3">
            <div className="flex items-center gap-2 text-green-900 font-semibold">
              <CheckCircle className="w-4 h-4" /> נתוני הדמו נוצרו בהצלחה
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              {Object.entries(results).map(([key, value]) => (
                <div key={key} className="rounded bg-white p-3 border border-green-100">
                  <div className="text-2xl font-bold text-[#111827]">{value}</div>
                  <div className="text-xs text-[#6b7280]">{key.replace(/_/g, ' ')}</div>
                </div>
              ))}
            </div>
            <div className="text-sm text-green-900">
              סה״כ: {data.total_records ?? 0} רשומות. רענני את דף הדשבורד כדי לראות את הנתונים.
            </div>
          </div>
        )}

        {seed.isError && (
          <div className="rounded-md border border-red-200 bg-red-50 p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <div className="text-sm text-red-900">
              <div className="font-semibold mb-1">שגיאה ביצירת נתוני דמו</div>
              <div>{seed.error?.message || 'שגיאה לא ידועה - בדקי את ה-Console'}</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
