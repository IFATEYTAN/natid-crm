import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { printData, exportToHTML } from '@/components/ui/ExportMenu';
import {
  Download,
  FileSpreadsheet,
  FileText,
  File,
  FileCode,
  Calendar,
  Filter,
  CheckSquare,
  Loader2,
  AlertCircle,
  Phone,
  Users,
  CheckCircle,
} from 'lucide-react';
import moment from 'moment';
import { showToast, feedbackMessages } from '@/components/ui/FeedbackToast';
import { PageLoader, InlineLoader } from '@/components/ui/LoadingSpinner';
import { SlideUp, AnimatedCard } from '@/components/animations/AnimatedComponents';

// Field definitions for Calls
const callFields = {
  basic: {
    label: 'פרטים בסיסיים',
    fields: {
      call_number: 'מספר קריאה',
      call_status: 'סטטוס',
      call_priority: 'עדיפות',
      created_date: 'תאריך יצירה',
      issue_type: 'סוג תקלה',
      issue_description: 'תיאור תקלה',
    },
  },
  customer: {
    label: 'פרטי לקוח',
    fields: {
      customer_name: 'שם לקוח',
      customer_phone: 'טלפון',
      customer_phone_2: 'טלפון משני',
      customer_email: 'אימייל',
      customer_id_number: 'ת.ז.',
      insurance_company: 'חברת ביטוח',
      membership_package: 'חבילה',
    },
  },
  vehicle: {
    label: 'פרטי רכב',
    fields: {
      vehicle_plate: 'מספר רכב',
      vehicle_model: 'דגם',
      vehicle_year: 'שנת יצור',
      vehicle_type: 'סוג רכב',
      fuel_type: 'סוג דלק',
    },
  },
  location: {
    label: 'מיקום',
    fields: {
      pickup_location_address: 'כתובת איסוף',
      pickup_location_city: 'עיר איסוף',
      pickup_location_area: 'אזור',
      dropoff_location_address: 'כתובת יעד',
      dropoff_location_city: 'עיר יעד',
      dropoff_garage_name: 'שם מוסך',
    },
  },
  vendor: {
    label: 'ספק',
    fields: {
      assigned_vendor_name: 'שם ספק',
      assigned_at: 'זמן שיבוץ',
      vendor_arrival_time_actual: 'זמן הגעה בפועל',
      vendor_notes: 'הערות ספק',
    },
  },
  financial: {
    label: 'כספי',
    fields: {
      payment_required: 'דרוש תשלום',
      payment_amount_customer: 'סכום',
      payment_type: 'אמצעי תשלום',
      cost_to_vendor: 'עלות לספק',
    },
  },
  timing: {
    label: 'זמנים',
    fields: {
      time_waiting: 'זמן המתנה',
      time_to_vendor_assignment: 'זמן לשיבוץ',
      time_to_completion: 'זמן לסיום',
      sla_target: 'יעד SLA',
      sla_status: 'סטטוס SLA',
    },
  },
};

// Field definitions for Customers
const customerFields = {
  basic: {
    label: 'פרטים בסיסיים',
    fields: {
      name: 'שם',
      customer_type: 'סוג לקוח',
      status: 'סטטוס',
      created_date: 'תאריך הצטרפות',
    },
  },
  contact: {
    label: 'פרטי קשר',
    fields: {
      contact_person: 'איש קשר',
      phone: 'טלפון',
      email: 'אימייל',
      address: 'כתובת',
      city: 'עיר',
    },
  },
  contract: {
    label: 'חוזה',
    fields: {
      contract_type: 'סוג חוזה',
      sla_response_minutes: 'SLA תגובה',
      sla_arrival_minutes: 'SLA הגעה',
      monthly_budget: 'תקציב חודשי',
    },
  },
  stats: {
    label: 'סטטיסטיקות',
    fields: {
      total_cases: 'סה״כ קריאות',
      notes: 'הערות',
    },
  },
};

const callStatusOptions = [
  { value: 'all', label: 'הכל' },
  { value: 'waiting_treatment', label: 'ממתין לטיפול' },
  { value: 'awaiting_assignment', label: 'ממתין לשיבוץ' },
  { value: 'assigning', label: 'בתהליך שיבוץ' },
  { value: 'vendor_enroute', label: 'ספק בדרך' },
  { value: 'in_progress', label: 'בטיפול' },
  { value: 'completed', label: 'הושלם' },
  { value: 'cancelled', label: 'בוטל' },
];

const customerStatusOptions = [
  { value: 'all', label: 'הכל' },
  { value: 'active', label: 'פעיל' },
  { value: 'inactive', label: 'לא פעיל' },
  { value: 'suspended', label: 'מושהה' },
];

export default function AdvancedExport() {
  const [activeTab, setActiveTab] = useState('calls');
  // Enforce RTL on this page
  const rtlProps = { dir: 'rtl', className: 'text-right' };
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState(null);

  // Calls export state
  const [callsDateRange, setCallsDateRange] = useState({
    start: moment().subtract(30, 'days').format('YYYY-MM-DD'),
    end: moment().format('YYYY-MM-DD'),
  });
  const [callsStatus, setCallsStatus] = useState('all');
  const [selectedCallFields, setSelectedCallFields] = useState(
    Object.values(callFields).flatMap((group) => Object.keys(group.fields))
  );

  // Customers export state
  const [customersDateRange, setCustomersDateRange] = useState({
    start: moment().subtract(365, 'days').format('YYYY-MM-DD'),
    end: moment().format('YYYY-MM-DD'),
  });
  const [customersStatus, setCustomersStatus] = useState('all');
  const [selectedCustomerFields, setSelectedCustomerFields] = useState(
    Object.values(customerFields).flatMap((group) => Object.keys(group.fields))
  );

  // Fetch data for preview counts
  const { data: calls = [], isLoading: callsLoading } = useQuery({
    queryKey: ['calls-export-preview', callsDateRange, callsStatus],
    queryFn: async () => {
      const allCalls = await base44.entities.Call.list('-created_date', 1000);
      return allCalls.filter((call) => {
        const createdDate = moment(call.created_date);
        const inDateRange = createdDate.isBetween(
          callsDateRange.start,
          callsDateRange.end,
          'day',
          '[]'
        );
        const matchesStatus = callsStatus === 'all' || call.call_status === callsStatus;
        return inDateRange && matchesStatus;
      });
    },
  });

  const { data: customers = [], isLoading: customersLoading } = useQuery({
    queryKey: ['customers-export-preview', customersDateRange, customersStatus],
    queryFn: async () => {
      const allCustomers = await base44.entities.Customer.list('-created_date', 1000);
      return allCustomers.filter((customer) => {
        const createdDate = moment(customer.created_date);
        const inDateRange = createdDate.isBetween(
          customersDateRange.start,
          customersDateRange.end,
          'day',
          '[]'
        );
        const matchesStatus = customersStatus === 'all' || customer.status === customersStatus;
        return inDateRange && matchesStatus;
      });
    },
  });

  const toggleFieldGroup = (groupFields, selectedFields, setSelectedFields) => {
    const groupFieldKeys = Object.keys(groupFields);
    const allSelected = groupFieldKeys.every((f) => selectedFields.includes(f));

    if (allSelected) {
      setSelectedFields(selectedFields.filter((f) => !groupFieldKeys.includes(f)));
    } else {
      setSelectedFields([...new Set([...selectedFields, ...groupFieldKeys])]);
    }
  };

  const toggleField = (field, selectedFields, setSelectedFields) => {
    if (selectedFields.includes(field)) {
      setSelectedFields(selectedFields.filter((f) => f !== field));
    } else {
      setSelectedFields([...selectedFields, field]);
    }
  };

  const selectAllFields = (fieldDefinitions, setSelectedFields) => {
    setSelectedFields(
      Object.values(fieldDefinitions).flatMap((group) => Object.keys(group.fields))
    );
  };

  const deselectAllFields = (setSelectedFields) => {
    setSelectedFields([]);
  };

  const generateCSV = (data, fields, fieldLabels) => {
    const headers = fields.map((f) => fieldLabels[f] || f);
    const rows = data.map((item) =>
      fields
        .map((field) => {
          let value = item[field];
          if (value === null || value === undefined) return '';
          if (typeof value === 'boolean') return value ? 'כן' : 'לא';
          if (typeof value === 'object') return JSON.stringify(value);
          value = String(value);
          if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            value = '"' + value.replace(/"/g, '""') + '"';
          }
          return value;
        })
        .join(',')
    );
    return '\uFEFF' + headers.join(',') + '\n' + rows.join('\n');
  };

  const generateExcel = (data, fields, fieldLabels) => {
    // Excel-compatible CSV with proper encoding
    const headers = fields.map((f) => fieldLabels[f] || f);
    const rows = data.map((item) =>
      fields
        .map((field) => {
          let value = item[field];
          if (value === null || value === undefined) return '';
          if (typeof value === 'boolean') return value ? 'כן' : 'לא';
          if (typeof value === 'object') return JSON.stringify(value);
          return String(value);
        })
        .join('\t')
    );
    return '\uFEFF' + headers.join('\t') + '\n' + rows.join('\n');
  };

  // PDF generation now uses the robust printData function from ExportMenu
  // which handles Hebrew/RTL correctly via browser printing

  const downloadFile = (content, filename, type) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExport = async (format) => {
    setIsExporting(true);
    setExportError(null);

    try {
      const isCalls = activeTab === 'calls';
      const data = isCalls ? calls : customers;
      const fields = isCalls ? selectedCallFields : selectedCustomerFields;
      const allFieldLabels = isCalls
        ? Object.values(callFields).reduce((acc, g) => ({ ...acc, ...g.fields }), {})
        : Object.values(customerFields).reduce((acc, g) => ({ ...acc, ...g.fields }), {});

      if (fields.length === 0) {
        setExportError('נא לבחור לפחות שדה אחד לייצוא');
        return;
      }

      if (data.length === 0) {
        setExportError('אין נתונים לייצוא בטווח התאריכים שנבחר');
        return;
      }

      const timestamp = moment().format('YYYY-MM-DD_HH-mm');
      const entityName = isCalls ? 'calls' : 'customers';

      switch (format) {
        case 'csv': {
          const csv = generateCSV(data, fields, allFieldLabels);
          downloadFile(csv, `${entityName}_export_${timestamp}.csv`, 'text/csv;charset=utf-8');
          break;
        }
        case 'excel': {
          const excel = generateExcel(data, fields, allFieldLabels);
          downloadFile(
            excel,
            `${entityName}_export_${timestamp}.xls`,
            'application/vnd.ms-excel;charset=utf-8'
          );
          break;
        }
        case 'pdf': {
          const title = isCalls ? 'דוח קריאות' : 'דוח לקוחות';
          const columns = fields.map(f => ({
            header: allFieldLabels[f] || f,
            accessor: f
          }));
          printData(data, columns, { title, subtitle: `דוח ${entityName} - ייצוא מתקדם` });
          break;
        }
        case 'html': {
          const title = isCalls ? 'דוח קריאות' : 'דוח לקוחות';
          const columns = fields.map(f => ({
            header: allFieldLabels[f] || f,
            accessor: f
          }));
          exportToHTML(data, columns, entityName, { title, subtitle: `דוח ${entityName} - ייצוא מתקדם` });
          break;
        }
      }
      showToast.success(`${feedbackMessages.export.success} - ${data.length} רשומות`);
    } catch (error) {
      console.error('Export error:', error);
      setExportError('אירעה שגיאה בייצוא הנתונים');
      showToast.error(feedbackMessages.export.error);
    } finally {
      setIsExporting(false);
    }
  };

  const renderFieldSelector = (fieldDefinitions, selectedFields, setSelectedFields) => (
    <div className="space-y-4" dir="rtl">
      <div className="flex gap-2 justify-start">
        <Button
          variant="outline"
          size="sm"
          onClick={() => selectAllFields(fieldDefinitions, setSelectedFields)}
        >
          בחר הכל
        </Button>
        <Button variant="outline" size="sm" onClick={() => deselectAllFields(setSelectedFields)}>
          נקה הכל
        </Button>
      </div>

      <ScrollArea className="h-[300px] border rounded-lg p-4" dir="rtl">
        {Object.entries(fieldDefinitions).map(([groupKey, group]) => {
          const groupFieldKeys = Object.keys(group.fields);
          const allSelected = groupFieldKeys.every((f) => selectedFields.includes(f));
          const someSelected = groupFieldKeys.some((f) => selectedFields.includes(f));

          return (
            <div key={groupKey} className="mb-4">
              <div
                className="flex items-center gap-2 mb-2 cursor-pointer hover:bg-gray-50 p-1 rounded flex-row-reverse justify-end"
                onClick={() => toggleFieldGroup(group.fields, selectedFields, setSelectedFields)}
              >
                <Checkbox
                  checked={allSelected}
                  className={someSelected && !allSelected ? 'opacity-50' : ''}
                />
                <span className="font-medium text-sm">{group.label}</span>
                <span className="text-xs text-gray-500">
                  ({groupFieldKeys.filter((f) => selectedFields.includes(f)).length}/
                  {groupFieldKeys.length})
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1 mr-6 text-right">
                {Object.entries(group.fields).map(([fieldKey, fieldLabel]) => (
                  <label
                    key={fieldKey}
                    className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 p-1 rounded flex-row-reverse justify-end"
                  >
                    <Checkbox
                      checked={selectedFields.includes(fieldKey)}
                      onCheckedChange={() =>
                        toggleField(fieldKey, selectedFields, setSelectedFields)
                      }
                    />
                    <span>{fieldLabel}</span>
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </ScrollArea>

      <div className="text-sm text-gray-500 text-right">נבחרו {selectedFields.length} שדות</div>
    </div>
  );

  return (
    <SlideUp>
      <div className="max-w-5xl mx-auto space-y-6" dir="rtl">
        <div className="text-right">
          <h1 className="text-2xl font-bold text-[#111827]">ייצוא מתקדם</h1>
          <p className="text-[#6b7280]">ייצוא נתוני קריאות ולקוחות עם אפשרויות סינון מתקדמות</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="calls" className="gap-2 flex-row-reverse">
              <Phone className="w-4 h-4" />
              קריאות
            </TabsTrigger>
            <TabsTrigger value="customers" className="gap-2 flex-row-reverse">
              <Users className="w-4 h-4" />
              לקוחות
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calls" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4" dir="rtl">
              {/* Status Filter - first on right */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2 flex-row-reverse justify-end">
                    <Filter className="w-4 h-4" />
                    סינון לפי סטטוס
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Select value={callsStatus} onValueChange={setCallsStatus} dir="rtl">
                    <SelectTrigger className="text-right">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {callStatusOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="mt-4 p-3 bg-[#eff6ff] rounded-[8px] border border-[#bfdbfe]">
                    {callsLoading ? (
                      <div className="flex items-center gap-2 text-sm text-[#3b82f6] flex-row-reverse justify-end">
                        <InlineLoader className="text-[#3b82f6]" />
                        <span>טוען נתונים...</span>
                      </div>
                    ) : (
                      <p className="text-sm text-[#1e40af] flex items-center gap-2 flex-row-reverse justify-end">
                        <CheckCircle className="w-4 h-4" />
                        <strong>{calls.length}</strong> קריאות נמצאו בטווח שנבחר
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Date Range */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2 flex-row-reverse justify-end">
                    <Calendar className="w-4 h-4" />
                    טווח תאריכים
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label>מתאריך</Label>
                    <Input
                      type="date"
                      value={callsDateRange.start}
                      onChange={(e) =>
                        setCallsDateRange({ ...callsDateRange, start: e.target.value })
                      }
                      className="text-right"
                    />
                  </div>
                  <div>
                    <Label>עד תאריך</Label>
                    <Input
                      type="date"
                      value={callsDateRange.end}
                      onChange={(e) =>
                        setCallsDateRange({ ...callsDateRange, end: e.target.value })
                      }
                      className="text-right"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Field Selection */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 flex-row-reverse justify-end">
                  <CheckSquare className="w-4 h-4" />
                  בחירת שדות לייצוא
                </CardTitle>
                <CardDescription className="text-right">בחר את השדות שברצונך לכלול בקובץ המיוצא</CardDescription>
              </CardHeader>
              <CardContent>
                {renderFieldSelector(callFields, selectedCallFields, setSelectedCallFields)}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="customers" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4" dir="rtl">
              {/* Status Filter - first on right */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2 flex-row-reverse justify-end">
                    <Filter className="w-4 h-4" />
                    סינון לפי סטטוס
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Select value={customersStatus} onValueChange={setCustomersStatus} dir="rtl">
                    <SelectTrigger className="text-right">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {customerStatusOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="mt-4 p-3 bg-[#eff6ff] rounded-[8px] border border-[#bfdbfe]">
                    {customersLoading ? (
                      <div className="flex items-center gap-2 text-sm text-[#3b82f6] flex-row-reverse justify-end">
                        <InlineLoader className="text-[#3b82f6]" />
                        <span>טוען נתונים...</span>
                      </div>
                    ) : (
                      <p className="text-sm text-[#1e40af] flex items-center gap-2 flex-row-reverse justify-end">
                        <CheckCircle className="w-4 h-4" />
                        <strong>{customers.length}</strong> לקוחות נמצאו בטווח שנבחר
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Date Range */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2 flex-row-reverse justify-end">
                    <Calendar className="w-4 h-4" />
                    טווח תאריכים
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label>מתאריך</Label>
                    <Input
                      type="date"
                      value={customersDateRange.start}
                      onChange={(e) =>
                        setCustomersDateRange({ ...customersDateRange, start: e.target.value })
                      }
                      className="text-right"
                    />
                  </div>
                  <div>
                    <Label>עד תאריך</Label>
                    <Input
                      type="date"
                      value={customersDateRange.end}
                      onChange={(e) =>
                        setCustomersDateRange({ ...customersDateRange, end: e.target.value })
                      }
                      className="text-right"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Field Selection */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 flex-row-reverse justify-end">
                  <CheckSquare className="w-4 h-4" />
                  בחירת שדות לייצוא
                </CardTitle>
                <CardDescription className="text-right">בחר את השדות שברצונך לכלול בקובץ המיוצא</CardDescription>
              </CardHeader>
              <CardContent>
                {renderFieldSelector(
                  customerFields,
                  selectedCustomerFields,
                  setSelectedCustomerFields
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Export Error */}
        {exportError && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 flex-row-reverse justify-end">
            <AlertCircle className="w-4 h-4" />
            {exportError}
          </div>
        )}

        {/* Export Actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 flex-row-reverse justify-end">
              <Download className="w-4 h-4" />
              ייצוא
            </CardTitle>
            <CardDescription className="text-right">בחר פורמט לייצוא הנתונים</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3 justify-end">
              <Button
                onClick={() => handleExport('csv')}
                disabled={isExporting}
                className="gap-2"
                variant="outline"
              >
                {isExporting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileText className="w-4 h-4" />
                )}
                ייצוא CSV
              </Button>
              <Button
                onClick={() => handleExport('excel')}
                disabled={isExporting}
                className="gap-2"
                variant="outline"
              >
                {isExporting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileSpreadsheet className="w-4 h-4" />
                )}
                ייצוא Excel
              </Button>
              <Button
                onClick={() => handleExport('pdf')}
                disabled={isExporting}
                className="gap-2 bg-[#0D47A1] hover:bg-[#1565C0]"
              >
                {isExporting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <File className="w-4 h-4" />
                )}
                ייצוא PDF
              </Button>
              <Button
                onClick={() => handleExport('html')}
                disabled={isExporting}
                className="gap-2 bg-purple-600 hover:bg-purple-700 text-white"
              >
                {isExporting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileCode className="w-4 h-4" />
                )}
                ייצוא HTML
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </SlideUp>
  );
}