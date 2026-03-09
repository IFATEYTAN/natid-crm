import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { motion } from 'framer-motion';
import { base44 } from '@/lib/api';
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import ExportMenu from '@/components/ui/ExportMenu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Search, Phone, Building2, Edit, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { PageTransition } from '@/components/animations/AnimatedComponents';

const customerTypeLabels = {
  insurance_company: 'חברת ביטוח',
  fleet: 'צי רכב',
  individual: 'פרטי',
  garage: 'מוסך',
  other: 'אחר',
};

const contractTypeLabels = {
  monthly: 'חודשי',
  yearly: 'שנתי',
  per_case: 'לפי קריאה',
  none: 'ללא',
};

export default function Customers() {
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    customer_type: 'individual',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    contract_type: 'none',
    sla_response_minutes: 30,
    sla_arrival_minutes: 60,
    status: 'active',
    notes: '',
    monthly_budget: '',
    subscription_sequence: '',
    subscription_start_date: '',
    subscription_end_date: '',
    subscription_issue_date: '',
    subscription_status: '',
    payment_method: '',
    payment_date: '',
    alerts: '',
    vehicle_type: '',
    vehicle_model: '',
    vehicle_year: '',
    vehicle_model_code: '',
    vehicle_number: '',
    vehicle_personal_import: false,
    vehicle_license_expiry: '',
    agent_contract: '',
    coverage_details: '',
  });

  const queryClient = useQueryClient();

  const { data: customers = [], isLoading } = useQuery({
    queryKey: queryKeys.customers.all(),
    queryFn: () => base44.entities.Customer.list('-created_date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Customer.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all() });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Customer.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all() });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Customer.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all() });
    },
  });

  const resetForm = () => {
    setIsDialogOpen(false);
    setEditingCustomer(null);
    setFormData({
      name: '',
      customer_type: 'individual',
      contact_person: '',
      phone: '',
      email: '',
      address: '',
      city: '',
      contract_type: 'none',
      sla_response_minutes: 30,
      sla_arrival_minutes: 60,
      status: 'active',
      notes: '',
      monthly_budget: '',
      subscription_sequence: '',
      subscription_start_date: '',
      subscription_end_date: '',
      subscription_issue_date: '',
      subscription_status: '',
      payment_method: '',
      payment_date: '',
      alerts: '',
      vehicle_type: '',
      vehicle_model: '',
      vehicle_year: '',
      vehicle_model_code: '',
      vehicle_number: '',
      vehicle_personal_import: false,
      vehicle_license_expiry: '',
      agent_contract: '',
      coverage_details: '',
    });
  };

  const handleEdit = (customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name || '',
      customer_type: customer.customer_type || 'individual',
      contact_person: customer.contact_person || '',
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || '',
      city: customer.city || '',
      contract_type: customer.contract_type || 'none',
      sla_response_minutes: customer.sla_response_minutes || 30,
      sla_arrival_minutes: customer.sla_arrival_minutes || 60,
      status: customer.status || 'active',
      notes: customer.notes || '',
      monthly_budget: customer.monthly_budget || '',
      subscription_sequence: customer.subscription_sequence || '',
      subscription_start_date: customer.subscription_start_date || '',
      subscription_end_date: customer.subscription_end_date || '',
      subscription_issue_date: customer.subscription_issue_date || '',
      subscription_status: customer.subscription_status || '',
      payment_method: customer.payment_method || '',
      payment_date: customer.payment_date || '',
      alerts: customer.alerts || '',
      vehicle_type: customer.vehicle_type || '',
      vehicle_model: customer.vehicle_model || '',
      vehicle_year: customer.vehicle_year || '',
      vehicle_model_code: customer.vehicle_model_code || '',
      vehicle_number: customer.vehicle_number || '',
      vehicle_personal_import: customer.vehicle_personal_import || false,
      vehicle_license_expiry: customer.vehicle_license_expiry || '',
      agent_contract: customer.agent_contract || '',
      coverage_details: customer.coverage_details || '',
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      monthly_budget: formData.monthly_budget ? Number(formData.monthly_budget) : null,
      subscription_sequence: formData.subscription_sequence
        ? Number(formData.subscription_sequence)
        : null,
      vehicle_year: formData.vehicle_year ? Number(formData.vehicle_year) : null,
    };

    if (editingCustomer) {
      updateMutation.mutate({ id: editingCustomer.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const filteredCustomers = customers.filter(
    (c) =>
      !search ||
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search) ||
      c.contact_person?.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    {
      header: 'שם לקוח',
      accessor: 'name',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary-soft-100 flex items-center justify-center">
            <Building2 className="w-4 h-4 text-primary-soft-600" />
          </div>
          <span className="font-medium text-neutral-soft-900">{row.name}</span>
        </div>
      ),
    },
    {
      header: 'סוג',
      accessor: 'customer_type',
      cell: (row) => customerTypeLabels[row.customer_type] || row.customer_type,
    },
    {
      header: 'איש קשר',
      accessor: 'contact_person',
    },
    {
      header: 'טלפון',
      accessor: 'phone',
      cell: (row) => (
        <span className="flex items-center gap-1 text-neutral-soft-600">
          <Phone className="w-3 h-3" />
          {row.phone}
        </span>
      ),
    },
    {
      header: 'חוזה',
      accessor: 'contract_type',
      cell: (row) => contractTypeLabels[row.contract_type] || '-',
    },
    {
      header: 'סטטוס',
      accessor: 'status',
      cell: (row) => <StatusBadge status={row.status || 'active'} size="sm" />,
    },
    {
      header: 'פעולות',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Link to={createPageUrl(`CustomerDetails?id=${row.id}`)}>
            <Button variant="ghost" size="icon" title="צפה בפרטים ואינטראקציות" aria-label="צפה">
              <Building2 className="w-4 h-4 text-primary-soft-600" />
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(row);
            }}
            title="ערוך"
            aria-label="עריכה"
          >
            <Edit className="w-4 h-4 text-neutral-soft-600" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              if (confirm('האם למחוק את הלקוח?')) {
                deleteMutation.mutate(row.id);
              }
            }}
            title="מחק"
            aria-label="מחיקה"
          >
            <Trash2 className="w-4 h-4 text-error-soft-600" />
          </Button>
        </div>
      ),
    },
  ];

  // Export columns
  const exportColumns = [
    { header: 'שם לקוח', accessor: 'name' },
    { header: 'סוג', accessor: 'customer_type' },
    { header: 'איש קשר', accessor: 'contact_person' },
    { header: 'טלפון', accessor: 'phone' },
    { header: 'דוא"ל', accessor: 'email' },
    { header: 'עיר', accessor: 'city' },
    { header: 'חוזה', accessor: 'contract_type' },
    { header: 'סטטוס', accessor: 'status' },
  ];

  // Prepare export data with formatted values
  const exportData = filteredCustomers.map((customer) => ({
    ...customer,
    customer_type: customerTypeLabels[customer.customer_type] || customer.customer_type || '',
    contract_type: contractTypeLabels[customer.contract_type] || '',
    status:
      customer.status === 'active' ? 'פעיל' : customer.status === 'inactive' ? 'לא פעיל' : 'מושהה',
  }));

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div>
            <h1 className="heading-2 text-primary-soft-600">לקוחות</h1>
            <p className="text-secondary">{filteredCustomers.length} לקוחות</p>
          </div>
          <div className="flex gap-2">
            <ExportMenu
              data={exportData}
              columns={exportColumns}
              filename="customers"
              title="רשימת לקוחות"
              subtitle={`סה"כ ${filteredCustomers.length} לקוחות`}
            />
            <Button className="btn-primary" onClick={() => setIsDialogOpen(true)}>
              <Plus className="w-4 h-4" />
              לקוח חדש
            </Button>
          </div>
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="card-base card-body"
        >
          <div className="relative">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-soft-500" />
            <Input
              placeholder="חיפוש לפי שם, טלפון..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ps-10"
            />
          </div>
        </motion.div>

        {/* Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <DataTable
            columns={columns}
            data={filteredCustomers}
            isLoading={isLoading}
            emptyMessage="לא נמצאו לקוחות"
            emptyPreset="customers"
          />
        </motion.div>

        {/* Customer Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingCustomer ? 'עריכת לקוח' : 'לקוח חדש'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <Label htmlFor="customers-name" className="form-label">
                    שם לקוח *
                  </Label>
                  <Input
                    id="customers-name"
                    className="form-input"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <Label htmlFor="customers-customer-type" className="form-label">
                    סוג לקוח
                  </Label>
                  <Select
                    value={formData.customer_type}
                    onValueChange={(value) => setFormData({ ...formData, customer_type: value })}
                  >
                    <SelectTrigger id="customers-customer-type" className="form-input">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(customerTypeLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="form-group">
                  <Label htmlFor="customers-contact-person" className="form-label">
                    איש קשר
                  </Label>
                  <Input
                    id="customers-contact-person"
                    className="form-input"
                    value={formData.contact_person}
                    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <Label htmlFor="customers-phone" className="form-label">
                    טלפון *
                  </Label>
                  <Input
                    id="customers-phone"
                    className="form-input"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <Label htmlFor="customers-email" className="form-label">
                    דוא"ל
                  </Label>
                  <Input
                    id="customers-email"
                    className="form-input"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <Label htmlFor="customers-city" className="form-label">
                    עיר
                  </Label>
                  <Input
                    id="customers-city"
                    className="form-input"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                </div>
                <div className="col-span-2 form-group">
                  <Label htmlFor="customers-address" className="form-label">
                    כתובת
                  </Label>
                  <Input
                    id="customers-address"
                    className="form-input"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <Label htmlFor="customers-contract-type" className="form-label">
                    סוג חוזה
                  </Label>
                  <Select
                    value={formData.contract_type}
                    onValueChange={(value) => setFormData({ ...formData, contract_type: value })}
                  >
                    <SelectTrigger id="customers-contract-type" className="form-input">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(contractTypeLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="form-group">
                  <Label htmlFor="customers-status" className="form-label">
                    סטטוס
                  </Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger id="customers-status" className="form-input">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">פעיל</SelectItem>
                      <SelectItem value="inactive">לא פעיל</SelectItem>
                      <SelectItem value="suspended">מושהה</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="form-group">
                  <Label htmlFor="customers-sla-response" className="form-label">
                    SLA תגובה (דקות)
                  </Label>
                  <Input
                    id="customers-sla-response"
                    className="form-input"
                    type="number"
                    value={formData.sla_response_minutes}
                    onChange={(e) =>
                      setFormData({ ...formData, sla_response_minutes: Number(e.target.value) })
                    }
                  />
                </div>
                <div className="form-group">
                  <Label htmlFor="customers-sla-arrival" className="form-label">
                    SLA הגעה (דקות)
                  </Label>
                  <Input
                    id="customers-sla-arrival"
                    className="form-input"
                    type="number"
                    value={formData.sla_arrival_minutes}
                    onChange={(e) =>
                      setFormData({ ...formData, sla_arrival_minutes: Number(e.target.value) })
                    }
                  />
                </div>
                <div className="col-span-2 form-group">
                  <Label htmlFor="customers-notes" className="form-label">
                    הערות
                  </Label>
                  <Textarea
                    id="customers-notes"
                    className="form-input"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>

              {/* Subscription Section */}
              <div className="border-t pt-4">
                <h3 className="text-sm font-semibold text-neutral-soft-700 mb-3">תוקף מנוי</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group">
                    <Label htmlFor="customers-subscription-sequence" className="form-label">
                      רצף מנויים
                    </Label>
                    <Input
                      id="customers-subscription-sequence"
                      className="form-input"
                      type="number"
                      value={formData.subscription_sequence}
                      onChange={(e) =>
                        setFormData({ ...formData, subscription_sequence: e.target.value })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <Label htmlFor="customers-subscription-status" className="form-label">
                      מצב מנוי
                    </Label>
                    <Select
                      value={formData.subscription_status}
                      onValueChange={(value) =>
                        setFormData({ ...formData, subscription_status: value })
                      }
                    >
                      <SelectTrigger id="customers-subscription-status" className="form-input">
                        <SelectValue placeholder="בחר מצב" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">פעיל</SelectItem>
                        <SelectItem value="suspended">מושהה</SelectItem>
                        <SelectItem value="cancelled">מבוטל</SelectItem>
                        <SelectItem value="expired">פג תוקף</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="form-group">
                    <Label htmlFor="customers-subscription-start" className="form-label">
                      תוקף מנוי מתאריך
                    </Label>
                    <Input
                      id="customers-subscription-start"
                      className="form-input"
                      type="date"
                      value={formData.subscription_start_date}
                      onChange={(e) =>
                        setFormData({ ...formData, subscription_start_date: e.target.value })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <Label htmlFor="customers-subscription-end" className="form-label">
                      תוקף מנוי עד תאריך
                    </Label>
                    <Input
                      id="customers-subscription-end"
                      className="form-input"
                      type="date"
                      value={formData.subscription_end_date}
                      onChange={(e) =>
                        setFormData({ ...formData, subscription_end_date: e.target.value })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <Label htmlFor="customers-subscription-issue" className="form-label">
                      תאריך הפקה
                    </Label>
                    <Input
                      id="customers-subscription-issue"
                      className="form-input"
                      type="date"
                      value={formData.subscription_issue_date}
                      onChange={(e) =>
                        setFormData({ ...formData, subscription_issue_date: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Vehicle Section */}
              <div className="border-t pt-4">
                <h3 className="text-sm font-semibold text-neutral-soft-700 mb-3">פרטי רכב</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group">
                    <Label htmlFor="customers-vehicle-number" className="form-label">
                      מספר רכב
                    </Label>
                    <Input
                      id="customers-vehicle-number"
                      className="form-input"
                      value={formData.vehicle_number}
                      onChange={(e) =>
                        setFormData({ ...formData, vehicle_number: e.target.value })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <Label htmlFor="customers-vehicle-type" className="form-label">
                      סוג רכב
                    </Label>
                    <Select
                      value={formData.vehicle_type}
                      onValueChange={(value) =>
                        setFormData({ ...formData, vehicle_type: value })
                      }
                    >
                      <SelectTrigger id="customers-vehicle-type" className="form-input">
                        <SelectValue placeholder="בחר סוג" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="private">פרטי</SelectItem>
                        <SelectItem value="commercial_light">מסחרי קל</SelectItem>
                        <SelectItem value="commercial_heavy">מסחרי כבד</SelectItem>
                        <SelectItem value="motorcycle">אופנוע</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="form-group">
                    <Label htmlFor="customers-vehicle-model" className="form-label">
                      סוג דגם
                    </Label>
                    <Input
                      id="customers-vehicle-model"
                      className="form-input"
                      value={formData.vehicle_model}
                      onChange={(e) =>
                        setFormData({ ...formData, vehicle_model: e.target.value })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <Label htmlFor="customers-vehicle-model-code" className="form-label">
                      קוד דגם / שם רכב
                    </Label>
                    <Input
                      id="customers-vehicle-model-code"
                      className="form-input"
                      value={formData.vehicle_model_code}
                      onChange={(e) =>
                        setFormData({ ...formData, vehicle_model_code: e.target.value })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <Label htmlFor="customers-vehicle-year" className="form-label">
                      שנת ייצור
                    </Label>
                    <Input
                      id="customers-vehicle-year"
                      className="form-input"
                      type="number"
                      value={formData.vehicle_year}
                      onChange={(e) =>
                        setFormData({ ...formData, vehicle_year: e.target.value })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <Label htmlFor="customers-vehicle-license-expiry" className="form-label">
                      תוקף רישיון רכב
                    </Label>
                    <Input
                      id="customers-vehicle-license-expiry"
                      className="form-input"
                      type="date"
                      value={formData.vehicle_license_expiry}
                      onChange={(e) =>
                        setFormData({ ...formData, vehicle_license_expiry: e.target.value })
                      }
                    />
                  </div>
                  <div className="flex items-center gap-2 col-span-2">
                    <input
                      type="checkbox"
                      id="customers-vehicle-personal-import"
                      checked={formData.vehicle_personal_import}
                      onChange={(e) =>
                        setFormData({ ...formData, vehicle_personal_import: e.target.checked })
                      }
                      className="w-4 h-4"
                    />
                    <Label htmlFor="customers-vehicle-personal-import" className="cursor-pointer">
                      רכב יבוא אישי
                    </Label>
                  </div>
                </div>
              </div>

              {/* Coverage & Insurance Section */}
              <div className="border-t pt-4">
                <h3 className="text-sm font-semibold text-neutral-soft-700 mb-3">כיסוי וביטוח</h3>
                <div className="grid grid-cols-1 gap-4">
                  <div className="form-group">
                    <Label htmlFor="customers-coverage-details" className="form-label">
                      פירוט כיסוי
                    </Label>
                    <Textarea
                      id="customers-coverage-details"
                      className="form-input"
                      value={formData.coverage_details}
                      onChange={(e) =>
                        setFormData({ ...formData, coverage_details: e.target.value })
                      }
                      rows={3}
                    />
                  </div>
                  <div className="form-group">
                    <Label htmlFor="customers-agent-contract" className="form-label">
                      חוזה סוכן
                    </Label>
                    <Textarea
                      id="customers-agent-contract"
                      className="form-input"
                      value={formData.agent_contract}
                      onChange={(e) =>
                        setFormData({ ...formData, agent_contract: e.target.value })
                      }
                      rows={3}
                    />
                  </div>
                </div>
              </div>

              {/* Payment Section */}
              <div className="border-t pt-4">
                <h3 className="text-sm font-semibold text-neutral-soft-700 mb-3">תשלומים</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group">
                    <Label htmlFor="customers-payment-method" className="form-label">
                      אופן תשלום
                    </Label>
                    <Select
                      value={formData.payment_method}
                      onValueChange={(value) =>
                        setFormData({ ...formData, payment_method: value })
                      }
                    >
                      <SelectTrigger id="customers-payment-method" className="form-input">
                        <SelectValue placeholder="בחר אופן תשלום" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="credit_card">כרטיס אשראי</SelectItem>
                        <SelectItem value="bank_transfer">העברה בנקאית</SelectItem>
                        <SelectItem value="cash">מזומן</SelectItem>
                        <SelectItem value="check">שיק</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="form-group">
                    <Label htmlFor="customers-payment-date" className="form-label">
                      תאריך תשלום
                    </Label>
                    <Input
                      id="customers-payment-date"
                      className="form-input"
                      type="date"
                      value={formData.payment_date}
                      onChange={(e) =>
                        setFormData({ ...formData, payment_date: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Alerts Section */}
              <div className="border-t pt-4">
                <div className="form-group">
                  <Label htmlFor="customers-alerts" className="form-label">
                    התראות
                  </Label>
                  <Textarea
                    id="customers-alerts"
                    className="form-input"
                    value={formData.alerts}
                    onChange={(e) => setFormData({ ...formData, alerts: e.target.value })}
                    rows={2}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={resetForm}>
                  ביטול
                </Button>
                <Button
                  type="submit"
                  className="btn-primary"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {editingCustomer ? 'עדכון' : 'הוספה'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </PageTransition>
  );
}
