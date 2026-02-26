import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import StatCard from '@/components/ui/StatCard';
import { createPageUrl } from '@/utils';
import {
  MapPin,
  Phone,
  Mail,
  Star,
  Activity,
  DollarSign,
  Edit2,
  CheckCircle2,
  User,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { he } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { getCoverageLabel } from '@/config/coverageConstants';

export default function MyVendorProfile() {
  const queryClient = useQueryClient();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({});

  // 1. Get Current User
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // 2. Get Vendor associated with user email
  const { data: vendor, isLoading: vendorLoading } = useQuery({
    queryKey: ['my-vendor-profile', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      // Assuming vendor email matches user email
      const vendors = await base44.entities.Vendor.filter(
        { email: user.email },
        '-created_date',
        1
      );
      return vendors[0] || null;
    },
    enabled: !!user?.email,
  });

  const vendorId = vendor?.id;

  // 3. Data Queries
  const { data: calls = [], isLoading: callsLoading } = useQuery({
    queryKey: ['my-vendor-calls', vendorId],
    queryFn: () =>
      base44.entities.Call.filter({ assigned_vendor_id: vendorId }, '-created_date', 50),
    enabled: !!vendorId,
  });

  const { data: ratings = [] } = useQuery({
    queryKey: ['my-vendor-ratings', vendorId],
    queryFn: () =>
      base44.entities.VendorRating.filter({ vendor_id: vendorId }, '-created_date', 20),
    enabled: !!vendorId,
  });

  const { data: payments = [] } = useQuery({
    queryKey: ['my-vendor-payments', vendorId],
    queryFn: () =>
      base44.entities.VendorPayment.filter({ vendor_id: vendorId }, '-created_date', 20),
    enabled: !!vendorId,
  });

  const { data: location } = useQuery({
    queryKey: ['my-vendor-location', vendorId],
    queryFn: async () => {
      const locations = await base44.entities.VendorLocation.filter(
        { vendor_id: vendorId },
        '-created_date',
        1
      );
      return locations[0];
    },
    enabled: !!vendorId,
  });

  // 4. Mutations
  const updateVendorMutation = useMutation({
    mutationFn: (data) => base44.entities.Vendor.update(vendorId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['my-vendor-profile']);
      toast.success('הפרופיל עודכן בהצלחה');
      setIsEditOpen(false);
    },
    onError: () => toast.error('שגיאה בעדכון הפרופיל'),
  });

  const toggleAvailabilityMutation = useMutation({
    mutationFn: (newStatus) =>
      base44.entities.Vendor.update(vendorId, {
        is_available_now: newStatus,
        availability_status: newStatus ? 'available' : 'offline',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries(['my-vendor-profile']);
      toast.success('סטטוס זמינות עודכן');
    },
  });

  // Effects
  useEffect(() => {
    if (vendor) {
      setEditForm({
        vendor_name: vendor.vendor_name,
        contact_person: vendor.contact_person,
        phone: vendor.phone,
        phone_2: vendor.phone_2,
        email: vendor.email,
      });
    }
  }, [vendor]);

  // Handlers
  const handleEditSubmit = (e) => {
    e.preventDefault();
    updateVendorMutation.mutate(editForm);
  };

  if (vendorLoading) {
    return (
      <div className="p-8">
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!vendor && !vendorLoading && user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="bg-red-50 p-4 rounded-full mb-4">
          <User className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-xl font-bold mb-2">לא נמצא פרופיל ספק</h2>
        <p className="text-gray-500 max-w-md">
          לא מצאנו פרופיל ספק המקושר לכתובת האימייל שלך ({user.email}). אנא פנה למנהל המערכת לחיבור
          המשתמש שלך.
        </p>
      </div>
    );
  }

  if (!user) return null;

  // Calculations
  const completedCalls = calls.filter((c) => c.call_status === 'completed').length;
  const avgRating =
    ratings.length > 0
      ? (ratings.reduce((acc, r) => acc + r.overall_rating, 0) / ratings.length).toFixed(1)
      : vendor.average_rating || 0;

  // Columns Definitions
  const callColumns = [
    {
      header: 'מספר קריאה',
      accessor: 'call_number',
      cell: (row) => (
        <span className="font-semibold text-[#0078D4]">
          {row.call_number || row.id.substring(0, 8)}
        </span>
      ),
    },
    { header: 'לקוח', accessor: 'customer_name' },
    { header: 'סטטוס', cell: (row) => <StatusBadge status={row.call_status} size="sm" /> },
    {
      header: 'תאריך',
      cell: (row) =>
        row.created_date ? format(parseISO(row.created_date), 'dd/MM/yyyy', { locale: he }) : '-',
    },
  ];

  const ratingColumns = [
    { header: 'קריאה', accessor: 'call_number' },
    {
      header: 'דירוג',
      cell: (row) => (
        <div className="flex items-center gap-1">
          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
          <span className="font-medium">{row.overall_rating}</span>
        </div>
      ),
    },
    { header: 'משוב', accessor: 'feedback', cell: (row) => row.feedback || '-' },
    {
      header: 'תאריך',
      cell: (row) =>
        row.created_date ? format(parseISO(row.created_date), 'dd/MM/yyyy', { locale: he }) : '-',
    },
  ];

  const paymentColumns = [
    {
      header: 'סוג',
      cell: (row) => {
        const types = {
          call_payment: 'תשלום קריאה',
          monthly_fee: 'דמי חודש',
          bonus: 'בונוס',
          adjustment: 'התאמה',
        };
        return types[row.payment_type] || row.payment_type;
      },
    },
    { header: 'סכום', cell: (row) => `₪${row.amount.toLocaleString()}` },
    { header: 'סטטוס', cell: (row) => <StatusBadge status={row.status} size="sm" /> },
    {
      header: 'תאריך',
      cell: (row) =>
        row.created_date ? format(parseISO(row.created_date), 'dd/MM/yyyy', { locale: he }) : '-',
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Card */}
      <Card className="border-none shadow-sm bg-gradient-to-r from-blue-50 to-white">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center border-2 border-white shadow-sm">
                <User className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{vendor.vendor_name}</h1>
                <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                  <MapPin className="w-3 h-3" />
                  {vendor.coverage_areas?.map(getCoverageLabel).join(', ') || 'אין אזורי כיסוי'}
                </div>
              </div>
            </div>

            <div className="flex flex-col items-end gap-3">
              <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-full border shadow-sm">
                <span
                  className={`text-sm font-medium ${vendor.is_available_now ? 'text-green-600' : 'text-gray-500'}`}
                >
                  {vendor.is_available_now ? 'זמין לקריאות' : 'לא זמין'}
                </span>
                <Switch
                  checked={vendor.is_available_now}
                  onCheckedChange={(checked) => toggleAvailabilityMutation.mutate(checked)}
                />
              </div>
              <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Edit2 className="w-3 h-3" />
                    ערוך פרטים
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>עריכת פרטי ספק</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleEditSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>שם ספק/חברה</Label>
                      <Input
                        value={editForm.vendor_name || ''}
                        onChange={(e) => setEditForm({ ...editForm, vendor_name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>איש קשר</Label>
                      <Input
                        value={editForm.contact_person || ''}
                        onChange={(e) =>
                          setEditForm({ ...editForm, contact_person: e.target.value })
                        }
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>טלפון</Label>
                        <Input
                          value={editForm.phone || ''}
                          onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>טלפון נוסף</Label>
                        <Input
                          value={editForm.phone_2 || ''}
                          onChange={(e) => setEditForm({ ...editForm, phone_2: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>אימייל</Label>
                      <Input
                        value={editForm.email || ''}
                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                        disabled
                        className="bg-gray-50"
                      />
                      <p className="text-xs text-gray-500">לא ניתן לשנות אימייל באופן עצמאי</p>
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                        ביטול
                      </Button>
                      <Button type="submit" disabled={updateVendorMutation.isPending}>
                        {updateVendorMutation.isPending ? 'שומר...' : 'שמור שינויים'}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="קריאות שהושלמו"
          value={completedCalls}
          icon={CheckCircle2}
          variant="success"
          to={createPageUrl('VendorCallManagement')}
        />
        <StatCard
          title="דירוג ממוצע"
          value={avgRating}
          icon={Star}
          variant="warning"
          to={createPageUrl('CustomerFeedback')}
        />
        <StatCard
          title="תשלומים ממתינים"
          value={`₪${vendor.pending_payments?.toLocaleString() || 0}`}
          icon={DollarSign}
          variant="info"
          to={createPageUrl('VendorCallManagement')}
        />
        <StatCard
          title="זמן תגובה ממוצע"
          value={
            vendor.average_response_time ? `${Math.round(vendor.average_response_time)} דק'` : '-'
          }
          icon={Activity}
          variant="primary"
          to={createPageUrl('Reports')}
        />
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="details" className="space-y-4">
        <TabsList className="bg-white border w-full justify-start h-12 p-1">
          <TabsTrigger value="details" className="data-[state=active]:bg-gray-100">
            פרטים נוספים
          </TabsTrigger>
          <TabsTrigger value="calls" className="data-[state=active]:bg-gray-100">
            היסטוריית קריאות
          </TabsTrigger>
          <TabsTrigger value="payments" className="data-[state=active]:bg-gray-100">
            תשלומים
          </TabsTrigger>
          <TabsTrigger value="ratings" className="data-[state=active]:bg-gray-100">
            דירוגים ומשוב
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">פרטי התקשרות</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">טלפון ראשי</p>
                    <p className="font-medium">{vendor.phone}</p>
                  </div>
                </div>
                {vendor.phone_2 && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">טלפון משני</p>
                      <p className="font-medium">{vendor.phone_2}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">אימייל</p>
                    <p className="font-medium">{vendor.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">איש קשר</p>
                    <p className="font-medium">{vendor.contact_person || '-'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">מידע מערכתי</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between border-b pb-2">
                  <span className="text-gray-500">סטטוס במערכת</span>
                  <StatusBadge status={vendor.is_active ? 'active' : 'inactive'} />
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-gray-500">מספר ספק</span>
                  <span className="font-mono text-sm">{vendor.id?.substring(0, 8)}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-gray-500">תאריך הצטרפות</span>
                  <span>
                    {vendor.created_date
                      ? format(parseISO(vendor.created_date), 'dd/MM/yyyy')
                      : '-'}
                  </span>
                </div>
                {location && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">מיקום אחרון</span>
                    <span className="text-sm text-blue-600 dir-ltr flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {format(parseISO(location.created_date), 'HH:mm dd/MM')}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="calls">
          <Card>
            <CardContent className="p-0">
              <DataTable
                columns={callColumns}
                data={calls}
                isLoading={callsLoading}
                emptyMessage="לא נמצאו קריאות"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardContent className="p-0">
              <DataTable columns={paymentColumns} data={payments} emptyMessage="לא נמצאו תשלומים" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ratings">
          <Card>
            <CardContent className="p-0">
              <DataTable columns={ratingColumns} data={ratings} emptyMessage="טרם התקבלו דירוגים" />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
