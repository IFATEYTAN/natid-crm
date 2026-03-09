import React, { useState, useMemo, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import DataTable from '@/components/ui/DataTable';
import {
  Search,
  Users,
  Truck,
  Car,
  Disc,
  Shield,
  ArrowRight,
  UserSearch,
  List,
  ExternalLink,
  Phone,
  Mail,
  MapPin,
  Clock,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react';
import { statusLabels, statusColors } from '@/config/labels';
import { coverageAreas, coverageLabels } from '@/config/coverageConstants';
import { format } from 'date-fns';

// ─── Department Definitions ─────────────────────────────────────────────────
const DEPARTMENTS = [
  { key: 'towing', label: 'מחלקת גרירה', icon: Truck },
  { key: 'replacement_vehicle', label: 'מחלקת רכב חליפי', icon: Car },
  { key: 'tire_windshield', label: 'מחלקת פנמ"ר ושמשות', icon: Shield },
  { key: 'radio_disc', label: 'מחלקת רדיו דיסק', icon: Disc },
];

// Maps department key to vendor service_type filter values
const DEPARTMENT_VENDOR_TYPES = {
  towing: ['tow_truck'],
  replacement_vehicle: ['replacement_vehicle'],
  tire_windshield: ['tire_service', 'windshield'],
  radio_disc: ['radio_disc'],
};

const SUB_VIEWS = [
  { key: 'search_subscriber', label: 'חיפוש מנוי', icon: Search },
  { key: 'search_agent', label: 'חיפוש סוכן', icon: UserSearch },
  { key: 'cases_list', label: 'רשימת פניות', icon: List },
  { key: 'private_service', label: 'שירות פרטי', icon: ExternalLink },
];

const STATUS_COLORS_INLINE = {
  new: 'bg-yellow-100 text-yellow-800',
  assigned: 'bg-blue-100 text-blue-800',
  en_route: 'bg-indigo-100 text-indigo-800',
  on_site: 'bg-purple-100 text-purple-800',
  in_progress: 'bg-orange-100 text-orange-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-600',
  waiting_treatment: 'bg-yellow-100 text-yellow-800',
  awaiting_assignment: 'bg-orange-100 text-orange-800',
  vendor_enroute: 'bg-indigo-100 text-indigo-800',
  vendor_arrived: 'bg-amber-100 text-amber-800',
  future_service: 'bg-violet-100 text-violet-800',
  in_followup: 'bg-cyan-100 text-cyan-800',
  in_storage: 'bg-stone-100 text-stone-800',
  continued_treatment: 'bg-teal-100 text-teal-800',
  awaiting_payment: 'bg-rose-100 text-rose-800',
};

// ─── Helper: safe date formatting ───────────────────────────────────────────
function formatDate(val) {
  if (!val) return '—';
  try {
    return format(new Date(val), 'dd/MM/yyyy');
  } catch {
    return '—';
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function DepartmentView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const activeDept = searchParams.get('dept') || 'towing';
  const [subView, setSubView] = useState('search_subscriber');

  const setDepartment = useCallback(
    (dept) => {
      setSearchParams({ dept });
      setSubView('search_subscriber');
    },
    [setSearchParams]
  );

  // Handle "שירות פרטי" sub-view: redirect to PrivateService page
  const handleSubViewChange = useCallback(
    (view) => {
      if (view === 'private_service') {
        navigate(createPageUrl(`PrivateService?department=${activeDept}`));
        return;
      }
      setSubView(view);
    },
    [activeDept, navigate]
  );

  return (
    <div className="space-y-6 rtl-flip">
      {/* Page Header */}
      <div className="flex items-center justify-end gap-4 text-right">
        <div className="flex-1">
          <h1 className="text-[32px] font-bold text-[#212121] text-right">תצוגת מחלקה</h1>
          <p className="text-[#616161] text-sm text-right">ניהול מחלקתי — צפייה, חיפוש ומעקב לפי מחלקה</p>
        </div>
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="חזרה">
          <ArrowRight className="w-5 h-5" />
        </Button>
      </div>

      {/* Department Tabs */}
      <Tabs value={activeDept} onValueChange={setDepartment}>
        <TabsList className="w-full justify-end gap-1 flex-wrap h-auto p-1 flex-row-reverse">
          {DEPARTMENTS.map((dept) => {
            const Icon = dept.icon;
            return (
              <TabsTrigger key={dept.key} value={dept.key} className="gap-2">
                <Icon className="w-4 h-4" />
                {dept.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* Each department shows the same layout */}
        {DEPARTMENTS.map((dept) => (
          <TabsContent key={dept.key} value={dept.key}>
            {/* Sub-navigation */}
             <div className="flex gap-2 flex-wrap mb-6 flex-row-reverse justify-end">
               {SUB_VIEWS.map((sv) => {
                const Icon = sv.icon;
                return (
                  <Button
                    key={sv.key}
                    variant={subView === sv.key ? 'default' : 'outline'}
                    size="sm"
                    className="gap-2"
                    onClick={() => handleSubViewChange(sv.key)}
                  >
                    <Icon className="w-4 h-4" />
                    {sv.label}
                  </Button>
                );
              })}
            </div>

            {/* Sub-view content */}
            {subView === 'search_subscriber' && (
              <SubscriberSearch department={dept.key} />
            )}
            {subView === 'search_agent' && <AgentSearch department={dept.key} />}
            {subView === 'cases_list' && <CasesList department={dept.key} />}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  SUB-VIEW 1: SUBSCRIBER SEARCH
// ═══════════════════════════════════════════════════════════════════════════════
function SubscriberSearch({ department }) {
  const navigate = useNavigate();
  const [searchField, setSearchField] = useState('name');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const { data: customers = [], isLoading: loadingCustomers } = useQuery({
    queryKey: queryKeys.customers.all(),
    queryFn: () => base44.entities.Customer.list(),
  });

  const { data: allCases = [] } = useQuery({
    queryKey: queryKeys.cases.all(),
    queryFn: () => base44.entities.Case.list('-created_date', 50000),
  });

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return customers.filter((c) => {
      switch (searchField) {
        case 'name':
          return c.name?.toLowerCase().includes(q);
        case 'id_number':
          return c.id_number?.includes(searchQuery);
        case 'vehicle_number':
          return c.vehicle_number?.includes(searchQuery);
        case 'phone':
          return c.phone?.includes(searchQuery);
        case 'package_name':
          return c.package_name?.toLowerCase().includes(q);
        case 'vip':
          return c.is_vip === true;
        default:
          return false;
      }
    });
  }, [customers, searchQuery, searchField]);

  const subscriberColumns = [
    { header: 'סוג מנוי', accessor: 'customer_type', cell: (row) => row.customer_type || '—' },
    { header: 'שם חבילה', accessor: 'package_name', cell: (row) => row.package_name || '—' },
    { header: 'קוד חבילה', accessor: 'package_code', cell: (row) => row.package_code || '—' },
    {
      header: 'VIP',
      accessor: 'is_vip',
      cell: (row) =>
        row.is_vip ? (
          <Badge className="bg-amber-100 text-amber-800">VIP</Badge>
        ) : (
          '—'
        ),
    },
    { header: 'שם לקוח', accessor: 'name' },
    { header: 'כתובת', accessor: 'address', cell: (row) => row.address || '—' },
    { header: 'ת.ז.', accessor: 'id_number', cell: (row) => row.id_number || '—' },
    { header: "מס' רכב", accessor: 'vehicle_number', cell: (row) => row.vehicle_number || '—' },
    { header: 'טלפון', accessor: 'phone', cell: (row) => row.phone || '—' },
    {
      header: 'שם סוכן ביטוח',
      accessor: 'insurance_agent_name',
      cell: (row) => row.insurance_agent_name || '—',
    },
  ];

  // Cases for the selected customer filtered by department
  const customerCases = useMemo(() => {
    if (!selectedCustomer) return [];
    return allCases.filter(
      (c) =>
        (c.customer_id === selectedCustomer.id ||
          c.customer_name === selectedCustomer.name) &&
        c.department === department
    );
  }, [allCases, selectedCustomer, department]);

  if (selectedCustomer) {
    return (
      <CustomerDetailView
        customer={selectedCustomer}
        cases={customerCases}
        department={department}
        onBack={() => setSelectedCustomer(null)}
      />
    );
  }

  return (
    <div className="space-y-4 rtl-flip">
      {/* Search Form */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 flex-row-reverse">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="הקלד לחיפוש..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="ps-9 text-right"
                dir={searchField === 'phone' || searchField === 'id_number' || searchField === 'vehicle_number' ? 'ltr' : 'rtl'}
              />
            </div>
            <Select value={searchField} onValueChange={setSearchField}>
              <SelectTrigger className="w-[180px] text-right">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">שם לקוח</SelectItem>
                <SelectItem value="id_number">ת.ז.</SelectItem>
                <SelectItem value="vehicle_number">מספר רכב</SelectItem>
                <SelectItem value="phone">טלפון</SelectItem>
                <SelectItem value="package_name">שם חבילה</SelectItem>
                <SelectItem value="vip">VIP</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {searchQuery.trim() && (
        <DataTable
          columns={subscriberColumns}
          data={filtered}
          isLoading={loadingCustomers}
          onRowClick={(row) => setSelectedCustomer(row)}
          emptyMessage="לא נמצאו מנויים תואמים"
        />
      )}
    </div>
  );
}

// ─── Customer Detail View (shown after clicking a subscriber row) ───────────
function CustomerDetailView({ customer, cases, department, onBack }) {
  const navigate = useNavigate();
  const [showHistory, setShowHistory] = useState(true);
  const [showVehicleHistory, setShowVehicleHistory] = useState(false);

  const callHistoryColumns = [
    {
      header: 'תאריך אירוע',
      accessor: 'created_date',
      cell: (row) => formatDate(row.created_date),
    },
    { header: 'סוג השירות', accessor: 'service_type', cell: (row) => row.service_type || '—' },
    {
      header: 'תאריך סגירה',
      accessor: 'closed_date',
      cell: (row) => formatDate(row.closed_date),
    },
    { header: 'מספר מנוי', accessor: 'subscriber_number', cell: (row) => row.subscriber_number || '—' },
    { header: 'תיאור אירוע', accessor: 'problem_description', cell: (row) => row.problem_description || '—' },
    { header: 'תשלום תביעה', accessor: 'claim_payment', cell: (row) => row.claim_payment || '—' },
    { header: 'מוקדן', accessor: 'operator_name', cell: (row) => row.operator_name || '—' },
  ];

  const vehicleHistoryColumns = [
    { header: 'תאריכים', accessor: 'created_date', cell: (row) => formatDate(row.created_date) },
    { header: 'מספר מנוי', accessor: 'subscriber_number', cell: (row) => row.subscriber_number || '—' },
    { header: 'בעל הרכב', accessor: 'customer_name', cell: (row) => row.customer_name || '—' },
    { header: 'סוג חבילה', accessor: 'package_name', cell: (row) => row.package_name || '—' },
    { header: 'פעולה', accessor: 'service_type', cell: (row) => row.service_type || '—' },
  ];

  return (
    <div className="space-y-4 rtl-flip">
      <Button variant="ghost" size="sm" className="gap-2 flex-row-reverse" onClick={onBack}>
        <ArrowRight className="w-4 h-4" />
        חזרה לרשימה
      </Button>

      {/* Subscriber Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2 justify-end text-right">
            {customer.is_vip && (
              <Badge className="bg-amber-100 text-amber-800">VIP</Badge>
            )}
            <span>— {customer.name} פרטי מנוי</span>
            <Users className="w-5 h-5 text-[#212121]" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-right">
            {/* Subscription Validity */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-[#424242] border-b pb-1">תוקף מנוי</h4>
              <InfoRow label="מתאריך" value={formatDate(customer.subscription_start_date)} />
              <InfoRow label="עד תאריך" value={formatDate(customer.subscription_end_date)} />
              <InfoRow label="תאריך הפקה" value={formatDate(customer.issue_date)} />
              <InfoRow label="רצף מנויים" value={customer.subscription_sequence} />
              <InfoRow label="התראות" value={customer.alerts} />
              <InfoRow label="סטטוס מנוי" value={customer.subscription_status || customer.status} />
              <InfoRow label="מצב מנוי" value={customer.subscription_state} />
              <InfoRow label="תאריך תשלום" value={formatDate(customer.payment_date)} />
              <InfoRow label="אופן תשלום" value={customer.payment_method} />
            </div>

            {/* Agent */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-[#424242] border-b pb-1">סוכן</h4>
              <InfoRow label="שם" value={customer.insurance_agent_name} />
              <InfoRow label="מס סוכן" value={customer.insurance_agent_number} />
              <InfoRow label="סטטוס" value={customer.insurance_agent_status} />

              <h4 className="text-sm font-semibold text-[#424242] border-b pb-1 mt-4">רכב</h4>
              <InfoRow label="סוג רכב" value={customer.vehicle_type} />
              <InfoRow label="סוג דגם" value={customer.vehicle_model} />
              <InfoRow label="שנת ייצור" value={customer.vehicle_year} />
              <InfoRow label="קוד דגם" value={customer.vehicle_model_code} />
              <InfoRow label="מספר רכב" value={customer.vehicle_number} />
              <InfoRow label="רכב יבוא אישי" value={customer.is_personal_import ? 'כן' : 'לא'} />
              <InfoRow label="תוקף רישיון רכב" value={formatDate(customer.license_expiry)} />
            </div>

            {/* Coverage */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-[#424242] border-b pb-1">כיסוי</h4>
              <InfoRow label="שם חבילה" value={customer.package_name} />
              <InfoRow label="פירוט כיסוי" value={customer.coverage_details} />
              <InfoRow label="חוזה סוכן" value={customer.agent_contract} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Call History */}
      <Card>
        <CardHeader
           className="pb-3 cursor-pointer hover:bg-gray-50 transition-colors"
           onClick={() => setShowHistory(!showHistory)}
         >
           <CardTitle className="text-base flex items-center justify-between text-right">
             {showHistory ? (
               <ChevronUp className="w-4 h-4 text-gray-500" />
             ) : (
               <ChevronDown className="w-4 h-4 text-gray-500" />
             )}
             <span>היסטוריית קריאות ({cases.length})</span>
           </CardTitle>
         </CardHeader>
        {showHistory && (
          <CardContent>
            <DataTable
              columns={callHistoryColumns}
              data={cases}
              onRowClick={(row) =>
                navigate(createPageUrl(`CallDetails?id=${row.id}`))
              }
              emptyMessage="אין קריאות במחלקה זו"
            />
          </CardContent>
        )}
      </Card>

      {/* Vehicle History */}
      <Card>
        <CardHeader
           className="pb-3 cursor-pointer hover:bg-gray-50 transition-colors"
           onClick={() => setShowVehicleHistory(!showVehicleHistory)}
         >
           <CardTitle className="text-base flex items-center justify-between text-right">
             {showVehicleHistory ? (
               <ChevronUp className="w-4 h-4 text-gray-500" />
             ) : (
               <ChevronDown className="w-4 h-4 text-gray-500" />
             )}
             <span>היסטוריית רכב</span>
           </CardTitle>
         </CardHeader>
        {showVehicleHistory && (
          <CardContent>
            <DataTable
              columns={vehicleHistoryColumns}
              data={cases}
              emptyMessage="אין היסטוריית רכב"
            />
          </CardContent>
        )}
      </Card>

      {/* Action Buttons */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-3 flex-wrap justify-end flex-row-reverse">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                navigate(
                  createPageUrl(
                    `SpecialCaseForm?customer_id=${customer.id}&department=${department}&type=paid_call`
                  )
                )
              }
            >
              קריאה בתשלום
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                navigate(
                  createPageUrl(
                    `SpecialCaseForm?customer_id=${customer.id}&department=${department}&type=accident`
                  )
                )
              }
            >
              תאונה
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                navigate(
                  createPageUrl(
                    `SpecialCaseForm?customer_id=${customer.id}&department=${department}&type=mechanical`
                  )
                )
              }
            >
              תקלה מכאנית
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                navigate(
                  createPageUrl(
                    `PrivateService?department=${department}&customer_id=${customer.id}`
                  )
                )
              }
            >
              חישוב/השוואה
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  SUB-VIEW 2: AGENT / VENDOR SEARCH
// ═══════════════════════════════════════════════════════════════════════════════
function AgentSearch({ department }) {
  const [searchField, setSearchField] = useState('name');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVendor, setSelectedVendor] = useState(null);

  const { data: vendors = [], isLoading } = useQuery({
    queryKey: queryKeys.vendors.all(),
    queryFn: () => base44.entities.Vendor.list(),
  });

  const vendorTypes = DEPARTMENT_VENDOR_TYPES[department] || [];

  const departmentVendors = useMemo(() => {
    return vendors.filter((v) => {
      const types = Array.isArray(v.service_type) ? v.service_type : [v.service_type];
      return types.some((t) => vendorTypes.includes(t));
    });
  }, [vendors, vendorTypes]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return departmentVendors;
    const q = searchQuery.toLowerCase();
    return departmentVendors.filter((v) => {
      switch (searchField) {
        case 'name':
          return (
            v.vendor_name?.toLowerCase().includes(q) ||
            v.name?.toLowerCase().includes(q) ||
            v.contact_person?.toLowerCase().includes(q)
          );
        case 'vendor_number':
          return v.vendor_number?.includes(searchQuery) || v.company_id?.includes(searchQuery);
        case 'status':
          return v.availability_status?.toLowerCase().includes(q);
        case 'area':
          return (
            v.city?.toLowerCase().includes(q) ||
            (Array.isArray(v.coverage_areas) &&
              v.coverage_areas.some(
                (a) =>
                  a?.toLowerCase().includes(q) ||
                  coverageLabels[a]?.toLowerCase().includes(q)
              ))
          );
        default:
          return true;
      }
    });
  }, [departmentVendors, searchQuery, searchField]);

  const vendorColumns = [
    {
      header: 'שם סוכן',
      accessor: 'vendor_name',
      cell: (row) => row.vendor_name || row.name || '—',
    },
    { header: 'מס סוכן', accessor: 'company_id', cell: (row) => row.company_id || '—' },
    {
      header: 'סטטוס',
      accessor: 'availability_status',
      cell: (row) => {
        const statusMap = {
          available: 'זמין',
          busy: 'עסוק',
          offline: 'לא מחובר',
          on_break: 'בהפסקה',
        };
        const colorMap = {
          available: 'bg-green-100 text-green-700',
          busy: 'bg-red-100 text-red-700',
          offline: 'bg-gray-100 text-gray-500',
          on_break: 'bg-yellow-100 text-yellow-700',
        };
        return (
          <Badge className={colorMap[row.availability_status] || 'bg-gray-100 text-gray-600'}>
            {statusMap[row.availability_status] || row.availability_status || '—'}
          </Badge>
        );
      },
    },
    { header: 'טלפון', accessor: 'phone', cell: (row) => row.phone || '—' },
    { header: 'עיר', accessor: 'city', cell: (row) => row.city || '—' },
    {
      header: 'אזורי כיסוי',
      accessor: 'coverage_areas',
      cell: (row) => {
        const areas = Array.isArray(row.coverage_areas) ? row.coverage_areas : [];
        return areas.map((a) => coverageLabels[a] || a).join(', ') || '—';
      },
    },
  ];

  if (selectedVendor) {
    return (
      <VendorDetailView vendor={selectedVendor} onBack={() => setSelectedVendor(null)} />
    );
  }

  return (
    <div className="space-y-4 rtl-flip">
      {/* Search Form */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 flex-row-reverse">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="הקלד לחיפוש..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="ps-9 text-right"
              />
            </div>
            <Select value={searchField} onValueChange={setSearchField}>
              <SelectTrigger className="w-[160px] text-right">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">שם סוכן</SelectItem>
                <SelectItem value="vendor_number">מס סוכן</SelectItem>
                <SelectItem value="status">סטטוס</SelectItem>
                <SelectItem value="area">אזור</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <DataTable
        columns={vendorColumns}
        data={filtered}
        isLoading={isLoading}
        onRowClick={(row) => setSelectedVendor(row)}
        emptyMessage="לא נמצאו ספקים תואמים במחלקה זו"
      />
    </div>
  );
}

// ─── Vendor Detail View ─────────────────────────────────────────────────────
function VendorDetailView({ vendor, onBack }) {
  return (
    <div className="space-y-4 rtl-flip">
      <Button variant="ghost" size="sm" className="gap-2 flex-row-reverse" onClick={onBack}>
        <ArrowRight className="w-4 h-4" />
        חזרה לרשימה
      </Button>

      {/* Vendor Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2 justify-end text-right">
            <span>{vendor.vendor_name || vendor.name} — פרטי הסוכן</span>
            <UserSearch className="w-5 h-5 text-[#212121]" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-right">
            {/* Basic Info */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-[#424242] border-b pb-1">פרטי הסוכן</h4>
              <InfoRow label="שם" value={vendor.vendor_name || vendor.name} />
              <InfoRow label="מס סוכן" value={vendor.company_id} />
              <InfoRow label="סטטוס" value={vendor.availability_status} />
              <InfoRow label="ח.פ./ת.ז." value={vendor.company_id} />
              <InfoRow label="טלפון 1" value={vendor.phone} icon={<Phone className="w-3 h-3" />} />
              <InfoRow label="טלפון 2" value={vendor.phone_2} icon={<Phone className="w-3 h-3" />} />
              <InfoRow label="פקס" value={vendor.fax} />
              <InfoRow label="כתובת" value={vendor.address} icon={<MapPin className="w-3 h-3" />} />
              <InfoRow
                label="שעות פעילות"
                value={
                  vendor.works_24_7
                    ? '24/7'
                    : `${vendor.working_hours_start || ''} - ${vendor.working_hours_end || ''}`
                }
                icon={<Clock className="w-3 h-3" />}
              />
              <InfoRow label='דוא"ל' value={vendor.email} icon={<Mail className="w-3 h-3" />} />
            </div>

            {/* Inspector & Handler */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-[#424242] border-b pb-1">מפקחה</h4>
              <InfoRow label="שם" value={vendor.inspector_name} />
              <InfoRow label="טלפון" value={vendor.inspector_phone} />
              <InfoRow label="פקס" value={vendor.inspector_fax} />

              <h4 className="text-sm font-semibold text-[#424242] border-b pb-1 mt-4">מטפל</h4>
              <InfoRow label="שם" value={vendor.handler_name} />
              <InfoRow label="טלפון" value={vendor.handler_phone} />
              <InfoRow label="פקס" value={vendor.handler_fax} />
            </div>

            {/* Contracts & Notes */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-[#424242] border-b pb-1">
                חוזים מול המחלקות
              </h4>
              <InfoRow label="סוג שירות" value={
                Array.isArray(vendor.service_type)
                  ? vendor.service_type.join(', ')
                  : vendor.service_type
              } />
              <InfoRow label="תעריף לקריאה" value={vendor.payment_rate_per_call ? `₪${vendor.payment_rate_per_call}` : null} />
              <InfoRow label="תעריף בסיס" value={vendor.base_rate ? `₪${vendor.base_rate}` : null} />
              <InfoRow
                label="אזורי כיסוי"
                value={
                  Array.isArray(vendor.coverage_areas)
                    ? vendor.coverage_areas.map((a) => coverageLabels[a] || a).join(', ')
                    : null
                }
              />

              <h4 className="text-sm font-semibold text-[#424242] border-b pb-1 mt-4">הערות</h4>
              <p className="text-sm text-[#616161]">{vendor.notes || 'אין הערות'}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  SUB-VIEW 3: CASES LIST
// ═══════════════════════════════════════════════════════════════════════════════
function CasesList({ department }) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [vendorFilter, setVendorFilter] = useState('all');
  const [areaFilter, setAreaFilter] = useState('all');
  const [vipOnly, setVipOnly] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data: allCases = [], isLoading } = useQuery({
    queryKey: queryKeys.cases.all(),
    queryFn: () => base44.entities.Case.list('-created_date', 50000),
  });

  const { data: vendors = [] } = useQuery({
    queryKey: queryKeys.vendors.all(),
    queryFn: () => base44.entities.Vendor.list(),
  });

  const departmentCases = useMemo(() => {
    return allCases.filter((c) => c.department === department);
  }, [allCases, department]);

  const filtered = useMemo(() => {
    return departmentCases.filter((c) => {
      // Search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesSearch =
          c.case_number?.toLowerCase().includes(q) ||
          c.customer_name?.toLowerCase().includes(q) ||
          c.vehicle_number?.includes(searchQuery) ||
          c.caller_phone?.includes(searchQuery);
        if (!matchesSearch) return false;
      }
      // Status
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      // Vendor
      if (vendorFilter !== 'all' && c.assigned_vendor_id !== vendorFilter) return false;
      // Area
      if (areaFilter !== 'all' && c.service_area !== areaFilter) return false;
      // VIP
      if (vipOnly && !c.is_vip) return false;
      // Date range
      if (dateFrom) {
        const caseDate = new Date(c.created_date);
        if (caseDate < new Date(dateFrom)) return false;
      }
      if (dateTo) {
        const caseDate = new Date(c.created_date);
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        if (caseDate > toDate) return false;
      }
      return true;
    });
  }, [departmentCases, searchQuery, statusFilter, vendorFilter, areaFilter, vipOnly, dateFrom, dateTo]);

  // Unique vendors from department cases for filter dropdown
  const caseVendors = useMemo(() => {
    const vendorIds = [...new Set(departmentCases.map((c) => c.assigned_vendor_id).filter(Boolean))];
    return vendors.filter((v) => vendorIds.includes(v.id));
  }, [departmentCases, vendors]);

  const casesColumns = [
    {
      header: 'עבר בקרה',
      accessor: 'passed_qa',
      cell: (row) =>
        row.passed_qa ? (
          <Badge className="bg-green-100 text-green-700">כן</Badge>
        ) : (
          <Badge className="bg-gray-100 text-gray-600">לא</Badge>
        ),
    },
    {
      header: 'אחר לביצוע',
      accessor: 'returned_to_agent',
      cell: (row) =>
        row.returned_to_agent ? (
          <Badge className="bg-orange-100 text-orange-700">כן</Badge>
        ) : (
          '—'
        ),
    },
    {
      header: 'זמן המתנה',
      accessor: 'waiting_time_minutes',
      cell: (row) => (row.waiting_time_minutes ? `${row.waiting_time_minutes} דק'` : '—'),
    },
    {
      header: 'סטטוס קריאה',
      accessor: 'status',
      cell: (row) => (
        <Badge
          className={
            STATUS_COLORS_INLINE[row.status] ||
            statusColors[row.status] ||
            'bg-gray-100 text-gray-600'
          }
        >
          {statusLabels[row.status] || row.status || '—'}
        </Badge>
      ),
    },
    {
      header: 'VIP',
      accessor: 'is_vip',
      cell: (row) =>
        row.is_vip ? (
          <Badge className="bg-amber-100 text-amber-800">VIP</Badge>
        ) : (
          '—'
        ),
    },
    { header: "מס' רכב", accessor: 'vehicle_number', cell: (row) => row.vehicle_number || '—' },
    {
      header: 'קוד דגם',
      accessor: 'vehicle_model_code',
      cell: (row) => row.vehicle_model_code || '—',
    },
    {
      header: 'ספק שירות',
      accessor: 'assigned_provider_name',
      cell: (row) => row.assigned_provider_name || row.vendor_name || '—',
    },
    {
      header: 'יעד העמסה',
      accessor: 'location_address',
      cell: (row) => row.location_address || row.service_address || '—',
    },
    {
      header: 'יעד פריקה',
      accessor: 'destination_address',
      cell: (row) => row.destination_address || '—',
    },
    {
      header: 'תיאור תקלה',
      accessor: 'problem_description',
      cell: (row) => (
        <span className="max-w-[200px] truncate block">
          {row.problem_description || '—'}
        </span>
      ),
    },
  ];

  const handleRowDoubleClick = (row) => {
    navigate(createPageUrl(`CallDetails?id=${row.id}`));
  };

  return (
    <div className="space-y-4 rtl-flip">
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            {/* Row 1: Search + Status + Vendor */}
            <div className="flex flex-col md:flex-row gap-3 flex-row-reverse">
              <Select value={vendorFilter} onValueChange={setVendorFilter}>
                <SelectTrigger className="w-[160px] text-right">
                  <SelectValue placeholder="ספק" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל הספקים</SelectItem>
                  {caseVendors.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.vendor_name || v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px] text-right">
                  <SelectValue placeholder="סטטוס" />
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
              <div className="relative flex-1">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="חיפוש לפי מספר קריאה, שם, רכב, טלפון..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="ps-9 text-right"
                />
              </div>
            </div>

            {/* Row 2: Area + VIP + Date Range */}
            <div className="flex flex-col md:flex-row gap-3 items-end flex-row-reverse">
              <Select value={areaFilter} onValueChange={setAreaFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="אזור" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל האזורים</SelectItem>
                  {coverageAreas.map((area) => (
                    <SelectItem key={area.key} value={area.key}>
                      {area.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant={vipOnly ? 'default' : 'outline'}
                size="sm"
                onClick={() => setVipOnly(!vipOnly)}
                className="gap-1"
              >
                VIP בלבד
              </Button>
              <div className="flex items-center gap-2">
                <Label className="text-sm whitespace-nowrap">מתאריך</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-[150px]"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm whitespace-nowrap">עד תאריך</Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-[150px]"
                />
              </div>
              {(searchQuery || statusFilter !== 'all' || vendorFilter !== 'all' || areaFilter !== 'all' || vipOnly || dateFrom || dateTo) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                    setVendorFilter('all');
                    setAreaFilter('all');
                    setVipOnly(false);
                    setDateFrom('');
                    setDateTo('');
                  }}
                  className="gap-1 text-gray-500"
                >
                  <X className="w-3 h-3" />
                  נקה סינון
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats bar */}
      <div className="flex gap-4 text-sm text-[#616161]">
        <span>
          סה&quot;כ: <strong>{filtered.length}</strong> פניות
        </span>
        <span>
          (מתוך {departmentCases.length} במחלקה)
        </span>
      </div>

      {/* Table */}
      <DataTable
        columns={casesColumns}
        data={filtered}
        isLoading={isLoading}
        onRowClick={handleRowDoubleClick}
        rowColorField="status"
        emptyMessage="לא נמצאו פניות במחלקה זו"
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  SHARED COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════
function InfoRow({ label, value, icon }) {
  return (
    <div className="flex items-start gap-2 text-sm">
      {icon && <span className="text-gray-400 mt-0.5">{icon}</span>}
      <span className="text-[#757575] min-w-[100px]">{label}:</span>
      <span className="text-[#212121]">{value || '—'}</span>
    </div>
  );
}