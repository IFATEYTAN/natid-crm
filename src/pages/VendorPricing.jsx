import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useCurrentUserRole } from '@/components/auth/RoleGuard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import DataTable from '@/components/ui/DataTable';
import {
  DollarSign,
  FileText,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Calendar,
  Users,
  AlertTriangle,
} from 'lucide-react';
import { format, isPast } from 'date-fns';
import { showToast } from '@/components/ui/FeedbackToast';

const serviceTypeLabels = {
  towing: 'גרירה',
  mobile_unit: 'ניידת',
  flat_tire: "פנצ'ר",
  battery: 'מצבר',
  lockout: 'פריצת רכב',
  other: 'אחר',
};

const emptyForm = {
  vendor_id: '',
  vendor_name: '',
  service_type: '',
  service_area: '',
  price: '',
  valid_from: '',
  valid_until: '',
  notes: '',
};

function isAgreementExpired(validUntil) {
  if (!validUntil) return false;
  return isPast(new Date(validUntil));
}

export default function VendorPricingPage() {
  const { isAdmin, loading: roleLoading } = useCurrentUserRole();
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingAgreement, setEditingAgreement] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [serviceTypeFilter, setServiceTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Queries
  const { data: agreements = [], isLoading } = useQuery({
    queryKey: ['vendorPricing'],
    queryFn: () => base44.entities.VendorPricing.list('-created_date'),
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ['vendors'],
    queryFn: () => base44.entities.Vendor.list(),
  });

  // Summary stats
  const stats = useMemo(() => {
    const active = agreements.filter((a) => !isAgreementExpired(a.valid_until));
    const expired = agreements.filter((a) => isAgreementExpired(a.valid_until));
    const uniqueVendors = new Set(active.map((a) => a.vendor_id)).size;

    return { activeCount: active.length, uniqueVendors, expiredCount: expired.length };
  }, [agreements]);

  // Filtered data
  const filteredAgreements = useMemo(() => {
    return agreements.filter((agreement) => {
      const matchesSearch =
        !searchTerm ||
        agreement.vendor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        agreement.service_area?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesServiceType =
        serviceTypeFilter === 'all' || agreement.service_type === serviceTypeFilter;

      const expired = isAgreementExpired(agreement.valid_until);
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && !expired) ||
        (statusFilter === 'expired' && expired);

      return matchesSearch && matchesServiceType && matchesStatus;
    });
  }, [agreements, searchTerm, serviceTypeFilter, statusFilter]);

  // Dialog handlers
  const openCreate = () => {
    setEditingAgreement(null);
    setForm(emptyForm);
    setShowDialog(true);
  };

  const openEdit = (agreement) => {
    setEditingAgreement(agreement);
    setForm({
      vendor_id: agreement.vendor_id || '',
      vendor_name: agreement.vendor_name || '',
      service_type: agreement.service_type || '',
      service_area: agreement.service_area || '',
      price: agreement.price?.toString() || '',
      valid_from: agreement.valid_from || '',
      valid_until: agreement.valid_until || '',
      notes: agreement.notes || '',
    });
    setShowDialog(true);
  };

  const handleVendorChange = (vendorId) => {
    const vendor = vendors.find((v) => v.id === vendorId);
    setForm({
      ...form,
      vendor_id: vendorId,
      vendor_name: vendor?.vendor_name || vendor?.name || '',
    });
  };

  const handleSave = async () => {
    if (!form.vendor_id || !form.service_type || !form.price) {
      return showToast.error('יש למלא ספק, סוג שירות ומחיר');
    }

    setSaving(true);
    try {
      const data = {
        ...form,
        price: parseFloat(form.price),
      };

      if (editingAgreement) {
        await base44.entities.VendorPricing.update(editingAgreement.id, data);
        showToast.success('הסכם התמחור עודכן בהצלחה');
      } else {
        await base44.entities.VendorPricing.create(data);
        showToast.success('הסכם התמחור נוצר בהצלחה');
      }

      queryClient.invalidateQueries({ queryKey: ['vendorPricing'] });
      setShowDialog(false);
    } catch (error) {
      console.error('Save error:', error);
      showToast.error('שגיאה בשמירת ההסכם');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await base44.entities.VendorPricing.delete(deleteTarget.id);
      queryClient.invalidateQueries({ queryKey: ['vendorPricing'] });
      showToast.success('הסכם התמחור נמחק בהצלחה');
    } catch (error) {
      console.error('Delete error:', error);
      showToast.error('שגיאה במחיקת ההסכם');
    } finally {
      setDeleteTarget(null);
    }
  };

  // Table columns
  const columns = [
    {
      header: 'ספק',
      accessor: 'vendor_name',
      cell: (row) => <span className="font-medium">{row.vendor_name || '-'}</span>,
    },
    {
      header: 'סוג שירות',
      accessor: 'service_type',
      cell: (row) => (
        <Badge className="bg-blue-100 text-blue-700">
          {serviceTypeLabels[row.service_type] || row.service_type}
        </Badge>
      ),
    },
    {
      header: 'אזור',
      accessor: 'service_area',
      cell: (row) => row.service_area || '-',
    },
    {
      header: 'מחיר',
      accessor: 'price',
      cell: (row) => (
        <span className="font-bold text-[#111827]">
          {row.price != null ? `₪${row.price.toLocaleString()}` : '-'}
        </span>
      ),
    },
    {
      header: 'תוקף מ-',
      accessor: 'valid_from',
      cell: (row) =>
        row.valid_from ? (
          <span className="text-sm">{format(new Date(row.valid_from), 'dd/MM/yyyy')}</span>
        ) : (
          '-'
        ),
    },
    {
      header: 'תוקף עד',
      accessor: 'valid_until',
      cell: (row) =>
        row.valid_until ? (
          <span className="text-sm">{format(new Date(row.valid_until), 'dd/MM/yyyy')}</span>
        ) : (
          '-'
        ),
    },
    {
      header: 'סטטוס',
      accessor: 'status',
      cell: (row) => {
        const expired = isAgreementExpired(row.valid_until);
        return expired ? (
          <Badge className="bg-red-100 text-red-700 gap-1">
            <AlertTriangle className="w-3 h-3" />
            פג תוקף
          </Badge>
        ) : (
          <Badge className="bg-green-100 text-green-700">פעיל</Badge>
        );
      },
    },
    {
      header: 'פעולות',
      cell: (row) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => {
              e.stopPropagation();
              openEdit(row);
            }}
          >
            <Edit className="w-4 h-4 text-gray-500" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-red-400 hover:text-red-600"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteTarget(row);
            }}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  if (roleLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return null; // Route-level RoleGuard handles the access denied UI
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#111827] flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-[#3b82f6]" />
            הסכמי תמחור ספקים
          </h1>
          <p className="text-sm text-[#6b7280] mt-1">ניהול הסכמי מחיר עם נותני שירות</p>
        </div>
        <Button onClick={openCreate} className="bg-[#3b82f6] hover:bg-[#2563eb] gap-2">
          <Plus className="w-4 h-4" />
          הוסף הסכם
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <FileText className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-[#111827]">{stats.activeCount}</div>
                <div className="text-xs text-[#6b7280]">הסכמים פעילים</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-[#111827]">{stats.uniqueVendors}</div>
                <div className="text-xs text-[#6b7280]">ספקים עם הסכם</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-[#111827]">{stats.expiredCount}</div>
                <div className="text-xs text-[#6b7280]">הסכמים שפגו תוקפם</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card className="bg-white">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="חיפוש לפי שם ספק..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>
            <Select value={serviceTypeFilter} onValueChange={setServiceTypeFilter}>
              <SelectTrigger className="w-44">
                <Filter className="w-4 h-4 ml-2 text-gray-400" />
                <SelectValue placeholder="סוג שירות" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל סוגי השירות</SelectItem>
                {Object.entries(serviceTypeLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="סטטוס" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הסטטוסים</SelectItem>
                <SelectItem value="active">פעיל</SelectItem>
                <SelectItem value="expired">פג תוקף</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#6b7280]" />
            רשימת הסכמים ({filteredAgreements.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={filteredAgreements}
            isLoading={isLoading}
            emptyMessage="לא נמצאו הסכמי תמחור"
            mobileCardConfig={{
              titleAccessor: 'vendor_name',
              subtitleAccessor: 'service_area',
              badgeAccessor: 'status',
              showFields: ['service_type', 'price', 'valid_until'],
            }}
          />
        </CardContent>
      </Card>

      {/* Add / Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingAgreement ? 'עריכת הסכם תמחור' : 'הסכם תמחור חדש'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div>
              <Label>ספק</Label>
              <Select value={form.vendor_id} onValueChange={handleVendorChange}>
                <SelectTrigger>
                  <SelectValue placeholder="בחר ספק" />
                </SelectTrigger>
                <SelectContent>
                  {vendors.map((vendor) => (
                    <SelectItem key={vendor.id} value={vendor.id}>
                      {vendor.vendor_name || vendor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>סוג שירות</Label>
                <Select
                  value={form.service_type}
                  onValueChange={(v) => setForm({ ...form, service_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="בחר סוג שירות" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(serviceTypeLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>אזור שירות</Label>
                <Input
                  value={form.service_area}
                  onChange={(e) => setForm({ ...form, service_area: e.target.value })}
                  placeholder="למשל: מרכז, צפון, דרום..."
                />
              </div>
            </div>

            <div>
              <Label>מחיר (₪)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="0.00"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  תוקף מ-
                </Label>
                <Input
                  type="date"
                  value={form.valid_from}
                  onChange={(e) => setForm({ ...form, valid_from: e.target.value })}
                />
              </div>
              <div>
                <Label className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  תוקף עד
                </Label>
                <Input
                  type="date"
                  value={form.valid_until}
                  onChange={(e) => setForm({ ...form, valid_until: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label>הערות</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="הערות נוספות..."
                className="h-20"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              ביטול
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'שומר...' : editingAgreement ? 'עדכן' : 'צור הסכם'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת הסכם תמחור</AlertDialogTitle>
            <AlertDialogDescription>
              האם אתה בטוח שברצונך למחוק את הסכם התמחור של{' '}
              <strong>{deleteTarget?.vendor_name}</strong>? פעולה זו אינה ניתנת לביטול.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              מחק
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
