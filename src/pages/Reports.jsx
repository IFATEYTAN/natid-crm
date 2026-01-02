import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download } from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { he } from 'date-fns/locale';
import VendorPerformanceReport from '@/components/reports/VendorPerformanceReport';
import SLAReport from '@/components/reports/SLAReport';
import RevenueReport from '@/components/reports/RevenueReport';

export default function Reports() {
  const [dateRange, setDateRange] = useState('30');

  // Fetch data
  const { data: vendors = [] } = useQuery({
    queryKey: ['vendors-report'],
    queryFn: () => base44.entities.Vendor.list()
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
  const startDate = startOfDay(subDays(new Date(), parseInt(dateRange)));
  const endDate = endOfDay(new Date());

  // Filter by date
  const filteredCalls = calls.filter(c => {
    if (!c.created_date) return false;
    const date = new Date(c.created_date);
    return date >= startDate && date <= endDate;
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
      alert('אין נתונים לייצוא');
      return;
    }

    const csvHeaders = headers || Object.keys(data[0]);
    const csvRows = data.map(row => 
      csvHeaders.map(header => {
        const value = row[header];
        return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
      }).join(',')
    );
    
    const csvContent = [csvHeaders.join(','), ...csvRows].join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${format(new Date(), 'dd-MM-yyyy')}.csv`;
    link.click();
  };



  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[32px] font-bold text-[#0078D4]">דוחות מתקדמים</h1>
          <p className="text-[#616161] text-sm">ניתוח מקיף של ביצועים, SLA והכנסות</p>
        </div>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">7 ימים</SelectItem>
            <SelectItem value="14">14 ימים</SelectItem>
            <SelectItem value="30">30 ימים</SelectItem>
            <SelectItem value="90">90 ימים</SelectItem>
            <SelectItem value="180">6 חודשים</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-[#616161]">סה"כ קריאות</div>
            <div className="text-2xl font-bold text-[#212121] mt-1">{filteredCalls.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-[#616161]">ספקים פעילים</div>
            <div className="text-2xl font-bold text-[#212121] mt-1">{vendors.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-[#616161]">דירוגים</div>
            <div className="text-2xl font-bold text-[#212121] mt-1">{filteredRatings.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-[#616161]">תשלומים</div>
            <div className="text-2xl font-bold text-[#212121] mt-1">{filteredPayments.length}</div>
          </CardContent>
        </Card>
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
                  'דירוג_ממוצע': v.average_rating || 0
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
                  'עמד_ב_SLA': c.time_to_vendor_assignment <= c.sla_target ? 'כן' : 'לא'
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