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
  Truck,
  Star,
  Edit,
  Trash2
} from 'lucide-react';
import ImportExport from '@/components/ImportExport';

const serviceTypeLabels = {
  tow_truck: 'גרר',
  mechanic: 'מכונאי',
  tire_service: 'פנצ\'ריה',
  locksmith: 'מנעולן',
  fuel_delivery: 'דלק',
  multi_service: 'רב שירות'
};

export default function ServiceProviders() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    service_type: 'tow_truck',
    contact_person: '',
    phone: '',
    secondary_phone: '',
    email: '',
    status: 'available',
    price_per_km: '',
    base_price: '',
    license_number: '',
    insurance_expiry: '',
    notes: ''
  });

  const queryClient = useQueryClient();

  const { data: providers = [], isLoading } = useQuery({
    queryKey: ['providers'],
    queryFn: () => base44.entities.ServiceProvider.list('-created_date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ServiceProvider.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providers'] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ServiceProvider.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providers'] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ServiceProvider.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providers'] });
    },
  });

  const resetForm = () => {
    setIsDialogOpen(false);
    setEditingProvider(null);
    setFormData({
      name: '',
      service_type: 'tow_truck',
      contact_person: '',
      phone: '',
      secondary_phone: '',
      email: '',
      status: 'available',
      price_per_km: '',
      base_price: '',
      license_number: '',
      insurance_expiry: '',
      notes: ''
    });
  };

  const handleEdit = (provider) => {
    setEditingProvider(provider);
    setFormData({
      name: provider.name || '',
      service_type: provider.service_type || 'tow_truck',
      contact_person: provider.contact_person || '',
      phone: provider.phone || '',
      secondary_phone: provider.secondary_phone || '',
      email: provider.email || '',
      status: provider.status || 'available',
      price_per_km: provider.price_per_km || '',
      base_price: provider.base_price || '',
      license_number: provider.license_number || '',
      insurance_expiry: provider.insurance_expiry || '',
      notes: provider.notes || ''
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      price_per_km: formData.price_per_km ? Number(formData.price_per_km) : null,
      base_price: formData.base_price ? Number(formData.base_price) : null
    };
    
    if (editingProvider) {
      updateMutation.mutate({ id: editingProvider.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const filteredProviders = providers.filter(p => {
    const matchesSearch = !search || 
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.phone?.includes(search);
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const columns = [
    {
      header: 'שם',
      accessor: 'name',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#0D47A1]/10 flex items-center justify-center">
            <Truck className="w-4 h-4 text-[#0D47A1]" />
          </div>
          <span className="font-medium text-[#212121]">{row.name}</span>
        </div>
      )
    },
    {
      header: 'סוג שירות',
      accessor: 'service_type',
      cell: (row) => serviceTypeLabels[row.service_type] || row.service_type
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
      header: 'סטטוס',
      accessor: 'status',
      cell: (row) => <StatusBadge status={row.status || 'available'} size="sm" />
    },
    {
      header: 'דירוג',
      accessor: 'rating',
      cell: (row) => row.rating ? (
        <span className="flex items-center gap-1 text-[#ED6C02]">
          <Star className="w-3 h-3 fill-current" />
          {row.rating.toFixed(1)}
        </span>
      ) : '-'
    },
    {
      header: 'עבודות',
      accessor: 'total_jobs',
      cell: (row) => row.total_jobs || 0
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
              if (confirm('האם למחוק את נותן השירות?')) {
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
          <h2 className="text-xl font-bold text-[#212121]">נותני שירות</h2>
          <p className="text-[#616161] text-sm">{filteredProviders.length} נותני שירות</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ImportExport 
            entityName="ServiceProvider" 
            data={filteredProviders}
            columns={columns}
          />
          <Button 
            className="bg-[#0D47A1] hover:bg-[#1565C0] gap-2"
            onClick={() => setIsDialogOpen(true)}
          >
            <Plus className="w-4 h-4" />
            נותן שירות חדש
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-[#E0E0E0] p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9E9E9E]" />
            <Input
              placeholder="חיפוש לפי שם, טלפון..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-40">
              <SelectValue placeholder="סטטוס" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל הסטטוסים</SelectItem>
              <SelectItem value="available">זמין</SelectItem>
              <SelectItem value="busy">בעבודה</SelectItem>
              <SelectItem value="offline">לא זמין</SelectItem>
              <SelectItem value="inactive">לא פעיל</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={filteredProviders}
        isLoading={isLoading}
        emptyMessage="לא נמצאו נותני שירות"
      />

      {/* Provider Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProvider ? 'עריכת נותן שירות' : 'נותן שירות חדש'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>שם *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>סוג שירות</Label>
                <Select
                  value={formData.service_type}
                  onValueChange={(value) => setFormData({ ...formData, service_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(serviceTypeLabels).map(([key, label]) => (
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
                <Label>טלפון נוסף</Label>
                <Input
                  value={formData.secondary_phone}
                  onChange={(e) => setFormData({ ...formData, secondary_phone: e.target.value })}
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
                <Label>סטטוס</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">זמין</SelectItem>
                    <SelectItem value="busy">בעבודה</SelectItem>
                    <SelectItem value="offline">לא זמין</SelectItem>
                    <SelectItem value="inactive">לא פעיל</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>מספר רישיון</Label>
                <Input
                  value={formData.license_number}
                  onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                />
              </div>
              <div>
                <Label>מחיר בסיס</Label>
                <Input
                  type="number"
                  value={formData.base_price}
                  onChange={(e) => setFormData({ ...formData, base_price: e.target.value })}
                />
              </div>
              <div>
                <Label>מחיר לק"מ</Label>
                <Input
                  type="number"
                  value={formData.price_per_km}
                  onChange={(e) => setFormData({ ...formData, price_per_km: e.target.value })}
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
                {editingProvider ? 'עדכון' : 'הוספה'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}