import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
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
import { Filter, X, BarChart3, FileText, Users } from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { he } from 'date-fns/locale';
import { createPageUrl } from '@/utils';
import StatCard from '@/components/ui/StatCard';
import VendorPerformanceReport from '@/components/reports/VendorPerformanceReport';
import SLAReport from '@/components/reports/SLAReport';
import RevenueReport from '@/components/reports/RevenueReport';
import CallStatusChart from '@/components/reports/CallStatusChart';
import LiveResponseTimeChart from '@/components/reports/LiveResponseTimeChart';
import ExportMenu from '@/components/ui/ExportMenu';
import { AnimatedCard, AnimatedCounter, AnimatedList } from '@/components/animations/AnimatedComponents';
import ImportExport from '@/components/ImportExport';

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

  // Columns for export
  const exportColumns = [
    { header: 'מספר קריאה', accessor: 'call_number' },
    { header: 'תאריך', accessor: 'created_date_formatted' },
    { header: 'לקוח', accessor: 'customer_name' },
    { header: 'טלפון', accessor: 'customer_phone' },
    { header: 'סוג תקלה', accessor: 'issue_type' },
    { header: 'אזור', accessor: 'pickup_location_area' },
    { header: 'סטטוס', accessor: 'call_status' },
    { header: 'ספק משובץ', accessor: 'assigned_vendor_name' },
    { header: 'זמן תגובה (דקות)', accessor: 'time_to_vendor_assignment' },
    { header: 'עלות', accessor: 'cost_to_vendor' },
  ];

  // Prepare data for export with formatted dates
  const exportData = filteredCalls.map(call => ({
    ...call,
    call_number: call.call_number || call.id?.slice(-6),
    created_date_formatted: call.created_date
      ? format(new Date(call.created_date), 'dd/MM/yyyy HH:mm', { locale: he })
      : '-',
    assigned_vendor_name: call.assigned_vendor_name || '-',
    time_to_vendor_assignment: call.time_to_vendor_assignment || '-',
    cost_to_vendor: call.cost_to_vendor ? `₪${call.cost_to_vendor}` : '-',
  }));

  // Handle email send
  const handleEmailSend = async ({ email, subject, message }) => {
    // This would integrate with your email service
    console.log('Sending email to:', email, 'Subject:', subject);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    return true;
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
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
      dir="rtl"
    >
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h1 className="flex items-center gap-3">
            <motion.div
              className="w-10 h-10 bg-gradient-to-br from-[#FF0000] to-[#CC0000] rounded-lg flex items-center justify-center"
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: 'spring', stiffness: 400 }}
            >
              <BarChart3 className="w-5 h-5 text-white" />
            </motion.div>
            דוחות וניתוחים
          </h1>
          <p className="text-[var(--color-text-secondary)] mt-1">
            ניתוח מקיף של ביצועים, SLA והכנסות •{' '}
            <AnimatedCounter value={filteredCalls.length} duration={0.5} /> קריאות
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-wrap items-center gap-3"
        >
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-4 h-4" />
            פילטרים
            {activeFiltersCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="bg-[#FF0000] text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
              >
                {activeFiltersCount}
              </motion.span>
            )}
          </Button>

          <ExportMenu
            data={exportData}
            columns={exportColumns}
            filename="דוח_קריאות"
            title="דוח קריאות - נתי שירותי דרך"
            subtitle={`${format(startDate, 'dd/MM/yyyy')} - ${format(endDate, 'dd/MM/yyyy')}`}
            onEmailSend={handleEmailSend}
          />
          <ImportExport
            entityName="AllCalls"
            data={filteredCalls.map(call => ({
              call_number: call.call_number || call.id.slice(-6),
              created_date: format(new Date(call.created_date), 'dd/MM/yyyy HH:mm', { locale: he }),
              customer_name: call.customer_name,
              customer_phone: call.customer_phone,
              issue_type: call.issue_type,
              pickup_location_city: call.pickup_location_city,
              call_status: call.call_status,
              assigned_vendor_name: call.assigned_vendor_name || '-',
              call_priority: call.call_priority
            }))}
            columns={[
              { header: 'מספר קריאה', accessor: 'call_number' },
              { header: 'תאריך', accessor: 'created_date' },
              { header: 'לקוח', accessor: 'customer_name' },
              { header: 'טלפון', accessor: 'customer_phone' },
              { header: 'תקלה', accessor: 'issue_type' },
              { header: 'עיר', accessor: 'pickup_location_city' },
              { header: 'סטטוס', accessor: 'call_status' },
              { header: 'ספק', accessor: 'assigned_vendor_name' },
              { header: 'עדיפות', accessor: 'call_priority' }
            ]}
            title="דוח קריאות מרוכז"
          />
        </motion.div>
      </div>

      {/* Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary Cards with Stagger Animation */}
      <AnimatedList animation="fadeInUp" staggerDelay={0.08} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <AnimatedCard hoverScale={1.03}>
          <StatCard
            title='סה"כ קריאות'
            value={filteredCalls.length}
            subtitle={`${calls.length > 0 ? Math.round((filteredCalls.length / calls.length) * 100) : 0}% מכלל הקריאות`}
            to={createPageUrl('Calls')}
          />
        </AnimatedCard>
        <AnimatedCard hoverScale={1.03}>
          <StatCard
            title="ספקים פעילים"
            value={[...new Set(filteredCalls.map(c => c.assigned_vendor_id).filter(Boolean))].length}
            subtitle={`מתוך ${vendors.length} ספקים`}
            to={createPageUrl('ServiceProviders')}
          />
        </AnimatedCard>
        <AnimatedCard hoverScale={1.03}>
          <StatCard
            title="דירוג ממוצע"
            value={filteredRatings.length > 0
              ? (filteredRatings.reduce((a, b) => a + b.overall_rating, 0) / filteredRatings.length).toFixed(1)
              : '0.0'}
            subtitle={`${filteredRatings.length} דירוגים`}
            to={createPageUrl('ServiceProviders')}
          />
        </AnimatedCard>
        <AnimatedCard hoverScale={1.03}>
          <StatCard
            title='סה"כ הכנסות'
            value={`₪${filteredPayments.reduce((sum, p) => sum + (p.amount || 0), 0).toLocaleString()}`}
            subtitle={`${filteredPayments.length} תשלומים`}
            to={createPageUrl('VendorPayments')}
          />
        </AnimatedCard>
      </AnimatedList>

      {/* Live Charts with Animation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        className="grid lg:grid-cols-2 gap-6"
      >
        <AnimatedCard>
          <CallStatusChart calls={filteredCalls} />
        </AnimatedCard>
        <AnimatedCard>
          <LiveResponseTimeChart calls={filteredCalls} vendors={vendors} />
        </AnimatedCard>
      </motion.div>

      {/* Report Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.4 }}
      >
        <Tabs defaultValue="vendors" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="vendors" className="gap-2">
              <Users className="w-4 h-4" />
              ביצועי ספקים
            </TabsTrigger>
            <TabsTrigger value="sla" className="gap-2">
              <FileText className="w-4 h-4" />
              דוח SLA
            </TabsTrigger>
            <TabsTrigger value="revenue" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              הכנסות ורווחים
            </TabsTrigger>
          </TabsList>

          <TabsContent value="vendors" className="space-y-4">
            <div className="flex justify-end">
              <ExportMenu
                data={vendors.map(v => ({
                  vendor_name: v.vendor_name,
                  total_calls: filteredCalls.filter(c => c.assigned_vendor_id === v.id).length,
                  completed_calls: filteredCalls.filter(c => c.assigned_vendor_id === v.id && c.call_status === 'completed').length,
                  average_rating: v.average_rating || 0,
                  average_response_time: v.average_response_time || 0
                }))}
                columns={[
                  { header: 'שם ספק', accessor: 'vendor_name' },
                  { header: 'סה"כ קריאות', accessor: 'total_calls' },
                  { header: 'קריאות שהושלמו', accessor: 'completed_calls' },
                  { header: 'דירוג ממוצע', accessor: 'average_rating' },
                  { header: 'זמן תגובה ממוצע', accessor: 'average_response_time' },
                ]}
                filename="דוח_ביצועי_ספקים"
                title="דוח ביצועי ספקים"
                subtitle="נתי שירותי דרך"
                onEmailSend={handleEmailSend}
              />
            </div>
            <VendorPerformanceReport
              vendors={vendors}
              calls={filteredCalls}
              ratings={filteredRatings}
            />
          </TabsContent>

          <TabsContent value="sla" className="space-y-4">
            <div className="flex justify-end">
              <ExportMenu
                data={filteredCalls.map(c => ({
                  call_number: c.call_number,
                  pickup_location_area: c.pickup_location_area,
                  issue_type: c.issue_type,
                  time_to_vendor_assignment: c.time_to_vendor_assignment,
                  sla_target: c.sla_target,
                  met_sla: c.time_to_vendor_assignment && c.sla_target
                    ? (c.time_to_vendor_assignment <= c.sla_target ? 'כן' : 'לא')
                    : '-'
                }))}
                columns={[
                  { header: 'מספר קריאה', accessor: 'call_number' },
                  { header: 'אזור', accessor: 'pickup_location_area' },
                  { header: 'סוג תקלה', accessor: 'issue_type' },
                  { header: 'זמן תגובה', accessor: 'time_to_vendor_assignment' },
                  { header: 'יעד SLA', accessor: 'sla_target' },
                  { header: 'עמד ב-SLA', accessor: 'met_sla' },
                ]}
                filename="דוח_SLA"
                title="דוח עמידה ב-SLA"
                subtitle="נתי שירותי דרך"
                onEmailSend={handleEmailSend}
              />
            </div>
            <SLAReport calls={filteredCalls} />
          </TabsContent>

          <TabsContent value="revenue" className="space-y-4">
            <div className="flex justify-end">
              <ExportMenu
                data={filteredPayments.map(p => ({
                  vendor_name: p.vendor_name,
                  payment_type: p.payment_type,
                  amount: p.amount,
                  status: p.status,
                  created_date: p.created_date
                    ? format(new Date(p.created_date), 'dd/MM/yyyy', { locale: he })
                    : '-'
                }))}
                columns={[
                  { header: 'ספק', accessor: 'vendor_name' },
                  { header: 'סוג תשלום', accessor: 'payment_type' },
                  { header: 'סכום', accessor: 'amount' },
                  { header: 'סטטוס', accessor: 'status' },
                  { header: 'תאריך', accessor: 'created_date' },
                ]}
                filename="דוח_הכנסות"
                title="דוח הכנסות ותשלומים"
                subtitle="נתי שירותי דרך"
                onEmailSend={handleEmailSend}
              />
            </div>
            <RevenueReport
              payments={filteredPayments}
              vendors={vendors}
              calls={filteredCalls}
            />
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  );
}