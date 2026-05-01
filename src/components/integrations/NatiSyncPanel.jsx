import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Database, Eye, Play, AlertCircle, CheckCircle, Loader2, Clock } from 'lucide-react';
import { useNatiSyncDryRun, useNatiSyncRun } from '@/features/settings/hooks/useNatiSync';

const STORAGE_KEY = 'natid_sync_panel_filters';
const LAST_SYNC_KEY = 'natid_last_sync_at';

/**
 * Returns a Hebrew "X minutes ago" style relative time, or null if no value.
 */
function formatRelative(isoString) {
  if (!isoString) return null;
  const then = new Date(isoString).getTime();
  if (isNaN(then)) return null;
  const diffSec = Math.floor((Date.now() - then) / 1000);
  if (diffSec < 30) return 'לפני רגע';
  if (diffSec < 60) return `לפני ${diffSec} שניות`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `לפני ${diffMin} דקות`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `לפני ${diffH} שעות`;
  const diffD = Math.floor(diffH / 24);
  return `לפני ${diffD} ימים`;
}

// Source: src/docs/nati-api-reference.md
const DEPARTMENT_OPTIONS = [
  { value: '-1', label: 'הכל' },
  { value: '3', label: 'גרירה' },
  { value: '4', label: 'השכרה' },
  { value: '5', label: 'שמשות' },
  { value: '10', label: 'רדיו דיסק' },
  { value: '11', label: 'משולב (גרירה + רדיו דיסק)' },
];

const STATUS_OPTIONS = [
  { value: '-1', label: 'כל הסטטוסים הפתוחים' },
  { value: '0', label: 'ממתין' },
  { value: '1', label: 'בטיפול' },
  { value: '2', label: 'באחסנה' },
  { value: '3', label: 'המשך טיפול' },
  { value: '4', label: 'בוצע לא סגור' },
  { value: '5', label: 'הגיע' },
  { value: '6', label: 'שירות עתידי' },
  { value: '10', label: 'VIP' },
];

const DEFAULT_FILTERS = {
  dep: '-1',
  callStatus: '-1',
  from_date: '',
  to_date: '',
  sync_calls: true,
  sync_cases: true,
  sync_vendors: true,
  sync_customers: true,
};

const loadFilters = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_FILTERS;
    return { ...DEFAULT_FILTERS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_FILTERS;
  }
};

const saveFilters = (filters) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
  } catch {
    // localStorage may be unavailable - silently ignore
  }
};

const buildPayload = (filters) => ({
  dep: parseInt(filters.dep, 10),
  callStatus: parseInt(filters.callStatus, 10),
  from_date: filters.from_date || undefined,
  to_date: filters.to_date || undefined,
  sync_calls: filters.sync_calls,
  sync_cases: filters.sync_cases,
  sync_vendors: filters.sync_vendors,
  sync_customers: filters.sync_customers,
});

const ResultStat = ({ label, value, tone = 'default' }) => {
  const toneClass = {
    default: 'bg-gray-50 text-gray-900',
    success: 'bg-green-50 text-green-900',
    warning: 'bg-yellow-50 text-yellow-900',
    error: 'bg-red-50 text-red-900',
  }[tone];
  return (
    <div className={`rounded-md p-3 ${toneClass}`}>
      <div className="text-2xl font-bold">{value ?? 0}</div>
      <div className="text-xs">{label}</div>
    </div>
  );
};

export default function NatiSyncPanel() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [lastSyncAt, setLastSyncAt] = useState(null);
  // Tick once a minute to keep the relative timestamp ("לפני X דקות") fresh
  // without re-rendering on every keystroke.
  const [, forceTick] = useState(0);
  const dryRun = useNatiSyncDryRun();
  const runSync = useNatiSyncRun();

  useEffect(() => {
    setFilters(loadFilters());
    try {
      setLastSyncAt(localStorage.getItem(LAST_SYNC_KEY));
    } catch {
      // localStorage may be unavailable - silently ignore
    }
  }, []);

  useEffect(() => {
    saveFilters(filters);
  }, [filters]);

  // Keep the "X minutes ago" label fresh.
  useEffect(() => {
    const id = setInterval(() => forceTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  // Persist the timestamp the moment a real sync succeeds.
  useEffect(() => {
    if (runSync.isSuccess && !runSync.data?.data?.error) {
      const now = new Date().toISOString();
      try {
        localStorage.setItem(LAST_SYNC_KEY, now);
      } catch {
        // localStorage may be unavailable - silently ignore
      }
      setLastSyncAt(now);
    }
  }, [runSync.isSuccess, runSync.data]);

  const update = (key, value) => setFilters((prev) => ({ ...prev, [key]: value }));

  const onDryRun = () => dryRun.mutate(buildPayload(filters));
  const onRun = () => {
    if (window.confirm('האם להריץ סנכרון אמיתי? פעולה זו תוסיף/תעדכן רשומות במערכת.')) {
      runSync.mutate(buildPayload(filters));
    }
  };

  const isPending = dryRun.isPending || runSync.isPending;
  const dryRunData = dryRun.data?.data ?? dryRun.data;
  const runData = runSync.data?.data ?? runSync.data;
  const lastSyncRelative = formatRelative(lastSyncAt);

  return (
    <Card className="bg-white border border-[#e5e7eb]">
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-md bg-[#3b82f6]/10 flex items-center justify-center">
            <Database className="w-5 h-5 text-[#3b82f6]" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg text-[#111827] flex items-center gap-2">
              סנכרון מנתי שירותים
              <Badge className="bg-amber-100 text-amber-800 text-xs">דמו / Read-only</Badge>
            </CardTitle>
            <CardDescription className="text-[#6b7280]">
              משיכת קריאות, ספקים ולקוחות מה-API של נתי לתוך מערכת ה-CRM. השלב הראשון הוא קריאה בלבד
              - שינויים בממשק שלנו לא יחזרו לנתי בשלב זה.
            </CardDescription>
            {lastSyncRelative && (
              <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-[#6b7280]">
                <Clock className="w-3.5 h-3.5" />
                <span>סנכרון אחרון: {lastSyncRelative}</span>
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Filters */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-[#111827]">סינון</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nati-dep" className="text-sm text-[#6b7280]">
                מחלקה
              </Label>
              <Select value={filters.dep} onValueChange={(v) => update('dep', v)}>
                <SelectTrigger id="nati-dep">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEPARTMENT_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nati-status" className="text-sm text-[#6b7280]">
                סטטוס
              </Label>
              <Select value={filters.callStatus} onValueChange={(v) => update('callStatus', v)}>
                <SelectTrigger id="nati-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nati-from" className="text-sm text-[#6b7280]">
                מתאריך
              </Label>
              <Input
                id="nati-from"
                type="date"
                value={filters.from_date}
                onChange={(e) => update('from_date', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nati-to" className="text-sm text-[#6b7280]">
                עד תאריך
              </Label>
              <Input
                id="nati-to"
                type="date"
                value={filters.to_date}
                onChange={(e) => update('to_date', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Entities to sync */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-[#111827]">סוגי נתונים לסנכרון</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { key: 'sync_calls', label: 'קריאות' },
              { key: 'sync_cases', label: 'אירועים (Cases)' },
              { key: 'sync_vendors', label: 'ספקים' },
              { key: 'sync_customers', label: 'לקוחות' },
            ].map((item) => (
              <label key={item.key} className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={filters[item.key]}
                  onCheckedChange={(checked) => update(item.key, !!checked)}
                />
                <span className="text-sm text-[#111827]">{item.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3 pt-2 border-t border-[#e5e7eb]">
          <Button variant="outline" onClick={onDryRun} disabled={isPending} className="gap-2">
            {dryRun.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
            תצוגה מקדימה (Dry Run)
          </Button>
          <Button
            onClick={onRun}
            disabled={isPending}
            className="bg-[#3b82f6] hover:bg-[#2563eb] gap-2"
          >
            {runSync.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            בצע סנכרון
          </Button>
          <p className="text-xs text-[#6b7280] flex-1 self-center">
            סנכרון מוגבל ל-30 רשומות בכל הרצה. להרצה מלאה - הריצי כמה פעמים.
          </p>
        </div>

        {/* Dry Run Results */}
        {dryRunData && !dryRunData.error && dryRunData.mode === 'dry_run' && (
          <div className="rounded-md border border-blue-200 bg-blue-50 p-4 space-y-3">
            <div className="flex items-center gap-2 text-blue-900 font-semibold">
              <Eye className="w-4 h-4" /> תוצאות תצוגה מקדימה
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <ResultStat label="סה״כ ב-API" value={dryRunData.total_from_nati} />
              <ResultStat label="יסונכרנו" value={dryRunData.appeals_count} tone="success" />
              <ResultStat label="ספקים" value={dryRunData.vendors_found} />
              <ResultStat label="לקוחות" value={dryRunData.customers_found} />
            </div>
            {dryRunData.sample_call && (
              <details className="text-xs">
                <summary className="cursor-pointer text-blue-700 font-medium">
                  דוגמה לקריאה אחת שתסונכרן
                </summary>
                <pre
                  dir="ltr"
                  className="mt-2 p-3 bg-white rounded border border-blue-100 overflow-auto max-h-64"
                >
                  {JSON.stringify(dryRunData.sample_call, null, 2)}
                </pre>
              </details>
            )}
          </div>
        )}

        {/* Real Run Results */}
        {runData && !runData.error && runData.success && (
          <div className="rounded-md border border-green-200 bg-green-50 p-4 space-y-3">
            <div className="flex items-center gap-2 text-green-900 font-semibold">
              <CheckCircle className="w-4 h-4" /> הסנכרון הושלם בהצלחה
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <ResultStat label="סה״כ ב-API" value={runData.total_from_nati} />
              <ResultStat label="עובדו" value={runData.processed_appeals} tone="success" />
              <ResultStat
                label="זמן (שניות)"
                value={runData.duration_ms ? Math.round(runData.duration_ms / 1000) : 0}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              {runData.calls && (
                <div className="rounded bg-white p-3 border border-green-100">
                  <div className="font-medium mb-1">קריאות</div>
                  <div className="text-xs text-gray-600">
                    נוצרו: {runData.calls.created} | עודכנו: {runData.calls.updated} | שגיאות:{' '}
                    {runData.calls.errors}
                  </div>
                </div>
              )}
              {runData.cases && (
                <div className="rounded bg-white p-3 border border-green-100">
                  <div className="font-medium mb-1">אירועים</div>
                  <div className="text-xs text-gray-600">
                    נוצרו: {runData.cases.created} | עודכנו: {runData.cases.updated} | שגיאות:{' '}
                    {runData.cases.errors}
                  </div>
                </div>
              )}
              {runData.vendors && (
                <div className="rounded bg-white p-3 border border-green-100">
                  <div className="font-medium mb-1">ספקים</div>
                  <div className="text-xs text-gray-600">
                    נוצרו: {runData.vendors.created ?? 0} | קיימים: {runData.vendors.existing ?? 0}
                  </div>
                </div>
              )}
              {runData.customers && (
                <div className="rounded bg-white p-3 border border-green-100">
                  <div className="font-medium mb-1">לקוחות</div>
                  <div className="text-xs text-gray-600">
                    נוצרו: {runData.customers.created ?? 0} | קיימים:{' '}
                    {runData.customers.existing ?? 0}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Error display */}
        {(dryRun.isError || runSync.isError) && (
          <div className="rounded-md border border-red-200 bg-red-50 p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <div className="text-sm text-red-900">
              <div className="font-semibold mb-1">שגיאה בסנכרון</div>
              <div>
                {(dryRun.error || runSync.error)?.message || 'שגיאה לא ידועה - בדקי את ה-Console'}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
