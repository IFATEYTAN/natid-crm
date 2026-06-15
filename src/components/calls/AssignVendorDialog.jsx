import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { useVendors } from '@/components/features/vendors/hooks/useVendors';
import { usePermissions } from '@/components/permissions/PermissionsContext';
import { useAuditLog } from '@/components/hooks/useAuditLog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Truck, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

/**
 * דיאלוג שיבוץ ספק לקריאה - לשימוש חוזר מרשימת הקריאות ומכל מסך אחר.
 * מאפשר שיבוץ אוטומטי לפי מיקום (autoAssignVendor) או בחירה ידנית של ספק זמין.
 *
 * @param {object} props
 * @param {object} props.call - אובייקט הקריאה לשיבוץ
 * @param {boolean} props.open
 * @param {(open:boolean)=>void} props.onOpenChange
 */
export default function AssignVendorDialog({ call, open, onOpenChange }) {
  const queryClient = useQueryClient();
  const { currentUser, hasPermission } = usePermissions();
  const { logAction } = useAuditLog();
  const canAssign = hasPermission('calls', 'assign');

  const vendorsQuery = useVendors({ enabled: open });
  const vendors = vendorsQuery.data || [];
  const availableVendors = vendors.filter((v) => v.is_available_now && v.is_active);

  const [selectedVendor, setSelectedVendor] = useState('');
  const [autoAssigning, setAutoAssigning] = useState(false);
  const [autoAssignInfo, setAutoAssignInfo] = useState(null);
  const [assigning, setAssigning] = useState(false);

  const callId = call?.id;

  const handleClose = (next) => {
    if (!next) {
      setSelectedVendor('');
      setAutoAssignInfo(null);
    }
    onOpenChange(next);
  };

  // שיבוץ אוטומטי לפי מיקום - מריץ את מנוע הניקוד בצד השרת ובוחר מראש את הספק המומלץ.
  const handleAutoAssign = async () => {
    if (!canAssign || !callId) return;
    setAutoAssigning(true);
    setAutoAssignInfo(null);
    try {
      const res = await base44.functions.invoke('autoAssignVendor', { call_id: callId });
      const data = res?.data || res;
      if (!data?.success || !data?.recommendation) {
        toast.error(
          data?.error === 'No available vendors'
            ? 'אין ספקים זמינים כרגע'
            : 'לא נמצא ספק מתאים לשיבוץ אוטומטי'
        );
        return;
      }
      const rec = data.recommendation;
      setSelectedVendor(rec.vendor_id);
      setAutoAssignInfo({
        vendor_name: rec.vendor_name,
        distance_km: rec.details?.distance_km ?? rec.details?.route_distance_km ?? null,
        eta: rec.estimated_arrival_minutes ?? null,
        score: rec.score ?? null,
      });
      toast.success(`הומלץ אוטומטית: ${rec.vendor_name}. לחצי "שבץ" לאישור.`);
    } catch (error) {
      toast.error(`שיבוץ אוטומטי נכשל: ${error?.message || 'שגיאה לא ידועה'}`);
    } finally {
      setAutoAssigning(false);
    }
  };

  const handleAssignVendor = async () => {
    if (!selectedVendor || !canAssign || !callId) return;
    setAssigning(true);
    try {
      // רענון הקריאה רגע לפני השיבוץ כדי לזהות שיבוץ מקביל של מוקדן אחר.
      let fresh;
      try {
        fresh = await base44.entities.Call.get(callId);
      } catch (error) {
        toast.error(`לא ניתן לאמת את מצב הקריאה: ${error?.message || 'שגיאת רשת'}`);
        return;
      }

      const lockedStatuses = [
        'assigning',
        'assigned',
        'vendor_enroute',
        'vendor_arrived',
        'in_progress',
      ];
      if (
        fresh?.assigned_vendor_id &&
        fresh.assigned_vendor_id !== selectedVendor &&
        lockedStatuses.includes(fresh.call_status)
      ) {
        toast.error(`הקריאה כבר שובצה ל-${fresh.assigned_vendor_name || 'ספק אחר'}. רענני את הדף.`);
        queryClient.invalidateQueries({ queryKey: queryKeys.calls.all() });
        handleClose(false);
        return;
      }

      const vendor = vendors.find((v) => v.id === selectedVendor);
      await base44.entities.Call.update(callId, {
        assigned_vendor_id: selectedVendor,
        assigned_vendor_name: vendor?.vendor_name,
        assigned_at: new Date().toISOString(),
        call_status: 'assigning',
      });

      queryClient.invalidateQueries({ queryKey: queryKeys.calls.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.calls.single(callId) });

      logAction({
        action: 'assign',
        entity_type: 'Call',
        entity_id: callId,
        entity_name: call?.call_number,
        details: `Assigned to ${vendor?.vendor_name}`,
      });

      base44.entities.CallHistory.create({
        call_id: callId,
        call_number: call?.call_number,
        change_type: 'vendor_assignment',
        new_value: vendor?.vendor_name,
        changed_by: currentUser?.full_name || 'operator',
      });

      toast.success(`הקריאה שובצה ל-${vendor?.vendor_name}`);
      handleClose(false);
    } catch (error) {
      toast.error(`השיבוץ נכשל: ${error?.message || 'שגיאה לא ידועה'}`);
    } finally {
      setAssigning(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5" />
            שיבוץ ספק לקריאה
          </DialogTitle>
          <DialogDescription>
            {call?.call_number ? `קריאה ${call.call_number}` : 'בחר ספק זמין לטיפול בקריאה'}
            {call?.customer_name ? ` · ${call.customer_name}` : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="rounded-lg border border-indigo-200 bg-indigo-50/50 p-3 space-y-2">
            <Button
              onClick={handleAutoAssign}
              disabled={autoAssigning || !canAssign}
              className="w-full gap-2 bg-indigo-600 hover:bg-indigo-700"
            >
              {autoAssigning ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {autoAssigning ? 'מחשב מיקום ומרחק...' : 'שיבוץ אוטומטי לפי מיקום'}
            </Button>
            {autoAssignInfo && (
              <p className="text-xs text-indigo-800">
                מומלץ: <span className="font-semibold">{autoAssignInfo.vendor_name}</span>
                {autoAssignInfo.distance_km != null && ` · ${autoAssignInfo.distance_km} ק"מ`}
                {autoAssignInfo.eta != null && ` · הגעה ~${autoAssignInfo.eta} דק'`}
                {autoAssignInfo.score != null && ` · ציון ${autoAssignInfo.score}`}
              </p>
            )}
          </div>

          <div>
            <Label>או בחר ספק ידנית</Label>
            <Select value={selectedVendor} onValueChange={setSelectedVendor}>
              <SelectTrigger>
                <SelectValue placeholder="בחר ספק" />
              </SelectTrigger>
              <SelectContent>
                {availableVendors.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-gray-400">אין ספקים זמינים כרגע</div>
                ) : (
                  availableVendors.map((vendor) => (
                    <SelectItem key={vendor.id} value={vendor.id}>
                      {vendor.vendor_name}
                      {vendor.coverage_cities ? ` - ${vendor.coverage_cities}` : ''}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => handleClose(false)}>
            ביטול
          </Button>
          <Button
            onClick={handleAssignVendor}
            disabled={!selectedVendor || assigning || !canAssign}
            className="bg-[#FF0000] hover:bg-[#CC0000]"
          >
            {assigning ? 'משבץ...' : 'שבץ'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
