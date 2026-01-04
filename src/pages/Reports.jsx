import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, Filter, X, TrendingUp } from 'lucide-react';
import { format, subDays, startOfDay, endOfDay, parseISO } from 'date-fns';
import { he } from 'date-fns/locale';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import VendorPerformanceReport from '@/components/reports/VendorPerformanceReport';
import SLAReport from '@/components/reports/SLAReport';
import RevenueReport from '@/components/reports/RevenueReport';
import CallStatusChart from '@/components/reports/CallStatusChart';
import LiveResponseTimeChart from '@/components/reports/LiveResponseTimeChart';

export default function Reports() {
  const [dateRange, setDateRange] = useState('30');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedVendor, setSelectedVendor] = useState('all');
  const [selectedCustomer, setSelectedCustomer] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  // Fetch data
  const { data: vendors = [] } = useQuery({
    queryKey: ['vendors-report'],
    queryFn: () => base44.entities.Vendor.list()
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers-report'],
    queryFn: () => base44.entities.Customer.list()
  });

  const { data: calls = [] } = useQuery({
    queryKey: ['calls-report'],
    queryFn: () => base44.entities.Call.list('-created_date', 1000)
  });

  const { data: ratings = [] } = useQuery({
    queryKey: ['ratings-report'],
    queryFn: () => base44.entities.VendorRating.list('-created_date', 500)
  });

  const { data: payments = [] } = useQuery({
    queryKey: ['payments-report'],
    queryFn: () => base44.entities.VendorPayment.list('-created_date', 500)
  });

  // Calculate date range
  const getDateRange = () => {
    if (customStartDate && customEndDate) {
      return {
        startDate: startOfDay(new Date(customStartDate)),
        endDate: endOfDay(new Date(customEndDate))
      };
    }
    return {
      startDate: startOfDay(subDays(new Date(), parseInt(dateRange))),
      endDate: endOfDay(new Date())
    };
  };

  const { startDate, endDate } = getDateRange();

  // Apply filters
  const filteredCalls = calls.filter(call => {
    // Date filter
    if (!call.created_date) return false;
    const date = new Date(call.created_date);
    if (date < startDate || date > endDate) return false;

    // Vendor filter
    if (selectedVendor !== 'all' && call.assigned_vendor_id !== selectedVendor) return false;

    // Customer filter  
    if (selectedCustomer !== 'all' && call.customer_name !== selectedCustomer) return false;

    // Status filter
    if (selectedStatus !== 'all' && call.call_status !== selectedStatus) return false;

    return true;
  });

  const filteredRatings = ratings.filter(r => {
    if (!r.created_date) return false;
    const date = new Date(r.created_date);
    return date >= startDate && date <= endDate;
  });

  const filteredPayments = payments.filter(p => {
    if (!p.created_date) return false;
    const date = new Date(p.created_date);
    return date >= startDate && date <= endDate;
  });

  // Export to CSV
  const exportToCSV = (data, filename, headers) => {
    if (!data || data.length === 0) {
      toast.error('אין נתונים לייצוא');
      return;
    }

    const csvHeaders = headers || Object.keys(data[0]);
    const csvRows = data.map(row => 
      csvHeaders.map(header => {
        const value = row[header] ?? '';
        return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
      }).join(',')
    );
    
    const csvContent = [csvHeaders.join(','), ...csvRows].join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${format(new Date(), 'dd-MM-yyyy')}.csv`;
    link.click();
    toast.success('הדוח יוצא בהצלחה');
  };

  // Export all calls
  const exportAllCallsCSV = () => {
    const data = filteredCalls.map(call => ({
      'מספר_קריאה': call.call_number || call.id.slice(-6),
      'תאריך': format(new Date(call.created_date), 'dd/MM/yyyy HH:mm', { locale: he }),
      'לקוח': call.customer_name,
      'טלפון': call.customer_phone,
      'סוג_תקלה': call.issue_type,
      'אזור': call.pickup_location_area,
      'כתובת': call.pickup_location_address,
      'סטטוס': call.call_status,
      'ספק_משובץ': call.assigned_vendor_name || '-',
      'עדיפות': call.call_priority,
      'זמן_תגובה_דקות': call.time_to_vendor_assignment || '-',
      'זמן_השלמה_דקות': call.time_to_completion || '-',
      'עלות': call.cost_to_vendor || '-'
    }));
    exportToCSV(data, 'כל_הקריאות');
  };

  const resetFilters = () => {
    setDateRange('30');
    setCustomStartDate('');
    setCustomEndDate('');
    setSelectedVendor('all');
    setSelectedCustomer('all');
    setSelectedStatus('all');
  };

  const activeFiltersCount = [
    customStartDate && customEndDate ? 1 : 0,
    selectedVendor !== 'all' ? 1 : 0,
    selectedCustomer !== 'all' ? 1 : 0,
    selectedStatus !== 'all' ? 1 : 0
  ].reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <h1>דוחות וניתוחים</h1>
          <p className="text-[var(--color-text-secondary)]">
            ניתוח מקיף של ביצועים, SLA והכנסות • {filteredCalls.length} קריאות
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            className="btn-secondary gap-2"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-4 h-4" />
            פילטרים
            {activeFiltersCount > 0 && (
              <span className="bg-[var(--color-primary)] text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                {activeFiltersCount}
              </span>
            )}
          </Button>
          <Button
            className="btn-primary gap-2"
            onClick={exportAllCallsCSV}
          >
            <Download className="w-4 h-4" />
            ייצא הכל
          </Button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card className="border-[#E0E0E0] bg-white">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Date Range */}
              <div>
                <Label>טווח תאריכים</Label>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 ימים אחרונים</SelectItem>
                    <SelectItem value="14">14 ימים אחרונים</SelectItem>
                    <SelectItem value="30">30 ימים אחרונים</SelectItem>
                    <SelectItem value="90">90 ימים אחרונים</SelectItem>
                    <SelectItem value="180">6 חודשים</SelectItem>
                    <SelectItem value="365">שנה</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Custom Start Date */}
              <div>
                <Label>מתאריך</Label>
                <Input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="mt-1"
                />
              </div>

              {/* Custom End Date */}
              <div>
                <Label>עד תאריך</Label>
                <Input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="mt-1"
                />
              </div>

              {/* Vendor Filter */}
              <div>
                <Label>ספק</Label>
                <Select value={selectedVendor} onValueChange={setSelectedVendor}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">כל הספקים</SelectItem>
                    {vendors.map(v => (
                      <SelectItem key={v.id} value={v.id}>{v.vendor_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Customer Filter */}
              <div>
                <Label>לקוח</Label>
                <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">כל הלקוחות</SelectItem>
                    {[...new Set(calls.map(c => c.customer_name))].filter(Boolean).map(name => (
                      <SelectItem key={name} value={name}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status Filter */}
              <div>
                <Label>סטטוס קריאה</Label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">כל הסטטוסים</SelectItem>
                    <SelectItem value="waiting_treatment">ממתין לטיפול</SelectItem>
                    <SelectItem value="awaiting_assignment">ממתין לשיוך</SelectItem>
                    <SelectItem value="assigning">בשיוך</SelectItem>
                    <SelectItem value="vendor_enroute">ספק בדרך</SelectItem>
                    <SelectItem value="in_progress">בטיפול</SelectItem>
                    <SelectItem value="completed">הושלם</SelectItem>
                    <SelectItem value="cancelled">בוטל</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Reset Button */}
              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={resetFilters}
                  className="w-full gap-2"
                >
                  <X className="w-4 h-4" />
                  אפס פילטרים
                </Button>
              </div>
            </div>

            {/* Active Filters Display */}
            {activeFiltersCount > 0 && (
              <div className="mt-4 pt-4 border-t border-[#E0E0E0]">
                <p className="text-sm text-[#616161] mb-2">פילטרים פעילים:</p>
                <div className="flex flex-wrap gap-2">
                  {customStartDate && customEndDate && (
                    <span className="px-3 py-1 bg-[#F5F5F5] text-[#212121] rounded-full text-sm border border-[#E0E0E0]">
                      תאריך: {format(new Date(customStartDate), 'dd/MM/yy')} - {format(new Date(customEndDate), 'dd/MM/yy')}
                    </span>
                  )}
                  {selectedVendor !== 'all' && (
                    <span className="px-3 py-1 bg-[#F5F5F5] text-[#212121] rounded-full text-sm border border-[#E0E0E0]">
                      ספק: {vendors.find(v => v.id === selectedVendor)?.vendor_name}
                    </span>
                  )}
                  {selectedCustomer !== 'all' && (
                    <span className="px-3 py-1 bg-[#F5F5F5] text-[#212121] rounded-full text-sm border border-[#E0E0E0]">
                      לקוח: {selectedCustomer}
                    </span>
                  )}
                  {selectedStatus !== 'all' && (
                    <span className="px-3 py-1 bg-[#F5F5F5] text-[#212121] rounded-full text-sm border border-[#E0E0E0]">
                      סטטוס: {selectedStatus}
                    </span>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link to={createPageUrl('Calls')}>
          <div className="card-base hover:border-[var(--color-border)] transition-colors cursor-pointer p-6">
            <div className="text-right">
              <div className="text-sm text-[var(--color-text-secondary)]">סה"כ קריאות</div>
              <div className="text-3xl font-bold text-black mt-1">{filteredCalls.length}</div>
              <p className="text-xs text-[var(--color-text-disabled)] mt-2">
                {calls.length > 0 ? Math.round((filteredCalls.length / calls.length) * 100) : 0}% מכלל הקריאות
              </p>
            </div>
          </div>
        </Link>
        <Link to={createPageUrl('ServiceProviders')}>
          <div className="card-base hover:border-[var(--color-border)] transition-colors cursor-pointer p-6">
            <div className="text-right">
              <div className="text-sm text-[var(--color-text-secondary)]">ספקים פעילים</div>
              <div className="text-3xl font-bold text-black mt-1">
                {[...new Set(filteredCalls.map(c => c.assigned_vendor_id).filter(Boolean))].length}
              </div>
              <p className="text-xs text-[var(--color-text-disabled)] mt-2">מתוך {vendors.length} ספקים</p>
            </div>
          </div>
        </Link>
        <Link to={createPageUrl('ServiceProviders')}>
          <div className="card-base hover:border-[var(--color-border)] transition-colors cursor-pointer p-6">
            <div className="text-right">
              <div className="text-sm text-[var(--color-text-secondary)]">דירוג ממוצע</div>
              <div className="text-3xl font-bold text-black mt-1">
                {filteredRatings.length > 0 
                  ? (filteredRatings.reduce((a, b) => a + b.overall_rating, 0) / filteredRatings.length).toFixed(1)
                  : '0.0'}
              </div>
              <p className="text-xs text-[var(--color-text-disabled)] mt-2">{filteredRatings.length} דירוגים</p>
            </div>
          </div>
        </Link>
        <Link to={createPageUrl('VendorPayments')}>
          <div className="card-base hover:border-[var(--color-border)] transition-colors cursor-pointer p-6">
            <div className="text-right">
              <div className="text-sm text-[var(--color-text-secondary)]">סה"כ הכנסות</div>
              <div className="text-3xl font-bold text-black mt-1">
                ₪{filteredPayments.reduce((sum, p) => sum + p.amount, 0).toLocaleString()}
              </div>
              <p className="text-xs text-[var(--color-text-disabled)] mt-2">{filteredPayments.length} תשלומים</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Live Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <CallStatusChart calls={filteredCalls} />
        <LiveResponseTimeChart calls={filteredCalls} vendors={vendors} />
      </div>

      {/* Report Tabs */}
      <Tabs defaultValue="vendors" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="vendors">ביצועי ספקים</TabsTrigger>
          <TabsTrigger value="sla">דוח SLA</TabsTrigger>
          <TabsTrigger value="revenue">הכנסות ורווחים</TabsTrigger>
        </TabsList>

        <TabsContent value="vendors" className="space-y-4">
          <div className="flex justify-end">
            <Button 
              variant="outline" 
              onClick={() => {
                const data = vendors.map(v => ({
                  'שם_ספק': v.vendor_name,
                  'סה_כ_קריאות': filteredCalls.filter(c => c.assigned_vendor_id === v.id).length,
                  'קריאות_הושלמו': filteredCalls.filter(c => c.assigned_vendor_id === v.id && c.call_status === 'completed').length,
                  'דירוג_ממוצע': v.average_rating || 0,
                  'זמן_תגובה_ממוצע': v.average_response_time || 0
                }));
                exportToCSV(data, 'דוח_ביצועי_ספקים');
              }}
            >
              <Download className="w-4 h-4 ml-2" />
              ייצוא CSV
            </Button>
          </div>
          <VendorPerformanceReport 
            vendors={vendors}
            calls={filteredCalls}
            ratings={filteredRatings}
          />
        </TabsContent>

        <TabsContent value="sla" className="space-y-4">
          <div className="flex justify-end">
            <Button 
              variant="outline"
              onClick={() => {
                const data = filteredCalls.map(c => ({
                  'מספר_קריאה': c.call_number,
                  'אזור': c.pickup_location_area,
                  'סוג_תקלה': c.issue_type,
                  'זמן_תגובה': c.time_to_vendor_assignment,
                  'יעד_SLA': c.sla_target,
                  'עמד_ב_SLA': c.time_to_vendor_assignment && c.sla_target ? (c.time_to_vendor_assignment <= c.sla_target ? 'כן' : 'לא') : '-'
                }));
                exportToCSV(data, 'דוח_SLA');
              }}
            >
              <Download className="w-4 h-4 ml-2" />
              ייצוא CSV
            </Button>
          </div>
          <SLAReport calls={filteredCalls} />
        </TabsContent>

        <TabsContent value="revenue" className="space-y-4">
          <div className="flex justify-end">
            <Button 
              variant="outline"
              onClick={() => {
                const data = filteredPayments.map(p => ({
                  'ספק': p.vendor_name,
                  'סוג_תשלום': p.payment_type,
                  'סכום': p.amount,
                  'סטטוס': p.status,
                  'תאריך': format(new Date(p.created_date), 'dd/MM/yyyy', { locale: he })
                }));
                exportToCSV(data, 'דוח_הכנסות');
              }}
            >
              <Download className="w-4 h-4 ml-2" />
              ייצוא CSV
            </Button>
          </div>
          <RevenueReport 
            payments={filteredPayments}
            vendors={vendors}
            calls={filteredCalls}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}