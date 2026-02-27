import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { useCalls } from '@/features/calls/hooks/useCalls';
import { QueryStateWrapper } from '@/components/layout/QueryStateWrapper';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ChevronRight,
  ChevronLeft,
  Plus,
  Clock,
  MapPin,
  Truck,
  Calendar as CalendarIcon,
  List,
  LayoutGrid,
} from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  parseISO,
  isToday,
} from 'date-fns';
import { he } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const statusColors = {
  waiting_treatment: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  awaiting_assignment: 'bg-orange-100 text-orange-800 border-orange-300',
  assigning: 'bg-blue-100 text-blue-800 border-blue-300',
  vendor_enroute: 'bg-indigo-100 text-indigo-800 border-indigo-300',
  in_progress: 'bg-purple-100 text-purple-800 border-purple-300',
  completed: 'bg-green-100 text-green-800 border-green-300',
  cancelled: 'bg-gray-100 text-gray-800 border-gray-300',
};

const statusLabels = {
  waiting_treatment: 'ממתין לטיפול',
  awaiting_assignment: 'ממתין לשיבוץ',
  assigning: 'בתהליך שיבוץ',
  vendor_enroute: 'ספק בדרך',
  in_progress: 'בטיפול',
  completed: 'הושלם',
  cancelled: 'בוטל',
};

const hebrewDays = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('month'); // 'month' | 'week' | 'day'
  const [selectedDate, setSelectedDate] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');

  const callsQuery = useCalls();
  const calls = callsQuery.data || [];

  // Filter calls by status
  const filteredCalls = useMemo(() => {
    if (statusFilter === 'all') return calls;
    return calls.filter((call) => call.call_status === statusFilter);
  }, [calls, statusFilter]);

  // Get calls for a specific date
  const getCallsForDate = (date) => {
    return filteredCalls.filter((call) => {
      const callDate = call.created_date ? parseISO(call.created_date) : null;
      return callDate && isSameDay(callDate, date);
    });
  };

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentDate]);

  // Stats for current month
  const monthStats = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const monthCalls = filteredCalls.filter((call) => {
      const callDate = call.created_date ? parseISO(call.created_date) : null;
      return callDate && callDate >= monthStart && callDate <= monthEnd;
    });

    return {
      total: monthCalls.length,
      completed: monthCalls.filter((c) => c.call_status === 'completed').length,
      pending: monthCalls.filter((c) => !['completed', 'cancelled'].includes(c.call_status)).length,
      cancelled: monthCalls.filter((c) => c.call_status === 'cancelled').length,
    };
  }, [filteredCalls, currentDate]);

  const navigateMonth = (direction) => {
    setCurrentDate((prev) => (direction === 'next' ? addMonths(prev, 1) : subMonths(prev, 1)));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  if (callsQuery.isError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <p className="text-red-500 text-lg font-medium mb-2">שגיאה בטעינת נתונים</p>
        <p className="text-gray-500 text-sm">{callsQuery.error?.message || 'נסה לרענן את הדף'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#172B4D]">יומן קריאות</h1>
          <p className="text-[#6B778C] text-sm">צפייה בקריאות לפי תאריכים</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="כל הסטטוסים" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל הסטטוסים</SelectItem>
              {Object.entries(statusLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Link to={createPageUrl('NewCase')}>
            <Button className="bg-[#FF0000] hover:bg-[#CC0000] gap-2">
              <Plus className="w-4 h-4" />
              קריאה חדשה
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-white">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-[#172B4D]">{monthStats.total}</div>
            <div className="text-sm text-[#6B778C]">סה"כ קריאות החודש</div>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{monthStats.completed}</div>
            <div className="text-sm text-[#6B778C]">הושלמו</div>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">{monthStats.pending}</div>
            <div className="text-sm text-[#6B778C]">בטיפול</div>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-gray-500">{monthStats.cancelled}</div>
            <div className="text-sm text-[#6B778C]">בוטלו</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendar Grid */}
        <Card className="lg:col-span-3 bg-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => navigateMonth('prev')}
                  aria-label="חודש קודם"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <h2 className="text-lg font-semibold text-[#172B4D] min-w-[140px] text-center">
                  {format(currentDate, 'MMMM yyyy', { locale: he })}
                </h2>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => navigateMonth('next')}
                  aria-label="חודש הבא"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              </div>
              <Button variant="outline" size="sm" onClick={goToToday}>
                היום
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <QueryStateWrapper query={callsQuery}>
              {/* Days Header */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {hebrewDays.map((day, i) => (
                  <div key={i} className="text-center text-sm font-medium text-[#6B778C] py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Days */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, i) => {
                  const dayCalls = getCallsForDate(day);
                  const isCurrentMonth = isSameMonth(day, currentDate);
                  const isSelected = selectedDate && isSameDay(day, selectedDate);
                  const isTodayDate = isToday(day);

                  return (
                    <div
                      key={i}
                      onClick={() => setSelectedDate(day)}
                      className={cn(
                        'min-h-[100px] p-2 border rounded-lg cursor-pointer transition-all',
                        isCurrentMonth ? 'bg-white' : 'bg-gray-50',
                        isSelected ? 'border-red-500 ring-1 ring-red-500' : 'border-[#DFE1E6]',
                        isTodayDate && 'bg-red-50',
                        'hover:border-red-300'
                      )}
                    >
                      <div
                        className={cn(
                          'text-sm font-medium mb-1',
                          isCurrentMonth ? 'text-[#172B4D]' : 'text-[#9CA3AF]',
                          isTodayDate && 'text-red-600'
                        )}
                      >
                        {format(day, 'd')}
                      </div>
                      <div className="space-y-1">
                        {dayCalls.slice(0, 3).map((call, idx) => (
                          <Link
                            key={call.id}
                            to={createPageUrl(`CallDetails?id=${call.id}`)}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div
                              className={cn(
                                'text-xs px-1.5 py-0.5 rounded truncate border',
                                statusColors[call.call_status] || 'bg-gray-100 text-gray-800'
                              )}
                            >
                              {call.call_number || call.customer_name}
                            </div>
                          </Link>
                        ))}
                        {dayCalls.length > 3 && (
                          <div className="text-xs text-[#6B778C] text-center">
                            +{dayCalls.length - 3} נוספים
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </QueryStateWrapper>
          </CardContent>
        </Card>

        {/* Selected Date Details */}
        <Card className="bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-[#6B778C]" />
              {selectedDate ? format(selectedDate, 'EEEE, d בMMMM', { locale: he }) : 'בחר תאריך'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedDate ? (
              <div className="space-y-3">
                {getCallsForDate(selectedDate).length === 0 ? (
                  <div className="text-center py-8 text-[#6B778C]">
                    <CalendarIcon className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">אין קריאות בתאריך זה</p>
                  </div>
                ) : (
                  getCallsForDate(selectedDate).map((call) => (
                    <Link
                      key={call.id}
                      to={createPageUrl(`CallDetails?id=${call.id}`)}
                      className="block"
                    >
                      <div className="p-3 border border-[#DFE1E6] rounded-lg hover:border-red-300 transition-colors">
                        <div className="flex items-start justify-between mb-2">
                          <span className="font-medium text-sm text-[#172B4D]">
                            {call.call_number || `#${call.id?.slice(-6)}`}
                          </span>
                          <Badge className={cn('text-xs', statusColors[call.call_status])}>
                            {statusLabels[call.call_status]}
                          </Badge>
                        </div>
                        <div className="space-y-1 text-xs text-[#6B778C]">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {call.created_date && format(parseISO(call.created_date), 'HH:mm')}
                          </div>
                          {call.customer_name && (
                            <div className="truncate">{call.customer_name}</div>
                          )}
                          {call.pickup_location_city && (
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {call.pickup_location_city}
                            </div>
                          )}
                          {call.assigned_vendor_name && (
                            <div className="flex items-center gap-1">
                              <Truck className="w-3 h-3" />
                              {call.assigned_vendor_name}
                            </div>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-[#6B778C]">
                <CalendarIcon className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">לחץ על תאריך לצפייה בקריאות</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
