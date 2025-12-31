import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Plus, 
  Search, 
  Phone,
  Mail,
  Building2,
  Edit,
  Trash2
} from 'lucide-react';

const customerTypeLabels = {
  insurance_company: 'חברת ביטוח',
  fleet: 'צי רכב',
  individual: 'פרטי',
  garage: 'מוסך',
  other: 'אחר'
};

const contractTypeLabels = {
  monthly: 'חודשי',
  yearly: 'שנתי',
  per_case: 'לפי קריאה',
  none: 'ללא'
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
    monthly_budget: ''
  });

  const queryClient = useQueryClient();

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.list('-created_date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Customer.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Customer.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Customer.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
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
      monthly_budget: ''
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
      monthly_budget: customer.monthly_budget || ''
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      monthly_budget: formData.monthly_budget ? Number(formData.monthly_budget) : null
    };
    
    if (editingCustomer) {
      updateMutation.mutate({ id: editingCustomer.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const filteredCustomers = customers.filter(c => 
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
          <div className="w-8 h-8 rounded-full bg-[#0D47A1]/10 flex items-center justify-center">
            <Building2 className="w-4 h-4 text-[#0D47A1]" />
          </div>
          <span className="font-medium text-[#212121]">{row.name}</span>
        </div>
      )
    },
    {
      header: 'סוג',
      accessor: 'customer_type',
      cell: (row) => customerTypeLabels[row.customer_type] || row.customer_type
    },
    {
      header: 'איש קשר',
      accessor: 'contact_person',
    },
    {
      header: 'טלפון',
      accessor: 'phone',
      cell: (row) => (
        <span className="flex items-center gap-1 text-[#616161]">
          <Phone className="w-3 h-3" />
          {row.phone}
        </span>
      )
    },
    {
      header: 'חוזה',
      accessor: 'contract_type',
      cell: (row) => contractTypeLabels[row.contract_type] || '-'
    },
    {
      header: 'סטטוס',
      accessor: 'status',
      cell: (row) => <StatusBadge status={row.status || 'active'} size="sm" />
    },
    {
      header: 'פעולות',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={(e) => { e.stopPropagation(); handleEdit(row); }}
          >
            <Edit className="w-4 h-4 text-[#616161]" />
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
          >
            <Trash2 className="w-4 h-4 text-[#D32F2F]" />
          </Button>
        </div>
      )
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#212121]">לקוחות</h2>
          <p className="text-[#616161] text-sm">{filteredCustomers.length} לקוחות</p>
        </div>
        <Button 
          className="bg-[#0D47A1] hover:bg-[#1565C0] gap-2"
          onClick={() => setIsDialogOpen(true)}
        >
          <Plus className="w-4 h-4" />
          לקוח חדש
        </Button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-[#E0E0E0] p-4">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9E9E9E]" />
          <Input
            placeholder="חיפוש לפי שם, טלפון..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10"
          />
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={filteredCustomers}
        isLoading={isLoading}
        emptyMessage="לא נמצאו לקוחות"
      />

      {/* Customer Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCustomer ? 'עריכת לקוח' : 'לקוח חדש'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>שם לקוח *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>סוג לקוח</Label>
                <Select
                  value={formData.customer_type}
                  onValueChange={(value) => setFormData({ ...formData, customer_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(customerTypeLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>איש קשר</Label>
                <Input
                  value={formData.contact_person}
                  onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                />
              </div>
              <div>
                <Label>טלפון *</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>דוא"ל</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div>
                <Label>עיר</Label>
                <Input
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <Label>כתובת</Label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
              <div>
                <Label>סוג חוזה</Label>
                <Select
                  value={formData.contract_type}
                  onValueChange={(value) => setFormData({ ...formData, contract_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(contractTypeLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>סטטוס</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">פעיל</SelectItem>
                    <SelectItem value="inactive">לא פעיל</SelectItem>
                    <SelectItem value="suspended">מושהה</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>SLA תגובה (דקות)</Label>
                <Input
                  type="number"
                  value={formData.sla_response_minutes}
                  onChange={(e) => setFormData({ ...formData, sla_response_minutes: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>SLA הגעה (דקות)</Label>
                <Input
                  type="number"
                  value={formData.sla_arrival_minutes}
                  onChange={(e) => setFormData({ ...formData, sla_arrival_minutes: Number(e.target.value) })}
                />
              </div>
              <div className="col-span-2">
                <Label>הערות</Label>
                <Textarea
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
                className="bg-[#0D47A1] hover:bg-[#1565C0]"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {editingCustomer ? 'עדכון' : 'הוספה'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}