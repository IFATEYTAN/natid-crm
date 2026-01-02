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
  Trash2,
  Eye
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
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
    vendor_name: '',
    contact_person: '',
    phone: '',
    phone_2: '',
    email: '',
    service_type: [],
    coverage_areas: [],
    availability_status: 'available',
    is_active: true,
    payment_rate_per_call: '',
    notes: '',
    working_hours_start: '08:00',
    working_hours_end: '18:00',
    works_24_7: false
  });

  const queryClient = useQueryClient();

  const { data: providers = [], isLoading } = useQuery({
    queryKey: ['vendors'],
    queryFn: () => base44.entities.Vendor.list('-created_date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Vendor.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Vendor.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Vendor.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
    },
  });

  const resetForm = () => {
    setIsDialogOpen(false);
    setEditingProvider(null);
    setFormData({
      vendor_name: '',
      contact_person: '',
      phone: '',
      phone_2: '',
      email: '',
      service_type: [],
      coverage_areas: [],
      availability_status: 'available',
      is_active: true,
      payment_rate_per_call: '',
      notes: '',
      working_hours_start: '08:00',
      working_hours_end: '18:00',
      works_24_7: false
    });
  };

  const handleEdit = (provider) => {
    setEditingProvider(provider);
    setFormData({
      vendor_name: provider.vendor_name || '',
      contact_person: provider.contact_person || '',
      phone: provider.phone || '',
      phone_2: provider.phone_2 || '',
      email: provider.email || '',
      service_type: provider.service_type || [],
      coverage_areas: provider.coverage_areas || [],
      availability_status: provider.availability_status || 'available',
      is_active: provider.is_active !== undefined ? provider.is_active : true,
      payment_rate_per_call: provider.payment_rate_per_call || '',
      notes: provider.notes || '',
      working_hours_start: provider.working_hours_start || '08:00',
      working_hours_end: provider.working_hours_end || '18:00',
      works_24_7: provider.works_24_7 || false
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      payment_rate_per_call: formData.payment_rate_per_call ? Number(formData.payment_rate_per_call) : null
    };
    
    if (editingProvider) {
      updateMutation.mutate({ id: editingProvider.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const filteredProviders = providers.filter(p => {
    const matchesSearch = !search || 
      p.vendor_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.phone?.includes(search);
    const matchesStatus = statusFilter === 'all' || p.availability_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const columns = [
    {
      header: 'שם',
      accessor: 'vendor_name',
      cell: (row) => (
        <Link to={createPageUrl('VendorProfile') + '?id=' + row.id} className="flex items-center gap-2 hover:underline">
          <div className="w-8 h-8 rounded-full bg-[#0D47A1]/10 flex items-center justify-center">
            <Truck className="w-4 h-4 text-[#0D47A1]" />
          </div>
          <div>
            <div className="font-medium text-[#212121]">{row.vendor_name}</div>
            {!row.is_active && (
              <span className="text-xs text-[#D32F2F]">לא פעיל</span>
            )}
          </div>
        </Link>
      )
    },
    {
      header: 'סוגי שירות',
      accessor: 'service_type',
      cell: (row) => (
        <div className="flex flex-wrap gap-1">
          {(row.service_type || []).slice(0, 2).map((type, idx) => (
            <span key={idx} className="text-xs bg-[#E3F2FD] text-[#0078D4] px-2 py-1 rounded">
              {type}
            </span>
          ))}
          {(row.service_type || []).length > 2 && (
            <span className="text-xs text-[#616161]">+{row.service_type.length - 2}</span>
          )}
        </div>
      )
    },
    {
      header: 'טלפון',
      accessor: 'phone',
      cell: (row) => (
        <a href={`tel:${row.phone}`} className="flex items-center gap-1 text-[#0078D4] hover:underline">
          <Phone className="w-3 h-3" />
          {row.phone}
        </a>
      )
    },
    {
      header: 'סטטוס זמינות',
      accessor: 'availability_status',
      cell: (row) => <StatusBadge status={row.availability_status || 'available'} size="sm" />
    },
    {
      header: 'דירוג',
      accessor: 'average_rating',
      cell: (row) => row.average_rating ? (
        <span className="flex items-center gap-1 text-[#ED6C02]">
          <Star className="w-3 h-3 fill-current" />
          {row.average_rating.toFixed(1)}
        </span>
      ) : '-'
    },
    {
      header: 'קריאות',
      accessor: 'total_calls_completed',
      cell: (row) => (
        <div className="text-sm">
          <div className="font-medium">{row.total_calls_completed || 0}</div>
          <div className="text-xs text-[#616161]">
            {row.completion_rate ? `${Math.round(row.completion_rate)}%` : '-'}
          </div>
        </div>
      )
    },
    {
      header: 'פעולות',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Link to={createPageUrl('VendorProfile') + '?id=' + row.id}>
            <Button variant="ghost" size="icon" title="היסטוריה">
              <Eye className="w-4 h-4 text-[#0078D4]" />
            </Button>
          </Link>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={(e) => { e.stopPropagation(); handleEdit(row); }}
            title="עריכה"
          >
            <Edit className="w-4 h-4 text-[#616161]" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={(e) => { 
              e.stopPropagation(); 
              if (confirm('האם למחוק את הספק?')) {
                deleteMutation.mutate(row.id);
              }
            }}
            title="מחיקה"
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
                <Label>שם ספק *</Label>
                <Input
                  value={formData.vendor_name}
                  onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>איש קשר</Label>
                <Input
                  value={formData.contact_person}
                  onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                />
              </div>
              <div>
                <Label>טלפון ראשי *</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>טלפון משני</Label>
                <Input
                  value={formData.phone_2}
                  onChange={(e) => setFormData({ ...formData, phone_2: e.target.value })}
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
                <Label>סטטוס זמינות</Label>
                <Select
                  value={formData.availability_status}
                  onValueChange={(value) => setFormData({ ...formData, availability_status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">זמין</SelectItem>
                    <SelectItem value="busy">בעבודה</SelectItem>
                    <SelectItem value="offline">לא זמין</SelectItem>
                    <SelectItem value="on_break">בהפסקה</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2 col-span-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4"
                />
                <Label htmlFor="is_active" className="cursor-pointer">ספק פעיל במערכת</Label>
              </div>
              <div>
                <Label>שעת התחלה</Label>
                <Input
                  type="time"
                  value={formData.working_hours_start}
                  onChange={(e) => setFormData({ ...formData, working_hours_start: e.target.value })}
                />
              </div>
              <div>
                <Label>שעת סיום</Label>
                <Input
                  type="time"
                  value={formData.working_hours_end}
                  onChange={(e) => setFormData({ ...formData, working_hours_end: e.target.value })}
                />
              </div>
              <div className="flex items-center space-x-2 col-span-2">
                <input
                  type="checkbox"
                  id="works_24_7"
                  checked={formData.works_24_7}
                  onChange={(e) => setFormData({ ...formData, works_24_7: e.target.checked })}
                  className="w-4 h-4"
                />
                <Label htmlFor="works_24_7" className="cursor-pointer">עובד 24/7</Label>
              </div>
              <div>
                <Label>תעריף לקריאה (₪)</Label>
                <Input
                  type="number"
                  value={formData.payment_rate_per_call}
                  onChange={(e) => setFormData({ ...formData, payment_rate_per_call: e.target.value })}
                />
              </div>
              <div>
                <Label>סוגי שירות</Label>
                <Input
                  placeholder="גרירה, פנצ'ר, רדיו דיסק (מופרד בפסיקים)"
                  value={(formData.service_type || []).join(', ')}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    service_type: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                  })}
                />
              </div>
              <div className="col-span-2">
                <Label>אזורי כיסוי</Label>
                <Input
                  placeholder="מרכז, צפון, דרום (מופרד בפסיקים)"
                  value={(formData.coverage_areas || []).join(', ')}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    coverage_areas: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                  })}
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