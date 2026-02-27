import React, { useState } from 'react';
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
import { CalendarClock, Save } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { format } from 'date-fns';

const timeRanges = [
  { value: '07:00-09:00', label: '07:00 - 09:00' },
  { value: '09:00-12:00', label: '09:00 - 12:00' },
  { value: '12:00-15:00', label: '12:00 - 15:00' },
  { value: '15:00-18:00', label: '15:00 - 18:00' },
  { value: '18:00-21:00', label: '18:00 - 21:00' },
  { value: '21:00-23:00', label: '21:00 - 23:00' },
];

export default function FutureServiceSection({ call, callId, onStatusChanged }) {
  const queryClient = useQueryClient();
  const [date, setDate] = useState(call?.future_service_date || '');
  const [timeRange, setTimeRange] = useState(call?.future_service_time_range || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!date) {
      toast.error('יש לבחור תאריך');
      return;
    }
    setSaving(true);
    await base44.entities.Call.update(callId, {
      future_service_date: date,
      future_service_time_range: timeRange,
      call_status: 'future_service',
    });
    await base44.entities.CallHistory.create({
      call_id: callId,
      call_number: call?.call_number,
      change_type: 'status',
      old_value: call?.call_status,
      new_value: 'future_service',
      notes: `שירות עתידי נקבע ל-${date} ${timeRange || ''}`,
      changed_by: 'operator',
    });
    queryClient.invalidateQueries({ queryKey: queryKeys.calls.detail(callId) });
    toast.success('שירות עתידי נשמר');
    setSaving(false);
    onStatusChanged?.();
  };

  return (
    <Card className="bg-white border-violet-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarClock className="w-4 h-4 text-violet-600" />
          שירות עתידי
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Label>תאריך</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={format(new Date(), 'yyyy-MM-dd')}
            />
          </div>
          <div>
            <Label>טווח שעות</Label>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger>
                <SelectValue placeholder="בחר טווח" />
              </SelectTrigger>
              <SelectContent>
                {timeRanges.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button onClick={handleSave} disabled={saving} className="gap-2 w-full">
              <Save className="w-4 h-4" />
              {saving ? 'שומר...' : 'קבע שירות עתידי'}
            </Button>
          </div>
        </div>
        {call?.future_service_date && (
          <div className="mt-3 p-2 bg-violet-50 rounded-md text-sm text-violet-700">
            שירות עתידי מתוכנן ל-{call.future_service_date}{' '}
            {call.future_service_time_range && `בשעות ${call.future_service_time_range}`}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
