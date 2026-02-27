import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { queryKeys } from '@/lib/queryKeys';
import { coverageLabels as areaLabels } from '@/config/coverageConstants';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
import ContractFormDialog from './ContractFormDialog';
import {
  FileText,
  Calendar,
  DollarSign,
  MapPin,
  Shield,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  Pencil,
  Truck,
  History,
  RefreshCw,
  Ban,
  Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, differenceInDays } from 'date-fns';
import { showToast } from '@/components/ui/FeedbackToast';

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

const paymentTermsLabels = {
  net_0: 'מיידי',
  net_15: 'שוטף + 15',
  net_30: 'שוטף + 30',
  net_45: 'שוטף + 45',
  net_60: 'שוטף + 60',
};

const serviceLabels = {
  towing: 'גרירה',
  flat_tire: 'החלפת גלגל',
  battery_jump: 'הנעה ממצבר',
  fuel_delivery: 'הבאת דלק',
  locksmith: 'מנעולן',
  mechanic: 'מכונאי',
};

export default function ContractDetailsDialog({ open, onOpenChange, contract, onUpdate }) {
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showTerminateDialog, setShowTerminateDialog] = useState(false);
  const queryClient = useQueryClient();

  const vendorsQuery = useQuery({
    queryKey: queryKeys.vendors.all(),
    queryFn: () => base44.entities.Vendor.list(),
  });

  // Get contract history (all contracts for this vendor)
  const historyQuery = useQuery({
    queryKey: queryKeys.vendors.contractHistory(contract?.vendor_id),
    queryFn: () =>
      base44.entities.VendorContract.filter({ vendor_id: contract.vendor_id }, '-created_date'),
    enabled: !!contract?.vendor_id,
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.VendorContract.update(contract.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vendorContracts.all() });
      onUpdate?.();
    },
  });

  const handleActivate = () => {
    updateMutation.mutate({ status: 'active' });
    showToast.success('החוזה הופעל');
  };

  const handleSuspend = () => {
    updateMutation.mutate({ status: 'suspended' });
    showToast.success('החוזה הושהה');
  };

  const handleTerminate = () => {
    updateMutation.mutate({ status: 'terminated' });
    setShowTerminateDialog(false);
    showToast.success('החוזה בוטל');
  };

  const handleRenew = async () => {
    const newEndDate = new Date(contract.end_date);
    newEndDate.setMonth(newEndDate.getMonth() + (contract.renewal_period_months || 12));

    updateMutation.mutate({
      end_date: newEndDate.toISOString().split('T')[0],
      status: 'active',
    });
    showToast.success('החוזה חודש');
  };

  if (!contract) return null;

  const config = statusConfig[contract.status];
  const StatusIcon = config?.icon || FileText;
  const daysToExpiry = differenceInDays(new Date(contract.end_date), new Date());
  const history = historyQuery.data || [];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto text-end" dir="rtl">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div>
                <DialogTitle className="flex items-center gap-2 text-xl">
                  <FileText className="w-5 h-5" />
                  חוזה {contract.contract_number || `#${contract.id?.slice(-6)}`}
                </DialogTitle>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className={cn('gap-1', config?.color)}>
                    <StatusIcon className="w-3 h-3" />
                    {config?.label}
                  </Badge>
                  {contract.status === 'active' && daysToExpiry <= 30 && daysToExpiry > 0 && (
                    <Badge variant="outline" className="text-orange-600 border-orange-300 gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      פג תוקף בעוד {daysToExpiry} ימים
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowEditDialog(true)}>
                  <Pencil className="w-4 h-4 ms-1" />
                  ערוך
                </Button>
              </div>
            </div>
          </DialogHeader>

          <Tabs defaultValue="details" className="w-full mt-4" dir="rtl">
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="details">פרטים</TabsTrigger>
              <TabsTrigger value="pricing">תמחור</TabsTrigger>
              <TabsTrigger value="coverage">כיסוי ו-SLA</TabsTrigger>
              <TabsTrigger value="history">היסטוריה ({history.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4 mt-4 text-end" dir="rtl">
              {/* Vendor Info */}
              <div className="p-4 bg-gray-50 rounded-lg flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <Truck className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{contract.vendor_name}</h3>
                    <p className="text-sm text-gray-600">
                      {contractTypeLabels[contract.contract_type]}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {contract.document_url && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(contract.document_url, '_blank')}
                      title="הורד מסמך"
                    >
                      <Download className="w-4 h-4 text-gray-600" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 text-gray-600 mb-1">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm">תאריך התחלה</span>
                  </div>
                  <p className="font-medium">
                    {format(new Date(contract.start_date), 'dd/MM/yyyy')}
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 text-gray-600 mb-1">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm">תאריך סיום</span>
                  </div>
                  <p className="font-medium">{format(new Date(contract.end_date), 'dd/MM/yyyy')}</p>
                </div>
              </div>

              {/* Auto Renew */}
              {contract.auto_renew && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-green-600" />
                  <span className="text-green-800 text-sm">
                    חידוש אוטומטי כל {contract.renewal_period_months || 12} חודשים
                  </span>
                </div>
              )}

              {/* Special Terms */}
              {contract.special_terms && (
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">תנאים מיוחדים</h4>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">
                    {contract.special_terms}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t">
                {contract.status === 'draft' && (
                  <Button onClick={handleActivate} className="bg-green-600 hover:bg-green-700">
                    <CheckCircle className="w-4 h-4 ms-1" />
                    הפעל חוזה
                  </Button>
                )}
                {contract.status === 'pending_approval' && (
                  <Button onClick={handleActivate} className="bg-green-600 hover:bg-green-700">
                    <CheckCircle className="w-4 h-4 ms-1" />
                    אשר והפעל
                  </Button>
                )}
                {contract.status === 'active' && (
                  <>
                    <Button variant="outline" onClick={handleSuspend}>
                      <Clock className="w-4 h-4 ms-1" />
                      השהה
                    </Button>
                    <Button
                      variant="outline"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => setShowTerminateDialog(true)}
                    >
                      <Ban className="w-4 h-4 ms-1" />
                      בטל חוזה
                    </Button>
                  </>
                )}
                {contract.status === 'suspended' && (
                  <Button onClick={handleActivate} className="bg-green-600 hover:bg-green-700">
                    <CheckCircle className="w-4 h-4 ms-1" />
                    הפעל מחדש
                  </Button>
                )}
                {(contract.status === 'expired' ||
                  (contract.status === 'active' && daysToExpiry <= 30)) && (
                  <Button onClick={handleRenew} className="bg-blue-600 hover:bg-blue-700">
                    <RefreshCw className="w-4 h-4 ms-1" />
                    חדש חוזה
                  </Button>
                )}
              </div>
            </TabsContent>

            <TabsContent value="pricing" className="space-y-4 mt-4 text-end" dir="rtl">
              {/* Main Rate */}
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2 text-blue-800 mb-2">
                  <DollarSign className="w-5 h-5" />
                  <h4 className="font-medium">תעריף עיקרי</h4>
                </div>
                <div className="text-3xl font-bold text-blue-900">
                  {contract.contract_type === 'monthly' &&
                    `₪${contract.monthly_fee?.toLocaleString() || 0}/חודש`}
                  {contract.contract_type === 'hourly' &&
                    `₪${contract.hourly_rate?.toLocaleString() || 0}/שעה`}
                  {contract.contract_type === 'per_call' &&
                    `₪${contract.rate_per_call?.toLocaleString() || 0}/קריאה`}
                  {contract.contract_type === 'yearly' &&
                    `₪${contract.monthly_fee?.toLocaleString() || 0}/שנה`}
                </div>
              </div>

              {/* Limits */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-gray-600">מינימום קריאות</p>
                  <p className="text-xl font-bold">{contract.minimum_calls || '-'}</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-gray-600">מקסימום קריאות</p>
                  <p className="text-xl font-bold">{contract.maximum_calls || '-'}</p>
                </div>
              </div>

              {/* Bonus */}
              {contract.bonus_threshold > 0 && (
                <div className="p-4 bg-green-50 rounded-lg">
                  <h4 className="font-medium text-green-800 mb-2">בונוס</h4>
                  <p className="text-sm text-green-700">
                    {contract.bonus_rate}% בונוס מעל {contract.bonus_threshold} קריאות
                  </p>
                </div>
              )}

              {/* Penalties */}
              {(contract.penalty_late_arrival > 0 || contract.penalty_cancellation > 0) && (
                <div className="p-4 bg-red-50 rounded-lg">
                  <h4 className="font-medium text-red-800 mb-2">קנסות</h4>
                  <div className="space-y-1 text-sm text-red-700">
                    {contract.penalty_late_arrival > 0 && (
                      <p>קנס איחור: ₪{contract.penalty_late_arrival}</p>
                    )}
                    {contract.penalty_cancellation > 0 && (
                      <p>קנס ביטול: ₪{contract.penalty_cancellation}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Payment Terms */}
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-gray-600">תנאי תשלום</p>
                <p className="font-medium">
                  {paymentTermsLabels[contract.payment_terms] || contract.payment_terms}
                </p>
              </div>
            </TabsContent>

            <TabsContent value="coverage" className="space-y-4 mt-4 text-end" dir="rtl">
              {/* Coverage Areas */}
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="w-4 h-4 text-gray-600" />
                  <h4 className="font-medium">אזורי כיסוי</h4>
                </div>
                <div className="flex flex-wrap gap-2">
                  {contract.coverage_areas?.map((area) => (
                    <Badge key={area} variant="secondary">
                      {areaLabels[area] || area}
                    </Badge>
                  ))}
                  {(!contract.coverage_areas || contract.coverage_areas.length === 0) && (
                    <span className="text-gray-500 text-sm">לא הוגדרו אזורים</span>
                  )}
                </div>
              </div>

              {/* Service Types */}
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-3">סוגי שירות</h4>
                <div className="flex flex-wrap gap-2">
                  {contract.service_types?.map((service) => (
                    <Badge key={service} variant="outline">
                      {serviceLabels[service] || service}
                    </Badge>
                  ))}
                  {(!contract.service_types || contract.service_types.length === 0) && (
                    <span className="text-gray-500 text-sm">לא הוגדרו שירותים</span>
                  )}
                </div>
              </div>

              {/* SLA */}
              <div className="p-4 bg-purple-50 rounded-lg">
                <h4 className="font-medium text-purple-800 mb-3">SLA - רמת שירות</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-purple-600">זמן תגובה מקסימלי</p>
                    <p className="text-xl font-bold text-purple-900">
                      {contract.sla_response_minutes || '-'} דקות
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-purple-600">זמן הגעה מקסימלי</p>
                    <p className="text-xl font-bold text-purple-900">
                      {contract.sla_arrival_minutes || '-'} דקות
                    </p>
                  </div>
                </div>
              </div>

              {/* Insurance */}
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-gray-600" />
                  <h4 className="font-medium">דרישות ביטוח</h4>
                </div>
                {contract.insurance_required ? (
                  <p className="text-sm">
                    נדרש ביטוח בסכום מינימלי של ₪
                    {contract.insurance_minimum_amount?.toLocaleString()}
                  </p>
                ) : (
                  <p className="text-sm text-gray-500">לא נדרש ביטוח</p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="history" className="mt-4 text-end" dir="rtl">
              <div className="space-y-3">
                {history.map((item, idx) => (
                  <div
                    key={item.id}
                    className={cn(
                      'p-4 border rounded-lg',
                      item.id === contract.id && 'border-blue-500 bg-blue-50'
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {item.contract_number || `#${item.id?.slice(-6)}`}
                          </span>
                          {item.id === contract.id && <Badge className="bg-blue-500">נוכחי</Badge>}
                          <Badge className={statusConfig[item.status]?.color}>
                            {statusConfig[item.status]?.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {format(new Date(item.start_date), 'dd/MM/yyyy')} -{' '}
                          {format(new Date(item.end_date), 'dd/MM/yyyy')}
                        </p>
                      </div>
                      <div className="text-start">
                        <p className="text-sm text-gray-600">
                          {contractTypeLabels[item.contract_type]}
                        </p>
                        <p className="font-medium">
                          {item.contract_type === 'monthly' &&
                            `₪${item.monthly_fee?.toLocaleString() || 0}/חודש`}
                          {item.contract_type === 'per_call' &&
                            `₪${item.rate_per_call?.toLocaleString() || 0}/קריאה`}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {history.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <History className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>אין היסטוריית חוזים</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <ContractFormDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        vendors={vendorsQuery.data || []}
        contract={contract}
        onSuccess={() => {
          setShowEditDialog(false);
          onUpdate?.();
          showToast.success('החוזה עודכן');
        }}
      />

      {/* Terminate Confirmation */}
      <AlertDialog open={showTerminateDialog} onOpenChange={setShowTerminateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ביטול חוזה</AlertDialogTitle>
            <AlertDialogDescription>
              האם אתה בטוח שברצונך לבטל את החוזה עם {contract.vendor_name}? פעולה זו לא ניתנת
              לביטול.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction onClick={handleTerminate} className="bg-red-600 hover:bg-red-700">
              בטל חוזה
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
