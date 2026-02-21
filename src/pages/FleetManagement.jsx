import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Truck,
  Plus,
  Search,
  Pencil,
  Power,
  PowerOff,
  Car,
  AlertTriangle,
  Phone,
} from 'lucide-react';
import { toast } from 'sonner';
import { SlideUp } from '@/components/animations/AnimatedComponents';
import { PageLoader } from '@/components/ui/LoadingSpinner';

const typeLabels = {
  tow_truck: 'גרר',
  mobile_unit: 'ניידת',
};

const statusLabels = {
  active: 'פעיל',
  inactive: 'לא פעיל',
};

const statusBadgeColors = {
  active: 'bg-[#10b981] text-white',
  inactive: 'bg-[#6b7280] text-white',
};

const typeBadgeColors = {
  tow_truck: 'bg-[#f59e0b] text-white',
  mobile_unit: 'bg-[#3b82f6] text-white',
};

const emptyForm = {
  vehicle_number: '',
  name: '',
  type: 'tow_truck',
  status: 'active',
  service_area: '',
  driver_name: '',
  driver_phone: '',
  notes: '',
  is_internal: true,
};

export default function FleetManagementPage() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const {
    data: vehicles = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['fleet'],
    queryFn: () => base44.entities.FleetVehicle.list(),
  });

  const filtered = useMemo(() => {
    return vehicles.filter((v) => {
      const matchesSearch =
        !search ||
        v.name?.includes(search) ||
        v.vehicle_number?.includes(search) ||
        v.driver_name?.includes(search);
      const matchesType = filterType === 'all' || v.type === filterType;
      const matchesStatus = filterStatus === 'all' || v.status === filterStatus;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [vehicles, search, filterType, filterStatus]);

  const stats = useMemo(() => {
    const total = vehicles.length;
    const activeTowTrucks = vehicles.filter(
      (v) => v.type === 'tow_truck' && v.status === 'active'
    ).length;
    const activeMobileUnits = vehicles.filter(
      (v) => v.type === 'mobile_unit' && v.status === 'active'
    ).length;
    const inactive = vehicles.filter((v) => v.status === 'inactive').length;
    return { total, activeTowTrucks, activeMobileUnits, inactive };
  }, [vehicles]);

  const openCreate = () => {
    setEditingVehicle(null);
    setForm(emptyForm);
    setShowDialog(true);
  };

  const openEdit = (vehicle) => {
    setEditingVehicle(vehicle);
    setForm({
      vehicle_number: vehicle.vehicle_number || '',
      name: vehicle.name || '',
      type: vehicle.type || 'tow_truck',
      status: vehicle.status || 'active',
      service_area: vehicle.service_area || '',
      driver_name: vehicle.driver_name || '',
      driver_phone: vehicle.driver_phone || '',
      notes: vehicle.notes || '',
      is_internal: true,
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.vehicle_number || !form.name) {
      toast.error('יש למלא מספר רכב ושם');
      return;
    }
    setSaving(true);
    try {
      const data = { ...form, is_internal: true };
      if (editingVehicle) {
        await base44.entities.FleetVehicle.update(editingVehicle.id, data);
        toast.success('כלי רכב עודכן בהצלחה');
      } else {
        await base44.entities.FleetVehicle.create(data);
        toast.success('כלי רכב נוסף בהצלחה');
      }
      queryClient.invalidateQueries({ queryKey: ['fleet'] });
      setShowDialog(false);
    } catch (err) {
      console.error('Save fleet vehicle error:', err);
      toast.error('שגיאה בשמירת כלי רכב');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (vehicle) => {
    const newStatus = vehicle.status === 'active' ? 'inactive' : 'active';
    try {
      await base44.entities.FleetVehicle.update(vehicle.id, { status: newStatus });
      queryClient.invalidateQueries({ queryKey: ['fleet'] });
      toast.success(newStatus === 'active' ? 'כלי רכב הופעל' : 'כלי רכב הושבת');
    } catch (err) {
      console.error('Toggle status error:', err);
      toast.error('שגיאה בעדכון סטטוס');
    }
  };

  if (isLoading) {
    return <PageLoader text="טוען צי רכב..." />;
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <p className="text-red-500 text-lg font-medium mb-2">שגיאה בטעינת נתונים</p>
        <p className="text-gray-500 text-sm">{error?.message || 'נסה לרענן את הדף'}</p>
      </div>
    );
  }

  return (
    <SlideUp>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#111827] flex items-center gap-2">
              <Truck className="w-6 h-6 text-[#3b82f6]" />
              ניהול צי רכב
            </h1>
            <p className="text-[#6b7280] text-sm">ניהול גררים וניידות פנימיים של קבוצת נתי</p>
          </div>
          <Button onClick={openCreate} className="bg-[#3b82f6] hover:bg-[#2563eb] gap-2">
            <Plus className="w-4 h-4" />
            הוסף כלי רכב
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-white border border-[#e5e7eb]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[8px] bg-[#f3f4f6] flex items-center justify-center">
                  <Truck className="w-5 h-5 text-[#3b82f6]" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-[#111827]">{stats.total}</div>
                  <div className="text-sm text-[#6b7280]">סה"כ צי</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border border-[#e5e7eb]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[8px] bg-[#fffbeb] flex items-center justify-center">
                  <Truck className="w-5 h-5 text-[#f59e0b]" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-[#111827]">{stats.activeTowTrucks}</div>
                  <div className="text-sm text-[#6b7280]">גררים פעילים</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border border-[#e5e7eb]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[8px] bg-[#eff6ff] flex items-center justify-center">
                  <Car className="w-5 h-5 text-[#3b82f6]" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-[#111827]">{stats.activeMobileUnits}</div>
                  <div className="text-sm text-[#6b7280]">ניידות פעילות</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border border-[#e5e7eb]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[8px] bg-[#fef2f2] flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-[#ef4444]" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-[#111827]">{stats.inactive}</div>
                  <div className="text-sm text-[#6b7280]">לא פעילים</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter Bar */}
        <Card className="bg-white border border-[#e5e7eb]">
          <CardContent className="p-3">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6b7280]" />
                <Input
                  placeholder="חיפוש לפי שם, מספר רכב או נהג..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pr-10"
                />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-full md:w-[160px]">
                  <SelectValue placeholder="סוג רכב" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל הסוגים</SelectItem>
                  <SelectItem value="tow_truck">גרר</SelectItem>
                  <SelectItem value="mobile_unit">ניידת</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full md:w-[160px]">
                  <SelectValue placeholder="סטטוס" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל הסטטוסים</SelectItem>
                  <SelectItem value="active">פעיל</SelectItem>
                  <SelectItem value="inactive">לא פעיל</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Data Table */}
        <Card className="bg-white border border-[#e5e7eb]">
          <CardHeader>
            <CardTitle className="text-lg">רשימת כלי רכב ({filtered.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {filtered.length === 0 ? (
              <div className="text-center py-12 text-[#6b7280]">
                <Truck className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>לא נמצאו כלי רכב</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">מספר</TableHead>
                      <TableHead className="text-right">שם</TableHead>
                      <TableHead className="text-right">סוג</TableHead>
                      <TableHead className="text-right">סטטוס</TableHead>
                      <TableHead className="text-right">אזור שירות</TableHead>
                      <TableHead className="text-right">טלפון נהג</TableHead>
                      <TableHead className="text-right">פעולות</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((vehicle) => (
                      <TableRow
                        key={vehicle.id}
                        className={vehicle.status === 'inactive' ? 'opacity-60' : ''}
                      >
                        <TableCell className="font-medium">{vehicle.vehicle_number}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium text-[#111827]">{vehicle.name}</div>
                            {vehicle.driver_name && (
                              <div className="text-xs text-[#6b7280]">{vehicle.driver_name}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={typeBadgeColors[vehicle.type]}>
                            {typeLabels[vehicle.type] || vehicle.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusBadgeColors[vehicle.status]}>
                            {statusLabels[vehicle.status] || vehicle.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{vehicle.service_area || '-'}</TableCell>
                        <TableCell>
                          {vehicle.driver_phone ? (
                            <a
                              href={`tel:${vehicle.driver_phone}`}
                              className="flex items-center gap-1 text-[#3b82f6] hover:underline"
                              dir="ltr"
                            >
                              <Phone className="w-3 h-3" />
                              {vehicle.driver_phone}
                            </a>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-1 text-xs hover:bg-blue-50 text-blue-600"
                              onClick={() => openEdit(vehicle)}
                            >
                              <Pencil className="w-3 h-3" />
                              ערוך
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className={
                                vehicle.status === 'active'
                                  ? 'gap-1 text-xs hover:bg-red-50 text-red-500'
                                  : 'gap-1 text-xs hover:bg-green-50 text-green-600'
                              }
                              onClick={() => handleToggleStatus(vehicle)}
                            >
                              {vehicle.status === 'active' ? (
                                <>
                                  <PowerOff className="w-3 h-3" />
                                  השבת
                                </>
                              ) : (
                                <>
                                  <Power className="w-3 h-3" />
                                  הפעל
                                </>
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add/Edit Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingVehicle ? 'עריכת כלי רכב' : 'הוספת כלי רכב'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>מספר רכב</Label>
                  <Input
                    value={form.vehicle_number}
                    onChange={(e) => setForm({ ...form, vehicle_number: e.target.value })}
                    placeholder="לדוגמה: 12-345-67"
                    dir="ltr"
                  />
                </div>
                <div>
                  <Label>שם</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="שם כלי הרכב"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>סוג</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tow_truck">גרר</SelectItem>
                      <SelectItem value="mobile_unit">ניידת</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>סטטוס</Label>
                  <Select
                    value={form.status}
                    onValueChange={(v) => setForm({ ...form, status: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">פעיל</SelectItem>
                      <SelectItem value="inactive">לא פעיל</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>אזור שירות</Label>
                <Input
                  value={form.service_area}
                  onChange={(e) => setForm({ ...form, service_area: e.target.value })}
                  placeholder="לדוגמה: מרכז, צפון, דרום"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>שם נהג</Label>
                  <Input
                    value={form.driver_name}
                    onChange={(e) => setForm({ ...form, driver_name: e.target.value })}
                    placeholder="שם הנהג"
                  />
                </div>
                <div>
                  <Label>טלפון נהג</Label>
                  <Input
                    value={form.driver_phone}
                    onChange={(e) => setForm({ ...form, driver_phone: e.target.value })}
                    placeholder="050-0000000"
                    dir="ltr"
                  />
                </div>
              </div>
              <div>
                <Label>הערות</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="הערות נוספות..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                ביטול
              </Button>
              <Button onClick={handleSave} isLoading={saving}>
                {editingVehicle ? 'עדכן' : 'הוסף'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </SlideUp>
  );
}
