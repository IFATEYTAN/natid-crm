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
  Eye,
  Camera,
  Upload,
  Loader2,
  X
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
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
  const [isUploading, setIsUploading] = useState(false);
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
    works_24_7: false,
    profile_image: ''
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
      works_24_7: false,
      profile_image: ''
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
      works_24_7: provider.works_24_7 || false,
      profile_image: provider.profile_image || ''
    });
    setIsDialogOpen(true);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('נא לבחור קובץ תמונה בלבד');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('גודל התמונה לא יכול לעלות על 5MB');
      return;
    }

    try {
      setIsUploading(true);
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, profile_image: file_url });
      toast.success('התמונה הועלתה בהצלחה');
    } catch (error) {
      toast.error('שגיאה בהעלאת תמונה: ' + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = () => {
    setFormData({ ...formData, profile_image: '' });
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
          {row.profile_image ? (
            <img
              src={row.profile_image}
              alt={row.vendor_name}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-[#F5F5F5] flex items-center justify-center">
              <Truck className="w-4 h-4 text-[#212121]" />
            </div>
          )}
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
          <h1>נותני שירות</h1>
          <p className="text-[var(--color-text-secondary)]">{filteredProviders.length} ספקים פעילים</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ImportExport 
            entityName="Vendor" 
            data={filteredProviders}
            columns={columns}
            title="דוח נותני שירות"
          />
          <Button 
            className="btn-primary flex items-center gap-2"
            onClick={() => setIsDialogOpen(true)}
          >
            <Plus className="w-4 h-4" />
            נותן שירות חדש
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="card-base">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-disabled)]" />
            <Input
              placeholder="חיפוש לפי שם, טלפון..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-base pr-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-40 input-base">
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
            {/* Image Upload Section */}
            <div className="flex flex-col items-center gap-3 pb-4 border-b">
              <Label>תמונת ספק</Label>
              <div className="relative">
                {formData.profile_image ? (
                  <div className="relative">
                    <img
                      src={formData.profile_image}
                      alt="תמונת ספק"
                      className="w-24 h-24 rounded-full object-cover border-2 border-[#E0E0E0]"
                    />
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="w-24 h-24 rounded-full bg-[#F5F5F5] flex items-center justify-center border-2 border-dashed border-[#BDBDBD]">
                    <Truck className="w-8 h-8 text-[#9E9E9E]" />
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={isUploading}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    disabled={isUploading}
                    asChild
                  >
                    <span>
                      {isUploading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4" />
                      )}
                      העלאת תמונה
                    </span>
                  </Button>
                </label>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={isUploading}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    disabled={isUploading}
                    asChild
                  >
                    <span>
                      {isUploading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Camera className="w-4 h-4" />
                      )}
                      צילום
                    </span>
                  </Button>
                </label>
              </div>
              <p className="text-xs text-[#616161]">תמונה עד 5MB (JPG, PNG)</p>
            </div>

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
                <p className="text-[11px] text-[#616161] mt-1">
                  * יש להזמין את המשתמש בנפרד דרך מסך "ניהול משתמשים" עם כתובת אימייל זו כדי לאפשר לו גישה לפורטל
                </p>
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