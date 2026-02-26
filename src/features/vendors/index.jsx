import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { motion } from 'framer-motion';
import { base44 } from '@/lib/api';
import { sanitizeVendorCreate, sanitizeVendorUpdate } from '@/lib/schemas/vendor';
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
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { createPageUrl } from '@/utils';
import { PageTransition } from '@/components/animations/AnimatedComponents';

const serviceTypeLabels = {
  tow_truck: 'גרר',
  mechanic: 'מכונאי',
  tire_service: "פנצ'ריה",
  locksmith: 'מנעולן',
  fuel_delivery: 'דלק',
  multi_service: 'רב שירות',
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
    profile_image: '',
  });

  const queryClient = useQueryClient();

  const { data: providers = [], isLoading } = useQuery({
    queryKey: queryKeys.vendors.all(),
    queryFn: () => base44.entities.Vendor.list('-created_date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Vendor.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vendors.all() });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Vendor.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vendors.all() });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Vendor.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vendors.all() });
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
      profile_image: '',
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
      profile_image: provider.profile_image || '',
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
    try {
      if (editingProvider) {
        const data = sanitizeVendorUpdate(formData);
        updateMutation.mutate({ id: editingProvider.id, data });
      } else {
        const data = sanitizeVendorCreate(formData);
        createMutation.mutate(data);
      }
    } catch (validationError) {
      toast.error(validationError.message);
    }
  };

  const filteredProviders = providers.filter((p) => {
    const matchesSearch =
      !search ||
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
        <Link
          to={createPageUrl('VendorProfile') + '?id=' + row.id}
          className="flex items-center gap-2 hover:underline"
        >
          {row.profile_image ? (
            <img
              src={row.profile_image}
              alt={row.vendor_name}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-neutral-soft-100 flex items-center justify-center">
              <Truck className="w-4 h-4 text-neutral-soft-900" />
            </div>
          )}
          <div>
            <div className="font-medium text-neutral-soft-900">{row.vendor_name}</div>
            {!row.is_active && <span className="text-xs text-error-soft-600">לא פעיל</span>}
          </div>
        </Link>
      ),
    },
    {
      header: 'סוגי שירות',
      accessor: 'service_type',
      cell: (row) => (
        <div className="flex flex-wrap gap-1">
          {(row.service_type || []).slice(0, 2).map((type, idx) => (
            <span key={idx} className="badge-primary">
              {type}
            </span>
          ))}
          {(row.service_type || []).length > 2 && (
            <span className="text-xs text-neutral-soft-600">+{row.service_type.length - 2}</span>
          )}
        </div>
      ),
    },
    {
      header: 'טלפון',
      accessor: 'phone',
      cell: (row) => (
        <a
          href={`tel:${row.phone}`}
          className="flex items-center gap-1 text-primary-soft-600 hover:underline"
        >
          <Phone className="w-3 h-3" />
          {row.phone}
        </a>
      ),
    },
    {
      header: 'סטטוס זמינות',
      accessor: 'availability_status',
      cell: (row) => <StatusBadge status={row.availability_status || 'available'} size="sm" />,
    },
    {
      header: 'דירוג',
      accessor: 'average_rating',
      cell: (row) =>
        row.average_rating ? (
          <span className="flex items-center gap-1 text-warning-soft-600">
            <Star className="w-3 h-3 fill-current" />
            {row.average_rating.toFixed(1)}
          </span>
        ) : (
          '-'
        ),
    },
    {
      header: 'קריאות',
      accessor: 'total_calls_completed',
      cell: (row) => (
        <div className="text-sm">
          <div className="font-medium">{row.total_calls_completed || 0}</div>
          <div className="text-xs text-neutral-soft-600">
            {row.completion_rate ? `${Math.round(row.completion_rate)}%` : '-'}
          </div>
        </div>
      ),
    },
    {
      header: 'פעולות',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Link to={createPageUrl('VendorProfile') + '?id=' + row.id}>
            <Button variant="ghost" size="icon" title="היסטוריה">
              <Eye className="w-4 h-4 text-primary-soft-600" />
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(row);
            }}
            title="עריכה"
          >
            <Edit className="w-4 h-4 text-neutral-soft-600" />
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
            <Trash2 className="w-4 h-4 text-error-soft-600" />
          </Button>
        </div>
      ),
    },
  ];

  // Status labels for export
  const statusLabels = {
    available: 'זמין',
    busy: 'בעבודה',
    offline: 'לא זמין',
    inactive: 'לא פעיל',
  };

  const exportColumns = [
    { header: 'שם ספק', accessor: 'vendor_name' },
    { header: 'איש קשר', accessor: 'contact_person' },
    { header: 'טלפון', accessor: 'phone' },
    { header: 'אימייל', accessor: 'email' },
    { header: 'סוגי שירות', accessor: 'service_types' },
    { header: 'אזורי כיסוי', accessor: 'coverage_areas_str' },
    { header: 'סטטוס', accessor: 'status' },
    { header: 'דירוג', accessor: 'rating' },
    { header: 'קריאות', accessor: 'total_calls_completed' },
  ];

  // Prepare export data with formatted values
  const exportData = filteredProviders.map((provider) => ({
    ...provider,
    service_types: (provider.service_type || []).join(', '),
    coverage_areas_str: (provider.coverage_areas || []).join(', '),
    status: statusLabels[provider.availability_status] || provider.availability_status || '',
    rating: provider.average_rating ? provider.average_rating.toFixed(1) : '',
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
            <h1 className="heading-2 text-primary-soft-600">נותני שירות</h1>
            <p className="text-secondary">{filteredProviders.length} ספקים פעילים</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ExportMenu
              data={exportData}
              columns={exportColumns}
              filename="vendors"
              title="רשימת נותני שירות"
              subtitle={`סה"כ ${filteredProviders.length} ספקים`}
            />
            <Button className="btn-primary" onClick={() => setIsDialogOpen(true)}>
              <Plus className="w-4 h-4" />
              נותן שירות חדש
            </Button>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="card-base card-body"
        >
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-soft-500" />
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
        </motion.div>

        {/* Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <DataTable
            columns={columns}
            data={filteredProviders}
            isLoading={isLoading}
            emptyMessage="לא נמצאו נותני שירות"
            emptyPreset="vendors"
          />
        </motion.div>

        {/* Provider Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingProvider ? 'עריכת נותן שירות' : 'נותן שירות חדש'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Image Upload Section */}
              <div className="flex flex-col items-center gap-3 pb-4 border-b">
                <Label className="form-label">תמונת ספק</Label>
                <div className="relative">
                  {formData.profile_image ? (
                    <div className="relative">
                      <img
                        src={formData.profile_image}
                        alt="תמונת ספק"
                        className="w-24 h-24 rounded-full object-cover border-2 border-neutral-soft-200"
                      />
                      <button
                        type="button"
                        onClick={removeImage}
                        className="absolute -top-1 -right-1 bg-error-soft-600 text-white rounded-full p-1 hover:bg-error-soft-700"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-neutral-soft-100 flex items-center justify-center border-2 border-dashed border-neutral-soft-300">
                      <Truck className="w-8 h-8 text-neutral-soft-500" />
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
                <p className="text-xs text-neutral-soft-600">תמונה עד 5MB (JPG, PNG)</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <Label className="form-label">שם ספק *</Label>
                  <Input
                    className="form-input"
                    value={formData.vendor_name}
                    onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
                    required
                  />
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
                  <Label className="form-label">טלפון ראשי *</Label>
                  <Input
                    className="form-input"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <Label className="form-label">טלפון משני</Label>
                  <Input
                    className="form-input"
                    value={formData.phone_2}
                    onChange={(e) => setFormData({ ...formData, phone_2: e.target.value })}
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
                  <p className="form-helper-text">
                    * יש להזמין את המשתמש בנפרד דרך מסך "ניהול משתמשים" עם כתובת אימייל זו כדי לאפשר
                    לו גישה לפורטל
                  </p>
                </div>
                <div className="form-group">
                  <Label className="form-label">סטטוס זמינות</Label>
                  <Select
                    value={formData.availability_status}
                    onValueChange={(value) =>
                      setFormData({ ...formData, availability_status: value })
                    }
                  >
                    <SelectTrigger className="form-input">
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
                  <Label htmlFor="is_active" className="cursor-pointer">
                    ספק פעיל במערכת
                  </Label>
                </div>
                <div className="form-group">
                  <Label className="form-label">שעת התחלה</Label>
                  <Input
                    className="form-input"
                    type="time"
                    value={formData.working_hours_start}
                    onChange={(e) =>
                      setFormData({ ...formData, working_hours_start: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <Label className="form-label">שעת סיום</Label>
                  <Input
                    className="form-input"
                    type="time"
                    value={formData.working_hours_end}
                    onChange={(e) =>
                      setFormData({ ...formData, working_hours_end: e.target.value })
                    }
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
                  <Label htmlFor="works_24_7" className="cursor-pointer">
                    עובד 24/7
                  </Label>
                </div>
                <div className="form-group">
                  <Label className="form-label">תעריף לקריאה (₪)</Label>
                  <Input
                    className="form-input"
                    type="number"
                    value={formData.payment_rate_per_call}
                    onChange={(e) =>
                      setFormData({ ...formData, payment_rate_per_call: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <Label className="form-label">סוגי שירות</Label>
                  <Input
                    className="form-input"
                    placeholder="גרירה, פנצ'ר, רדיו דיסק (מופרד בפסיקים)"
                    value={(formData.service_type || []).join(', ')}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        service_type: e.target.value
                          .split(',')
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                  />
                </div>
                <div className="col-span-2 form-group">
                  <Label className="form-label">אזורי כיסוי</Label>
                  <Input
                    className="form-input"
                    placeholder="מרכז, צפון, דרום (מופרד בפסיקים)"
                    value={(formData.coverage_areas || []).join(', ')}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        coverage_areas: e.target.value
                          .split(',')
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
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
                  {editingProvider ? 'עדכון' : 'הוספה'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </PageTransition>
  );
}
