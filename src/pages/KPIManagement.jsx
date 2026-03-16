import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Target,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { queryKeys } from '@/lib/queryKeys';

const KPI_TYPES = {
  sla_compliance: {
    label: 'עמידה ב-SLA (%)',
    unit: '%',
    icon: CheckCircle,
    color: '#22C55E',
  },
  avg_response_time: {
    label: 'זמן תגובה ממוצע (דקות)',
    unit: "דק'",
    icon: TrendingDown,
    color: '#3b82f6',
  },
  calls_per_day: {
    label: 'קריאות ליום',
    unit: '',
    icon: TrendingUp,
    color: '#f97316',
  },
  customer_satisfaction: {
    label: 'שביעות רצון לקוחות',
    unit: '/5',
    icon: Target,
    color: '#8b5cf6',
  },
  vendor_rejection_rate: {
    label: 'אחוז דחיית ספקים (%)',
    unit: '%',
    icon: XCircle,
    color: '#ef4444',
  },
  first_call_resolution: {
    label: 'פתרון בקריאה ראשונה (%)',
    unit: '%',
    icon: CheckCircle,
    color: '#14b8a6',
  },
  avg_completion_time: {
    label: 'זמן השלמה ממוצע (דקות)',
    unit: "דק'",
    icon: TrendingDown,
    color: '#ec4899',
  },
  open_calls_count: {
    label: 'קריאות פתוחות',
    unit: '',
    icon: AlertTriangle,
    color: '#eab308',
  },
};

export default function KPIManagementPage() {
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingKPI, setEditingKPI] = useState(null);
  const [form, setForm] = useState({
    kpi_type: 'sla_compliance',
    target_value: '',
    warning_threshold: '',
    period: 'monthly',
    name: '',
  });
  const [saving, setSaving] = useState(false);

  // Fetch KPI targets
  const { data: kpiTargets = [], isLoading: targetsLoading } = useQuery({
    queryKey: ['kpiTargets'],
    queryFn: () => base44.entities.KPITarget.list('-created_date'),
  });

  // Fetch recent calls for actual KPI calculation
  const { data: recentCalls = [], isLoading: callsLoading } = useQuery({
    queryKey: queryKeys.calls?.all?.() || ['calls'],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return base44.entities.Call.filter({});
    },
    staleTime: 60000,
  });

  // Calculate actual KPI values from calls data
  const actualValues = useMemo(() => {
    if (!recentCalls.length) return {};

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const recent = recentCalls.filter(
      (c) => new Date(c.created_date || c.created_at) >= thirtyDaysAgo
    );

    const completed = recent.filter((c) => c.call_status === 'completed');
    const withSLA = recent.filter(
      (c) => c.time_to_vendor_assignment !== null && c.sla_target
    );
    const onTimeSLA = withSLA.filter(
      (c) => c.time_to_vendor_assignment <= c.sla_target
    );
    const responseTimes = recent
      .filter((c) => c.time_to_vendor_assignment !== null)
      .map((c) => c.time_to_vendor_assignment);
    const ratings = completed
      .filter((c) => c.customer_rating)
      .map((c) => c.customer_rating);
    const openCalls = recentCalls.filter(
      (c) => !['completed', 'cancelled'].includes(c.call_status)
    );

    const daysInRange = Math.max(1, Math.ceil((now - thirtyDaysAgo) / (1000 * 60 * 60 * 24)));

    return {
      sla_compliance: withSLA.length > 0 ? ((onTimeSLA.length / withSLA.length) * 100).toFixed(1) : null,
      avg_response_time:
        responseTimes.length > 0
          ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
          : null,
      calls_per_day: (recent.length / daysInRange).toFixed(1),
      customer_satisfaction:
        ratings.length > 0
          ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
          : null,
      vendor_rejection_rate: null, // Requires separate vendor data
      first_call_resolution: null, // Requires additional tracking
      avg_completion_time: null, // Requires additional tracking
      open_calls_count: openCalls.length,
    };
  }, [recentCalls]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.KPITarget.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpiTargets'] });
      toast.success('יעד נוסף בהצלחה');
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.KPITarget.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpiTargets'] });
      toast.success('יעד עודכן');
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.KPITarget.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpiTargets'] });
      toast.success('יעד נמחק');
    },
  });

  const resetForm = () => {
    setShowCreateDialog(false);
    setEditingKPI(null);
    setForm({ kpi_type: 'sla_compliance', target_value: '', warning_threshold: '', period: 'monthly', name: '' });
  };

  const handleSave = async () => {
    if (!form.target_value) {
      toast.error('יש להגדיר ערך יעד');
      return;
    }
    setSaving(true);
    const payload = {
      kpi_type: form.kpi_type,
      name: form.name || KPI_TYPES[form.kpi_type]?.label || form.kpi_type,
      target_value: parseFloat(form.target_value),
      warning_threshold: form.warning_threshold ? parseFloat(form.warning_threshold) : null,
      period: form.period,
    };

    if (editingKPI) {
      await updateMutation.mutateAsync({ id: editingKPI.id, data: payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
    setSaving(false);
  };

  const handleEdit = (kpi) => {
    setEditingKPI(kpi);
    setForm({
      kpi_type: kpi.kpi_type || 'sla_compliance',
      target_value: String(kpi.target_value || ''),
      warning_threshold: kpi.warning_threshold ? String(kpi.warning_threshold) : '',
      period: kpi.period || 'monthly',
      name: kpi.name || '',
    });
    setShowCreateDialog(true);
  };

  const getStatusForKPI = (kpi) => {
    const actual = actualValues[kpi.kpi_type];
    if (actual === null || actual === undefined) return { status: 'no_data', label: 'אין נתונים' };

    const actualNum = parseFloat(actual);
    const target = kpi.target_value;
    const warning = kpi.warning_threshold;

    // For "lower is better" metrics
    const lowerIsBetter = ['avg_response_time', 'vendor_rejection_rate', 'avg_completion_time', 'open_calls_count'];
    const isLowerBetter = lowerIsBetter.includes(kpi.kpi_type);

    if (isLowerBetter) {
      if (actualNum <= target) return { status: 'good', label: 'עומד ביעד' };
      if (warning && actualNum <= warning) return { status: 'warning', label: 'קרוב ליעד' };
      return { status: 'bad', label: 'חריגה' };
    }
    // Higher is better
    if (actualNum >= target) return { status: 'good', label: 'עומד ביעד' };
    if (warning && actualNum >= warning) return { status: 'warning', label: 'קרוב ליעד' };
    return { status: 'bad', label: 'חריגה' };
  };

  const statusColors = {
    good: 'text-green-600 bg-green-50 border-green-200',
    warning: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    bad: 'text-red-600 bg-red-50 border-red-200',
    no_data: 'text-gray-400 bg-gray-50 border-gray-200',
  };

  const statusIcons = {
    good: CheckCircle,
    warning: AlertTriangle,
    bad: XCircle,
    no_data: Minus,
  };

  const isLoading = targetsLoading || callsLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#212121] flex items-center gap-2">
            <Target className="w-6 h-6" />
            ניהול יעדים ו-KPIs
          </h1>
          <p className="text-[#616161] text-sm mt-1">
            הגדרת יעדים תפעוליים ומעקב ביצועים בזמן אמת
          </p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setShowCreateDialog(true);
          }}
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          יעד חדש
        </Button>
      </div>

      {/* KPI Cards Grid */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : kpiTargets.length === 0 ? (
        <Card className="bg-white">
          <CardContent className="py-12 text-center text-gray-400">
            <Target className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>לא הוגדרו יעדים עדיין</p>
            <p className="text-sm mt-1">לחץ על &quot;יעד חדש&quot; להוספת יעד ראשון</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {kpiTargets.map((kpi) => {
            const typeConfig = KPI_TYPES[kpi.kpi_type] || {};
            const actual = actualValues[kpi.kpi_type];
            const { status, label: statusLabel } = getStatusForKPI(kpi);
            const StatusIcon = statusIcons[status];
            const KPIIcon = typeConfig.icon || Target;

            return (
              <Card
                key={kpi.id}
                className={`bg-white border-2 ${statusColors[status]} transition-colors`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <KPIIcon
                        className="w-4 h-4"
                        style={{ color: typeConfig.color }}
                      />
                      <CardTitle className="text-sm font-medium">
                        {kpi.name || typeConfig.label}
                      </CardTitle>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={() => handleEdit(kpi)}
                      >
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-red-400 hover:text-red-600"
                        onClick={() => {
                          if (window.confirm('למחוק יעד זה?')) {
                            deleteMutation.mutate(kpi.id);
                          }
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {/* Actual Value */}
                    <div className="text-3xl font-bold" style={{ color: typeConfig.color }}>
                      {actual !== null && actual !== undefined ? actual : '—'}
                      <span className="text-sm font-normal text-gray-400 mr-1">
                        {typeConfig.unit}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          status === 'good'
                            ? 'bg-green-500'
                            : status === 'warning'
                              ? 'bg-yellow-500'
                              : status === 'bad'
                                ? 'bg-red-500'
                                : 'bg-gray-300'
                        }`}
                        style={{
                          width: `${
                            actual !== null && kpi.target_value
                              ? Math.min(100, (parseFloat(actual) / kpi.target_value) * 100)
                              : 0
                          }%`,
                        }}
                      />
                    </div>

                    {/* Target & Status */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">
                        יעד: {kpi.target_value}
                        {typeConfig.unit}
                      </span>
                      <Badge
                        className={`text-xs ${
                          status === 'good'
                            ? 'bg-green-100 text-green-800'
                            : status === 'warning'
                              ? 'bg-yellow-100 text-yellow-800'
                              : status === 'bad'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        <StatusIcon className="w-3 h-3 me-1" />
                        {statusLabel}
                      </Badge>
                    </div>

                    {/* Period */}
                    <div className="text-xs text-gray-400">
                      {kpi.period === 'daily'
                        ? 'יומי'
                        : kpi.period === 'weekly'
                          ? 'שבועי'
                          : 'חודשי'}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={() => resetForm()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingKPI ? 'עריכת יעד' : 'הגדרת יעד חדש'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>מדד</Label>
              <Select
                value={form.kpi_type}
                onValueChange={(v) =>
                  setForm({ ...form, kpi_type: v, name: KPI_TYPES[v]?.label || v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(KPI_TYPES).map(([key, kpi]) => (
                    <SelectItem key={key} value={key}>
                      {kpi.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>שם מותאם (אופציונלי)</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={KPI_TYPES[form.kpi_type]?.label}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>ערך יעד *</Label>
                <Input
                  type="number"
                  value={form.target_value}
                  onChange={(e) => setForm({ ...form, target_value: e.target.value })}
                  placeholder="90"
                />
              </div>
              <div>
                <Label>סף אזהרה</Label>
                <Input
                  type="number"
                  value={form.warning_threshold}
                  onChange={(e) => setForm({ ...form, warning_threshold: e.target.value })}
                  placeholder="80"
                />
              </div>
            </div>
            <div>
              <Label>תקופה</Label>
              <Select
                value={form.period}
                onValueChange={(v) => setForm({ ...form, period: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">יומי</SelectItem>
                  <SelectItem value="weekly">שבועי</SelectItem>
                  <SelectItem value="monthly">חודשי</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>
              ביטול
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {editingKPI ? 'עדכן' : 'שמור'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
