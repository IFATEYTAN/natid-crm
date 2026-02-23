import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import ContractFormDialog from '@/components/contracts/ContractFormDialog';
import ContractDetailsDialog from '@/components/contracts/ContractDetailsDialog';
import {
  FileText,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  Calendar,
  DollarSign,
  Truck,
  RefreshCw,
  Bell,
  Mail,
  MessageCircle,
  Download,
  MoreVertical,
  File,
  Edit,
  Trash2,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, differenceInDays, isPast } from 'date-fns';
import { showToast } from '@/components/ui/FeedbackToast';
import ExportMenu from '@/components/ui/ExportMenu';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const statusConfig = {
  draft: { label: 'טיוטה', color: 'bg-gray-100 text-gray-700', icon: FileText },
  pending_approval: { label: 'ממתין לאישור', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  active: { label: 'פעיל', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  expired: { label: 'פג תוקף', color: 'bg-red-100 text-red-700', icon: XCircle },
  suspended: { label: 'מושהה', color: 'bg-orange-100 text-orange-700', icon: AlertTriangle },
  terminated: { label: 'בוטל', color: 'bg-gray-100 text-gray-700', icon: XCircle },
};

const contractTypeLabels = {
  per_call: 'לפי קריאה',
  monthly: 'חודשי',
  yearly: 'שנתי',
  hourly: 'שעתי',
};

const serviceTypeLabels = {
  towing: 'גרירה',
  mobile_unit: 'ניידת',
  flat_tire: "פנצ'ר",
  battery: 'מצבר',
  lockout: 'פריצת רכב',
  other: 'אחר',
};

function isAgreementExpired(validUntil) {
  if (!validUntil) return false;
  return isPast(new Date(validUntil));
}

// ─── Pricing Tab ───────────────────────────────────────────

const emptyPricingForm = {
  vendor_id: '',
  vendor_name: '',
  service_type: '',
  service_area: '',
  price: '',
  valid_from: '',
  valid_until: '',
  notes: '',
};

function PricingTab({ vendors }) {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingAgreement, setEditingAgreement] = useState(null);
  const [form, setForm] = useState(emptyPricingForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [serviceTypeFilter, setServiceTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: agreements = [], isLoading } = useQuery({
    queryKey: ['vendorPricing'],
    queryFn: () => base44.entities.VendorPricing.list('-created_date'),
  });

  const stats = useMemo(() => {
    const active = agreements.filter((a) => !isAgreementExpired(a.valid_until));
    const expired = agreements.filter((a) => isAgreementExpired(a.valid_until));
    const uniqueVendors = new Set(active.map((a) => a.vendor_id)).size;
    return { activeCount: active.length, uniqueVendors, expiredCount: expired.length };
  }, [agreements]);

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

  const openCreate = () => {
    setEditingAgreement(null);
    setForm(emptyPricingForm);
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
      const data = { ...form, price: parseFloat(form.price) };
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

  const pricingColumns = [
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

  return (
    <div className="space-y-6">
      {/* Stats */}
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

      {/* Filters + Create */}
      <Card className="bg-white">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="חיפוש לפי שם ספק או אזור..."
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
            <Button onClick={openCreate} className="bg-[#3b82f6] hover:bg-[#2563eb] gap-2">
              <Plus className="w-4 h-4" />
              הוסף הסכם
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-[#6b7280]" />
            רשימת הסכמי תמחור ({filteredAgreements.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={pricingColumns}
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

      {/* Delete Confirmation */}
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

// ─── Main Page ─────────────────────────────────────────────

export default function VendorContractsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedContract, setSelectedContract] = useState(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const queryClient = useQueryClient();

  const contractsQuery = useQuery({
    queryKey: ['vendorContracts'],
    queryFn: () => base44.entities.VendorContract.list('-created_date'),
  });

  const vendorsQuery = useQuery({
    queryKey: ['vendors'],
    queryFn: () => base44.entities.Vendor.list(),
  });

  const contracts = contractsQuery.data || [];
  const vendors = vendorsQuery.data || [];

  const stats = useMemo(() => {
    const active = contracts.filter((c) => c.status === 'active');
    const expiringSoon = contracts.filter((c) => {
      if (c.status !== 'active') return false;
      const daysToExpiry = differenceInDays(new Date(c.end_date), new Date());
      return daysToExpiry <= 30 && daysToExpiry > 0;
    });
    const expired = contracts.filter((c) => c.status === 'expired');
    const pending = contracts.filter((c) => c.status === 'pending_approval');
    return { active, expiringSoon, expired, pending };
  }, [contracts]);

  const filteredContracts = useMemo(() => {
    return contracts.filter((contract) => {
      const matchesSearch =
        !searchTerm ||
        contract.vendor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contract.contract_number?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || contract.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [contracts, searchTerm, statusFilter]);

  const handleContractCreated = () => {
    setShowCreateDialog(false);
    queryClient.invalidateQueries({ queryKey: ['vendorContracts'] });
    showToast.success('החוזה נוצר בהצלחה');
  };

  const handleViewContract = (contract) => {
    setSelectedContract(contract);
    setShowDetailsDialog(true);
  };

  const handleSendEmail = async (contract) => {
    const vendor = vendors.find((v) => v.id === contract.vendor_id);
    if (!vendor?.email) {
      showToast.error('לא נמצאה כתובת מייל לספק');
      return;
    }
    try {
      await base44.integrations.Core.SendEmail({
        to: vendor.email,
        subject: `חוזה התקשרות - ${contract.contract_number}`,
        body: `
          שלום ${vendor.contact_person || vendor.vendor_name},

          מצורפים פרטי החוזה שלך:
          מספר חוזה: ${contract.contract_number}
          תוקף: ${format(new Date(contract.start_date), 'dd/MM/yyyy')} - ${format(new Date(contract.end_date), 'dd/MM/yyyy')}

          ${contract.document_url ? `לינק לחוזה החתום: ${contract.document_url}` : ''}

          בברכה,
          צוות NatID 360
        `,
      });
      showToast.success('המייל נשלח בהצלחה');
    } catch (error) {
      console.error('Email error:', error);
      showToast.error('שגיאה בשליחת המייל');
    }
  };

  const handleWhatsApp = (contract) => {
    const vendor = vendors.find((v) => v.id === contract.vendor_id);
    if (!vendor?.phone) {
      showToast.error('לא נמצא מספר טלפון לספק');
      return;
    }
    const phone = vendor.phone.replace(/\D/g, '').replace(/^0/, '972');
    const text = encodeURIComponent(
      `שלום ${vendor.vendor_name},\nהנה הקישור לחוזה שלך (${contract.contract_number}):\n${contract.document_url || 'לא צורף מסמך'}`
    );
    window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
  };

  const contractColumns = [
    {
      header: 'מספר חוזה',
      accessor: 'contract_number',
      cell: (contract) => (
        <button
          onClick={() => handleViewContract(contract)}
          className="font-medium text-blue-600 hover:underline"
        >
          {contract.contract_number || `#${contract.id?.slice(-6)}`}
        </button>
      ),
    },
    {
      header: 'ספק',
      accessor: 'vendor_name',
      cell: (contract) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
            <Truck className="w-4 h-4 text-gray-600" />
          </div>
          <span className="font-medium">{contract.vendor_name}</span>
        </div>
      ),
    },
    {
      header: 'סוג',
      accessor: 'contract_type',
      cell: (contract) => contractTypeLabels[contract.contract_type] || contract.contract_type,
    },
    {
      header: 'תקופה',
      accessor: 'start_date',
      cell: (contract) => (
        <div className="text-sm">
          <div>{format(new Date(contract.start_date), 'dd/MM/yyyy')}</div>
          <div className="text-gray-500">
            עד {format(new Date(contract.end_date), 'dd/MM/yyyy')}
          </div>
        </div>
      ),
    },
    {
      header: 'סטטוס',
      accessor: 'status',
      cell: (contract) => {
        const config = statusConfig[contract.status];
        const Icon = config?.icon || FileText;
        const daysToExpiry = differenceInDays(new Date(contract.end_date), new Date());
        return (
          <div className="space-y-1">
            <Badge className={cn('gap-1', config?.color)}>
              <Icon className="w-3 h-3" />
              {config?.label}
            </Badge>
            {contract.status === 'active' && daysToExpiry <= 30 && daysToExpiry > 0 && (
              <div className="text-xs text-orange-600 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                פג תוקף בעוד {daysToExpiry} ימים
              </div>
            )}
          </div>
        );
      },
    },
    {
      header: 'תעריף',
      accessor: 'rate_per_call',
      cell: (contract) => {
        if (contract.contract_type === 'monthly') {
          return `₪${contract.monthly_fee?.toLocaleString() || 0}/חודש`;
        }
        if (contract.contract_type === 'hourly') {
          return `₪${contract.hourly_rate?.toLocaleString() || 0}/שעה`;
        }
        return `₪${contract.rate_per_call?.toLocaleString() || 0}/קריאה`;
      },
    },
    {
      header: 'מסמך',
      cell: (contract) =>
        contract.document_url ? (
          <a
            href={contract.document_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800"
            title="הורד חוזה"
          >
            <File className="w-4 h-4" />
          </a>
        ) : null,
    },
    {
      header: 'פעולות',
      cell: (contract) => (
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => handleViewContract(contract)}>
            פרטים
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleSendEmail(contract)}>
                <Mail className="w-4 h-4 ml-2" />
                שלח במייל
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleWhatsApp(contract)}>
                <MessageCircle className="w-4 h-4 ml-2" />
                שלח בווצאפ
              </DropdownMenuItem>
              {contract.document_url && (
                <DropdownMenuItem onClick={() => window.open(contract.document_url, '_blank')}>
                  <Download className="w-4 h-4 ml-2" />
                  הורד מסמך
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#111827]">חוזים והסכמי תמחור</h1>
          <p className="text-[#6b7280] text-sm">ניהול חוזים, הסכמים ותמחור עם ספקים</p>
        </div>
      </div>

      {/* Tabs: Contracts / Pricing */}
      <Tabs defaultValue="contracts" dir="rtl">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="contracts" className="gap-2">
            <FileText className="w-4 h-4" />
            חוזים
          </TabsTrigger>
          <TabsTrigger value="pricing" className="gap-2">
            <DollarSign className="w-4 h-4" />
            הסכמי תמחור
          </TabsTrigger>
        </TabsList>

        {/* ─── Contracts Tab ─── */}
        <TabsContent value="contracts" className="space-y-6 mt-6">
          {/* Actions Bar */}
          <div className="flex gap-2 justify-end">
            <ExportMenu
              data={filteredContracts}
              columns={[
                { header: 'מספר חוזה', accessor: 'contract_number' },
                { header: 'ספק', accessor: 'vendor_name' },
                { header: 'סוג', accessor: 'contract_type' },
                { header: 'סטטוס', accessor: 'status' },
                { header: 'תאריך התחלה', accessor: 'start_date' },
                { header: 'תאריך סיום', accessor: 'end_date' },
              ]}
              title="רשימת חוזי ספקים"
              filename="contracts"
            />
            <Button variant="outline" size="sm" onClick={() => contractsQuery.refetch()}>
              <RefreshCw className={cn('w-4 h-4', contractsQuery.isFetching && 'animate-spin')} />
            </Button>
            <Button
              onClick={() => setShowCreateDialog(true)}
              className="bg-[#3b82f6] hover:bg-[#2563eb] gap-2"
            >
              <Plus className="w-4 h-4" />
              חוזה חדש
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-white">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-[#111827]">{stats.active.length}</div>
                    <div className="text-xs text-[#6b7280]">חוזים פעילים</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-[#111827]">
                      {stats.expiringSoon.length}
                    </div>
                    <div className="text-xs text-[#6b7280]">פג תוקף בקרוב</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-[#111827]">{stats.pending.length}</div>
                    <div className="text-xs text-[#6b7280]">ממתינים לאישור</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                    <XCircle className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-[#111827]">{stats.expired.length}</div>
                    <div className="text-xs text-[#6b7280]">פגי תוקף</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Expiring Soon Alert */}
          {stats.expiringSoon.length > 0 && (
            <Card className="bg-orange-50 border-orange-200">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Bell className="w-5 h-5 text-orange-600 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-orange-800">חוזים שפג תוקפם בקרוב</h3>
                    <div className="mt-2 space-y-1">
                      {stats.expiringSoon.slice(0, 3).map((contract) => (
                        <div key={contract.id} className="text-sm text-orange-700">
                          <span className="font-medium">{contract.vendor_name}</span>
                          {' - '}
                          פג תוקף ב-{format(new Date(contract.end_date), 'dd/MM/yyyy')} (
                          {differenceInDays(new Date(contract.end_date), new Date())} ימים)
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Filters */}
          <Card className="bg-white">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="חיפוש לפי שם ספק או מספר חוזה..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pr-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="סטטוס" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">כל הסטטוסים</SelectItem>
                    <SelectItem value="active">פעיל</SelectItem>
                    <SelectItem value="pending_approval">ממתין לאישור</SelectItem>
                    <SelectItem value="expired">פג תוקף</SelectItem>
                    <SelectItem value="suspended">מושהה</SelectItem>
                    <SelectItem value="draft">טיוטה</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Contracts Table */}
          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#6b7280]" />
                רשימת חוזים ({filteredContracts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={contractColumns}
                data={filteredContracts}
                emptyMessage="לא נמצאו חוזים"
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Pricing Tab ─── */}
        <TabsContent value="pricing" className="mt-6">
          <PricingTab vendors={vendors} />
        </TabsContent>
      </Tabs>

      {/* Dialogs (contracts) */}
      <ContractFormDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        vendors={vendors}
        onSuccess={handleContractCreated}
      />
      <ContractDetailsDialog
        open={showDetailsDialog}
        onOpenChange={setShowDetailsDialog}
        contract={selectedContract}
        onUpdate={() => {
          queryClient.invalidateQueries({ queryKey: ['vendorContracts'] });
        }}
      />
    </div>
  );
}
