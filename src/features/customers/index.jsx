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
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      monthly_budget: formData.monthly_budget ? Number(formData.monthly_budget) : null,
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
            <Button variant="ghost" size="icon" title="צפה בפרטים ואינטראקציות">
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
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-soft-500" />
            <Input
              placeholder="חיפוש לפי שם, טלפון..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-10"
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
                  <Label className="form-label">שם לקוח *</Label>
                  <Input
                    className="form-input"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <Label className="form-label">סוג לקוח</Label>
                  <Select
                    value={formData.customer_type}
                    onValueChange={(value) => setFormData({ ...formData, customer_type: value })}
                  >
                    <SelectTrigger className="form-input">
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
                  <Label className="form-label">איש קשר</Label>
                  <Input
                    className="form-input"
                    value={formData.contact_person}
                    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <Label className="form-label">טלפון *</Label>
                  <Input
                    className="form-input"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <Label className="form-label">דוא"ל</Label>
                  <Input
                    className="form-input"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <Label className="form-label">עיר</Label>
                  <Input
                    className="form-input"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                </div>
                <div className="col-span-2 form-group">
                  <Label className="form-label">כתובת</Label>
                  <Input
                    className="form-input"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <Label className="form-label">סוג חוזה</Label>
                  <Select
                    value={formData.contract_type}
                    onValueChange={(value) => setFormData({ ...formData, contract_type: value })}
                  >
                    <SelectTrigger className="form-input">
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
                  <Label className="form-label">סטטוס</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger className="form-input">
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
                  <Label className="form-label">SLA תגובה (דקות)</Label>
                  <Input
                    className="form-input"
                    type="number"
                    value={formData.sla_response_minutes}
                    onChange={(e) =>
                      setFormData({ ...formData, sla_response_minutes: Number(e.target.value) })
                    }
                  />
                </div>
                <div className="form-group">
                  <Label className="form-label">SLA הגעה (דקות)</Label>
                  <Input
                    className="form-input"
                    type="number"
                    value={formData.sla_arrival_minutes}
                    onChange={(e) =>
                      setFormData({ ...formData, sla_arrival_minutes: Number(e.target.value) })
                    }
                  />
                </div>
                <div className="col-span-2 form-group">
                  <Label className="form-label">הערות</Label>
                  <Textarea
                    className="form-input"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
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
