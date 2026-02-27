import React, { useState, useMemo, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Calendar as CalendarIcon,
  Plus,
  ChevronRight,
  ChevronLeft,
  Trash2,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';
import { he } from 'date-fns/locale';
import { toast } from 'sonner';

const shiftTypeLabels = {
  morning: 'בוקר',
  afternoon: 'צהריים',
  night: 'לילה',
  full_day: 'יום מלא',
};

const shiftTypeColors = {
  morning: 'bg-amber-100 text-amber-800 border-amber-200',
  afternoon: 'bg-blue-100 text-blue-800 border-blue-200',
  night: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  full_day: 'bg-green-100 text-green-800 border-green-200',
};

const statusLabels = {
  scheduled: 'מתוכנן',
  active: 'פעיל',
  completed: 'הושלם',
  cancelled: 'בוטל',
  sick_leave: 'מחלה',
};

const statusColors = {
  scheduled: 'bg-gray-100 text-gray-700',
  active: 'bg-green-100 text-green-700',
  completed: 'bg-gray-50 text-gray-500',
  cancelled: 'bg-red-100 text-red-700',
  sick_leave: 'bg-orange-100 text-orange-700',
};

const defaultShiftTimes = {
  morning: { start: '07:00', end: '15:00' },
  afternoon: { start: '15:00', end: '23:00' },
  night: { start: '23:00', end: '07:00' },
  full_day: { start: '07:00', end: '23:00' },
};

function parseShiftType(value) {
  if (!value) return 'morning';
  const v = value.toLowerCase().trim();
  if (v === 'בוקר' || v === 'morning') return 'morning';
  if (v === 'צהריים' || v === 'afternoon') return 'afternoon';
  if (v === 'לילה' || v === 'night') return 'night';
  if (v === 'יום מלא' || v === 'full_day' || v === 'full day') return 'full_day';
  return 'morning';
}

export default function ShiftScheduleTab() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [showDialog, setShowDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [editingShift, setEditingShift] = useState(null);
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [formData, setFormData] = useState({
    agent_name: '',
    agent_email: '',
    shift_date: '',
    shift_type: 'morning',
    start_time: '07:00',
    end_time: '15:00',
    status: 'scheduled',
    notes: '',
  });

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  const { data: shifts = [], isLoading } = useQuery({
    queryKey: queryKeys.agentShifts.all(),
    queryFn: () => base44.entities.AgentShift.list('-shift_date', 200),
  });

  const { data: users = [] } = useQuery({
    queryKey: queryKeys.users.all(),
    queryFn: () => base44.entities.User.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.AgentShift.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.agentShifts.all() });
      closeDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.AgentShift.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.agentShifts.all() });
      closeDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.AgentShift.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.agentShifts.all() }),
  });

  const closeDialog = () => {
    setShowDialog(false);
    setEditingShift(null);
    setFormData({
      agent_name: '',
      agent_email: '',
      shift_date: '',
      shift_type: 'morning',
      start_time: '07:00',
      end_time: '15:00',
      status: 'scheduled',
      notes: '',
    });
  };

  const openNewShift = (date) => {
    setEditingShift(null);
    setFormData({
      ...formData,
      shift_date: format(date, 'yyyy-MM-dd'),
      shift_type: 'morning',
      start_time: '07:00',
      end_time: '15:00',
      status: 'scheduled',
      notes: '',
    });
    setShowDialog(true);
  };

  const openEditShift = (shift) => {
    setEditingShift(shift);
    setFormData({
      agent_name: shift.agent_name,
      agent_email: shift.agent_email || '',
      shift_date: shift.shift_date,
      shift_type: shift.shift_type,
      start_time: shift.start_time,
      end_time: shift.end_time,
      status: shift.status || 'scheduled',
      notes: shift.notes || '',
    });
    setShowDialog(true);
  };

  const handleShiftTypeChange = (type) => {
    const times = defaultShiftTimes[type] || defaultShiftTimes.morning;
    setFormData({ ...formData, shift_type: type, start_time: times.start, end_time: times.end });
  };

  const handleSave = () => {
    const payload = { ...formData };
    if (editingShift) {
      updateMutation.mutate({ id: editingShift.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  // Import file handling
  const handleImportFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (
        !selectedFile.name.endsWith('.csv') &&
        !selectedFile.name.endsWith('.xlsx') &&
        !selectedFile.name.endsWith('.xls')
      ) {
        toast.error('נא להעלות קובץ CSV או Excel');
        return;
      }
      setImportFile(selectedFile);
    }
  };

  const handleImport = async () => {
    if (!importFile) {
      toast.error('נא לבחור קובץ');
      return;
    }

    setImporting(true);
    setImportResult(null);

    try {
      const text = await importFile.text();
      const lines = text.split('\n').filter((line) => line.trim());

      if (lines.length < 2) {
        throw new Error('הקובץ ריק או לא תקין');
      }

      const headers = lines[0].split(',').map((h) => h.trim().replace(/"/g, '').toLowerCase());
      const records = [];
      const errors = [];

      // Map header names to expected fields
      const headerMap = {};
      headers.forEach((h, idx) => {
        const normalized = h.replace(/\s+/g, '_');
        if (['agent_name', 'שם_נציג', 'נציג', 'agent', 'name', 'שם'].includes(normalized)) {
          headerMap.agent_name = idx;
        } else if (['agent_email', 'אימייל', 'email', 'מייל'].includes(normalized)) {
          headerMap.agent_email = idx;
        } else if (['shift_date', 'date', 'תאריך', 'תאריך_משמרת'].includes(normalized)) {
          headerMap.shift_date = idx;
        } else if (['shift_type', 'type', 'סוג', 'סוג_משמרת', 'משמרת'].includes(normalized)) {
          headerMap.shift_type = idx;
        } else if (['start_time', 'start', 'שעת_התחלה', 'התחלה'].includes(normalized)) {
          headerMap.start_time = idx;
        } else if (['end_time', 'end', 'שעת_סיום', 'סיום'].includes(normalized)) {
          headerMap.end_time = idx;
        } else if (['notes', 'הערות', 'note'].includes(normalized)) {
          headerMap.notes = idx;
        }
      });

      if (headerMap.agent_name === undefined || headerMap.shift_date === undefined) {
        throw new Error('הקובץ חייב לכלול עמודות: שם נציג, תאריך');
      }

      for (let i = 1; i < lines.length; i++) {
        try {
          const values = lines[i].split(',').map((v) => v.trim().replace(/"/g, ''));
          const agentName = values[headerMap.agent_name];
          const shiftDate = values[headerMap.shift_date];

          if (!agentName || !shiftDate) {
            errors.push(`שורה ${i + 1}: חסר שם נציג או תאריך`);
            continue;
          }

          const shiftType = parseShiftType(
            headerMap.shift_type !== undefined ? values[headerMap.shift_type] : ''
          );
          const times = defaultShiftTimes[shiftType];

          records.push({
            agent_name: agentName,
            agent_email: headerMap.agent_email !== undefined ? values[headerMap.agent_email] : '',
            shift_date: shiftDate,
            shift_type: shiftType,
            start_time:
              headerMap.start_time !== undefined
                ? values[headerMap.start_time] || times.start
                : times.start,
            end_time:
              headerMap.end_time !== undefined
                ? values[headerMap.end_time] || times.end
                : times.end,
            status: 'scheduled',
            notes: headerMap.notes !== undefined ? values[headerMap.notes] || '' : '',
          });
        } catch (err) {
          errors.push(`שורה ${i + 1}: ${err.message}`);
        }
      }

      if (records.length === 0) {
        throw new Error('לא נמצאו רשומות תקינות בקובץ');
      }

      // Bulk create shifts
      let successCount = 0;
      let failCount = 0;

      for (const record of records) {
        try {
          await base44.entities.AgentShift.create(record);
          successCount++;
        } catch (err) {
          failCount++;
          errors.push(`שגיאה ביצירת משמרת: ${err.message}`);
        }
      }

      setImportResult({
        success: successCount,
        failed: failCount,
        errors: errors.slice(0, 10),
      });

      if (successCount > 0) {
        toast.success(`${successCount} משמרות יובאו בהצלחה`);
        queryClient.invalidateQueries({ queryKey: queryKeys.agentShifts.all() });
      }

      if (failCount > 0) {
        toast.error(`${failCount} משמרות נכשלו`);
      }
    } catch (error) {
      console.error('Import error:', error);
      toast.error(`שגיאה בייבוא: ${error.message}`);
      setImportResult({
        success: 0,
        failed: 0,
        errors: [error.message],
      });
    } finally {
      setImporting(false);
    }
  };

  // Group shifts by agent for the weekly view
  const agentNames = useMemo(() => {
    const names = new Set(shifts.map((s) => s.agent_name));
    return [...names].sort();
  }, [shifts]);

  const getShiftsForAgentAndDay = (agentName, day) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return shifts.filter((s) => s.agent_name === agentName && s.shift_date === dayStr);
  };

  return (
    <div dir="rtl" className="space-y-4">
      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setWeekStart(addDays(weekStart, 7))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <h3 className="font-semibold text-gray-800">
            {format(weekDays[0], 'd MMM', { locale: he })} -{' '}
            {format(weekDays[6], 'd MMM yyyy', { locale: he })}
          </h3>
          <Button variant="outline" size="sm" onClick={() => setWeekStart(addDays(weekStart, -7))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 0 }))}
          >
            היום
          </Button>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() => {
              setImportFile(null);
              setImportResult(null);
              setShowImportDialog(true);
            }}
          >
            <Upload className="w-4 h-4" />
            ייבוא לו&quot;ז
          </Button>
          <Button size="sm" className="gap-1" onClick={() => openNewShift(new Date())}>
            <Plus className="w-4 h-4" />
            הוסף משמרת
          </Button>
        </div>
      </div>

      {/* Weekly grid */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b">
                <th className="p-3 text-end text-sm font-semibold text-gray-600 w-32 bg-gray-50 sticky end-0">
                  נציג
                </th>
                {weekDays.map((day, i) => {
                  const isToday = isSameDay(day, new Date());
                  return (
                    <th
                      key={i}
                      className={`p-3 text-center text-sm font-semibold min-w-[120px] ${isToday ? 'bg-blue-50 text-blue-700' : 'text-gray-600 bg-gray-50'}`}
                    >
                      <div>{format(day, 'EEEE', { locale: he })}</div>
                      <div className="text-xs font-normal">{format(day, 'd/M')}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {agentNames.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-400">
                    <CalendarIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>אין משמרות מתוכננות</p>
                    <p className="text-xs mt-1">
                      לחץ &quot;הוסף משמרת&quot; כדי להתחיל או ייבא קובץ לו&quot;ז
                    </p>
                  </td>
                </tr>
              )}
              {agentNames.map((agentName) => (
                <tr key={agentName} className="border-b hover:bg-gray-50/50">
                  <td className="p-3 text-sm font-medium text-gray-800 bg-white sticky right-0 border-l">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold">
                        {agentName.charAt(0)}
                      </div>
                      {agentName}
                    </div>
                  </td>
                  {weekDays.map((day, i) => {
                    const dayShifts = getShiftsForAgentAndDay(agentName, day);
                    const isToday = isSameDay(day, new Date());
                    return (
                      <td key={i} className={`p-1.5 align-top ${isToday ? 'bg-blue-50/30' : ''}`}>
                        <div className="space-y-1 min-h-[40px]">
                          {dayShifts.map((shift) => (
                            <div
                              key={shift.id}
                              onClick={() => openEditShift(shift)}
                              className={`rounded-md p-1.5 border text-xs cursor-pointer hover:shadow-sm transition-shadow ${shiftTypeColors[shift.shift_type]}`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-medium">
                                  {shiftTypeLabels[shift.shift_type]}
                                </span>
                                {shift.status !== 'scheduled' && (
                                  <Badge
                                    className={`text-[9px] px-1 py-0 ${statusColors[shift.status]}`}
                                  >
                                    {statusLabels[shift.status]}
                                  </Badge>
                                )}
                              </div>
                              <div className="text-[10px] opacity-75 mt-0.5" dir="ltr">
                                {shift.start_time} - {shift.end_time}
                              </div>
                            </div>
                          ))}
                          {dayShifts.length === 0 && (
                            <button
                              onClick={() => openNewShift(day)}
                              className="w-full h-[40px] rounded border border-dashed border-gray-200 text-gray-300 hover:border-blue-300 hover:text-blue-400 transition-colors flex items-center justify-center"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Add/Edit shift dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingShift ? 'עריכת משמרת' : 'הוספת משמרת חדשה'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm text-gray-600 mb-1 block">נציג</label>
              {users.length > 0 ? (
                <Select
                  value={formData.agent_email || '_custom'}
                  onValueChange={(v) => {
                    if (v === '_custom') {
                      setFormData({ ...formData, agent_email: '', agent_name: '' });
                    } else {
                      const user = users.find((u) => u.email === v);
                      setFormData({
                        ...formData,
                        agent_email: v,
                        agent_name: user?.full_name || v,
                      });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="בחר נציג" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.email}>
                        {u.full_name || u.email}
                      </SelectItem>
                    ))}
                    <SelectItem value="_custom">הזן ידנית...</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={formData.agent_name}
                  onChange={(e) => setFormData({ ...formData, agent_name: e.target.value })}
                  placeholder="שם הנציג"
                />
              )}
              {formData.agent_email === '' && users.length > 0 && (
                <Input
                  className="mt-2"
                  value={formData.agent_name}
                  onChange={(e) => setFormData({ ...formData, agent_name: e.target.value })}
                  placeholder="שם הנציג"
                />
              )}
            </div>

            <div>
              <label className="text-sm text-gray-600 mb-1 block">תאריך</label>
              <Input
                type="date"
                value={formData.shift_date}
                onChange={(e) => setFormData({ ...formData, shift_date: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm text-gray-600 mb-1 block">סוג משמרת</label>
              <Select value={formData.shift_type} onValueChange={handleShiftTypeChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="morning">בוקר (07:00-15:00)</SelectItem>
                  <SelectItem value="afternoon">צהריים (15:00-23:00)</SelectItem>
                  <SelectItem value="night">לילה (23:00-07:00)</SelectItem>
                  <SelectItem value="full_day">יום מלא (07:00-23:00)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-gray-600 mb-1 block">שעת התחלה</label>
                <Input
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">שעת סיום</label>
                <Input
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                />
              </div>
            </div>

            {editingShift && (
              <div>
                <label className="text-sm text-gray-600 mb-1 block">סטטוס</label>
                <Select
                  value={formData.status}
                  onValueChange={(v) => setFormData({ ...formData, status: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">מתוכנן</SelectItem>
                    <SelectItem value="active">פעיל</SelectItem>
                    <SelectItem value="completed">הושלם</SelectItem>
                    <SelectItem value="cancelled">בוטל</SelectItem>
                    <SelectItem value="sick_leave">מחלה</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <label className="text-sm text-gray-600 mb-1 block">הערות</label>
              <Input
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="הערות (אופציונלי)"
              />
            </div>
          </div>

          <DialogFooter className="flex justify-between">
            <div>
              {editingShift && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    deleteMutation.mutate(editingShift.id);
                    closeDialog();
                  }}
                >
                  <Trash2 className="w-4 h-4 ms-1" /> מחק
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={closeDialog}>
                ביטול
              </Button>
              <Button onClick={handleSave} disabled={!formData.agent_name || !formData.shift_date}>
                {editingShift ? 'עדכן' : 'שמור'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import shift schedule dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>ייבוא לו&quot;ז משמרות</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm text-gray-600 block">בחר קובץ CSV</label>
              <Input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleImportFileChange}
                disabled={importing}
              />
              {importFile && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <FileSpreadsheet className="w-4 h-4" />
                  {importFile.name}
                </div>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg text-sm">
              <p className="font-medium mb-2">מבנה הקובץ הנדרש:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-600">
                <li>
                  <strong>עמודות חובה:</strong> שם נציג (agent_name), תאריך (shift_date)
                </li>
                <li>
                  <strong>עמודות אופציונליות:</strong> סוג משמרת (shift_type), שעת התחלה
                  (start_time), שעת סיום (end_time), אימייל (agent_email), הערות (notes)
                </li>
                <li>פורמט תאריך: YYYY-MM-DD</li>
                <li>סוגי משמרת: בוקר / צהריים / לילה / יום מלא</li>
              </ul>
              <div className="mt-3 p-2 bg-white rounded border text-xs font-mono" dir="ltr">
                agent_name,shift_date,shift_type,start_time,end_time
                <br />
                דנה כהן,2026-03-01,בוקר,07:00,15:00
                <br />
                יואב לוי,2026-03-01,צהריים,15:00,23:00
              </div>
            </div>

            {importResult && (
              <div className="space-y-2">
                {importResult.success > 0 && (
                  <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-medium">
                      {importResult.success} משמרות יובאו בהצלחה
                    </span>
                  </div>
                )}
                {importResult.failed > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                      <span className="text-sm font-medium">
                        {importResult.failed} משמרות נכשלו
                      </span>
                    </div>
                    {importResult.errors.length > 0 && (
                      <div className="text-xs text-gray-500 max-h-32 overflow-y-auto">
                        {importResult.errors.map((err, idx) => (
                          <div key={idx} className="py-1">
                            {err}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowImportDialog(false);
                setImportFile(null);
                setImportResult(null);
              }}
            >
              סגור
            </Button>
            <Button onClick={handleImport} disabled={!importFile || importing}>
              {importing ? 'מייבא...' : 'ייבא משמרות'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
