import React, { useState, useEffect, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { createPageUrl } from '@/components/utils';
import { lazyRetry } from '@/lib/lazyRetry';
import { useVendors } from '@/components/features/vendors/hooks/useVendors';
import { usePermissions } from '@/components/permissions/PermissionsContext';
import { useAuditLog } from '@/components/hooks/useAuditLog';
import { createContinuationCall } from '@/features/calls/createContinuationCall';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import CityAutocomplete from '@/components/forms/CityAutocomplete';
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
import { Truck, Sparkles, Loader2, Zap, Warehouse, RefreshCw, Plus } from 'lucide-react';
import { toast } from 'sonner';

const VendorRecommendation = lazyRetry(() => import('@/components/ai/VendorRecommendation'));

// סוג רכב השירות (סוג שיגור) - נבחר לפני בחירת הספק.
const DISPATCH_TYPES = [
  { key: 'mobile_unit', label: 'ניידת', icon: Zap, iconClass: 'text-blue-500' },
  { key: 'tow_truck', label: 'גרר', icon: Truck, iconClass: 'text-orange-500' },
  { key: 'tow_truck_storage', label: 'גרר עם אחסנה', icon: Warehouse, iconClass: 'text-stone-600' },
];

// זיהוי יכולות הספק לפי service_type - תומך גם בערכי מפתח (mobile_unit/tow_truck) וגם בתוויות בעברית.
const hasMobileService = (v) => {
  const types = Array.isArray(v.service_type) ? v.service_type : [v.service_type].filter(Boolean);
  return types.includes('mobile_unit') || types.some((t) => t === 'ניידת');
};

const hasTowService = (v) => {
  const types = Array.isArray(v.service_type) ? v.service_type : [v.service_type].filter(Boolean);
  return types.includes('tow_truck') || types.some((t) => t === 'גרירה' || t === 'גרר');
};

// סינון ספקים לפי סוג רכב השירות שנבחר - ניידת מציגה רק ספקי ניידת, גרר/גרר עם אחסנה מציגים רק ספקי גרר.
const filterVendorsByDispatchType = (vendorList, dispatchType) => {
  if (dispatchType === 'mobile_unit') return vendorList.filter(hasMobileService);
  if (dispatchType === 'tow_truck' || dispatchType === 'tow_truck_storage') {
    return vendorList.filter(hasTowService);
  }
  return vendorList;
};

// סטטוסים שבהם הקריאה כבר "תפוסה" על-ידי ספק משובץ.
const LOCKED_STATUSES = [
  'assigning',
  'assigned',
  'vendor_enroute',
  'vendor_arrived',
  'in_progress',
];

/**
 * דיאלוג שיבוץ ספק לקריאה - מקור יחיד לשימוש חוזר מרשימת הקריאות וממסך "צפה".
 *
 * תומך ב:
 *  - בחירת סוג רכב שירות (ניידת / גרר / גרר עם אחסנה) לפני בחירת הספק.
 *  - עריכת יעדים עבור "גרר עם אחסנה": מיקום אחסנה + יעד סופי (שתי רגליים).
 *  - שיבוץ אוטומטי לפי מיקום + המלצת AI + בחירה ידנית.
 *  - בקריאה שכבר משובצת: החלפת הספק הנוכחי, או פתיחת קריאת המשך מקושרת לספק נוסף.
 *
 * @param {object} props
 * @param {object} props.call - אובייקט הקריאה לשיבוץ
 * @param {boolean} props.open
 * @param {(open:boolean)=>void} props.onOpenChange
 */
export default function AssignVendorDialog({ call, open, onOpenChange }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currentUser, hasPermission } = usePermissions();
  const { logAction } = useAuditLog();
  const canAssign = hasPermission('calls', 'assign');

  const vendorsQuery = useVendors({ enabled: open });
  const vendors = vendorsQuery.data || [];
  const availableVendors = vendors.filter((v) => v.is_available_now && v.is_active);

  const [selectedVendor, setSelectedVendor] = useState('');
  const [dispatchType, setDispatchType] = useState('');
  const dispatchFilteredVendors = filterVendorsByDispatchType(availableVendors, dispatchType);
  const [autoAssigning, setAutoAssigning] = useState(false);
  const [autoAssignInfo, setAutoAssignInfo] = useState(null);
  const [assigning, setAssigning] = useState(false);
  // 'replace' = החלפת הספק הנוכחי באותה קריאה | 'continue' = פתיחת קריאת המשך לספק נוסף.
  // ברירת המחדל בקריאה משובצת היא "המשך" - הצורך העיקרי (ניידת ← גרר) ולא הרסני לקריאה הקיימת.
  const [mode, setMode] = useState('continue');
  // שדות יעד (גרר עם אחסנה / קריאת המשך).
  const [storageCity, setStorageCity] = useState('');
  const [storageAddress, setStorageAddress] = useState('');
  const [destCity, setDestCity] = useState('');
  const [destAddress, setDestAddress] = useState('');

  const callId = call?.id;
  // האם הקריאה כבר משובצת לספק פעיל (ואז מציעים החלפה / המשך במקום שיבוץ פשוט).
  const hasActiveVendor = !!call?.assigned_vendor_id && LOCKED_STATUSES.includes(call?.call_status);
  const isStorage = dispatchType === 'tow_truck_storage';
  // עריכת יעדים: לגרר עם אחסנה (אחסנה + יעד) או בכל קריאת המשך (יעד סופי).
  const showStorageField = isStorage;
  const showDestField = isStorage || (hasActiveVendor && mode === 'continue');

  // אתחול ערכי הדיאלוג בכל פתיחה - מתוך הקריאה.
  useEffect(() => {
    if (!open) return;
    setDispatchType(call?.dispatch_type || '');
    setMode('continue');
    setSelectedVendor('');
    setAutoAssignInfo(null);
    setStorageCity(call?.storage_location_city || '');
    setStorageAddress(call?.storage_location_address || '');
    setDestCity(call?.dropoff_location_city || '');
    setDestAddress(call?.dropoff_location_address || '');
  }, [open, call?.id]);

  // ניקוי בחירת ספק ידנית אם היא כבר לא מתאימה לסוג רכב השירות שנבחר.
  useEffect(() => {
    if (selectedVendor && !dispatchFilteredVendors.some((v) => v.id === selectedVendor)) {
      setSelectedVendor('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatchType]);

  const handleClose = (next) => {
    if (!next) {
      setSelectedVendor('');
      setAutoAssignInfo(null);
    }
    onOpenChange(next);
  };

  // שדות היעד לשמירה (אחסנה / יעד סופי) בהתאם לבחירה.
  const buildLocationUpdates = () => {
    const updates = {};
    if (showStorageField) {
      updates.storage_location_city = storageCity || undefined;
      updates.storage_location_address = storageAddress || undefined;
    }
    if (showDestField) {
      updates.dropoff_location_city = destCity || undefined;
      updates.dropoff_location_address = destAddress || undefined;
    }
    return updates;
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

  // פתיחת קריאת המשך מקושרת ושיבוץ הספק הנוסף אליה (סעיף 8).
  const handleContinue = async (vendor) => {
    const caseCode =
      call?.case_reference_code || call?.call_number || `EVT-${Date.now().toString().slice(-8)}`;
    const continuation = await createContinuationCall(base44, call, {
      serviceCategory: 'towing',
      caseCode,
      createdByName: currentUser?.full_name,
    });
    const extraUpdates = {
      ...(dispatchType ? { dispatch_type: dispatchType } : {}),
      ...buildLocationUpdates(),
    };
    if (Object.keys(extraUpdates).length > 0) {
      await base44.entities.Call.update(continuation.id, extraUpdates);
    }
    await base44.entities.Call.update(callId, { continuation_call_id: continuation.id });

    // Enqueue the continuation so it's tracked like any other call (QueueMonitor,
    // stale-assignment processing) — createContinuationCall only creates the Call.
    try {
      await base44.entities.WorkQueue.create({
        call_id: continuation.id,
        assigned_to_agent: null,
        queue_status: 'waiting_in_queue',
        priority_score:
          call?.call_priority === 'critical' ? 100 : call?.call_priority === 'urgent' ? 70 : 40,
        added_to_queue_at: new Date().toISOString(),
      });
    } catch {
      // Non-blocking: the continuation call still exists even if enqueue fails.
    }

    // Offer the continuation to the additional vendor (offer + accept model)
    const res = await base44.functions.invoke('assignVendorToCall', {
      call_id: continuation.id,
      vendor_id: selectedVendor,
    });
    const data = res?.data || res;
    if (!data?.success) {
      toast.error(
        data?.error === 'Vendor is not available' ? 'הספק אינו זמין' : 'שיבוץ ההמשך נכשל'
      );
      return;
    }

    logAction({
      action: 'assign',
      entity_type: 'Call',
      entity_id: continuation.id,
      entity_name: continuation.call_number,
      details: `קריאת המשך מקריאה ${call?.call_number} — הוצעה ל-${vendor?.vendor_name}`,
    });

    queryClient.invalidateQueries({ queryKey: queryKeys.calls.all() });
    queryClient.invalidateQueries({ queryKey: queryKeys.calls.single(callId) });
    toast.success(`נפתחה קריאת המשך והוצעה ל-${vendor?.vendor_name}`);
    handleClose(false);
    navigate(createPageUrl(`CallDetails?id=${continuation.id}`));
  };

  const handleAssignVendor = async () => {
    if (!selectedVendor || !canAssign || !callId) return;
    setAssigning(true);
    try {
      const vendor = vendors.find((v) => v.id === selectedVendor);

      // קריאת המשך לספק נוסף - לא נוגעים בקריאה / בספק המקורי.
      if (hasActiveVendor && mode === 'continue') {
        await handleContinue(vendor);
        return;
      }

      // רענון הקריאה רגע לפני השיבוץ כדי לזהות שיבוץ מקביל של מוקדן אחר.
      let fresh;
      try {
        fresh = await base44.entities.Call.get(callId);
      } catch (error) {
        toast.error(`לא ניתן לאמת את מצב הקריאה: ${error?.message || 'שגיאת רשת'}`);
        return;
      }

      // חסימת שיבוץ מקביל - רק כשלא מדובר בהחלפה מכוונת של ספק קיים.
      if (
        !hasActiveVendor &&
        fresh?.assigned_vendor_id &&
        fresh.assigned_vendor_id !== selectedVendor &&
        LOCKED_STATUSES.includes(fresh.call_status)
      ) {
        toast.error(`הקריאה כבר שובצה ל-${fresh.assigned_vendor_name || 'ספק אחר'}. רענני את הדף.`);
        queryClient.invalidateQueries({ queryKey: queryKeys.calls.all() });
        handleClose(false);
        return;
      }

      // Operator-set fields (location/dispatch) are applied directly; the assignment
      // itself goes through assignVendorToCall which creates an offer + notifies the vendor.
      const extraUpdates = {
        ...(dispatchType ? { dispatch_type: dispatchType } : {}),
        ...buildLocationUpdates(),
      };
      if (Object.keys(extraUpdates).length > 0) {
        await base44.entities.Call.update(callId, extraUpdates);
      }

      const res = await base44.functions.invoke('assignVendorToCall', {
        call_id: callId,
        vendor_id: selectedVendor,
      });
      const data = res?.data || res;
      if (!data?.success) {
        const msg =
          data?.error === 'Vendor is not available'
            ? 'הספק אינו זמין'
            : data?.error === 'Call already assigned to a vendor'
              ? `הקריאה כבר שובצה ל-${data?.assigned_vendor_name || 'ספק אחר'}`
              : 'השיבוץ נכשל';
        toast.error(msg);
        queryClient.invalidateQueries({ queryKey: queryKeys.calls.all() });
        return;
      }

      queryClient.invalidateQueries({ queryKey: queryKeys.calls.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.calls.single(callId) });

      logAction({
        action: 'assign',
        entity_type: 'Call',
        entity_id: callId,
        entity_name: call?.call_number,
        details: `Offered to ${vendor?.vendor_name}`,
      });

      toast.success(`הקריאה הוצעה ל-${vendor?.vendor_name} — ממתין לאישור הספק`);
      handleClose(false);
    } catch (error) {
      toast.error(`השיבוץ נכשל: ${error?.message || 'שגיאה לא ידועה'}`);
    } finally {
      setAssigning(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent dir="rtl" className="max-h-[90vh] overflow-y-auto">
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
          {/* קריאה משובצת - בחירה בין החלפת הספק להמשך עם ספק נוסף (סעיף 8) */}
          {hasActiveVendor && (
            <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3 space-y-2">
              <p className="text-sm text-amber-900">
                הקריאה כבר משובצת ל-
                <span className="font-semibold">{call?.assigned_vendor_name || 'ספק'}</span>. מה
                לעשות?
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={mode === 'replace' ? 'default' : 'outline'}
                  onClick={() => setMode('replace')}
                  className="gap-2 h-auto py-2 text-xs"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  החלף ספק (אותה קריאה)
                </Button>
                <Button
                  type="button"
                  variant={mode === 'continue' ? 'default' : 'outline'}
                  onClick={() => setMode('continue')}
                  className="gap-2 h-auto py-2 text-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  המשך עם ספק נוסף
                </Button>
              </div>
              <p className="text-xs text-amber-700">
                {mode === 'replace'
                  ? 'החלפה: הספק הנוכחי יוסר והספק החדש ישובץ לאותה קריאה.'
                  : 'המשך: תיפתח קריאת המשך מקושרת (למשל ניידת ← גרר), עם נקודת איסוף מהמיקום הנוכחי.'}
              </p>
            </div>
          )}

          {/* בחירת סוג רכב השירות - לפני בחירת הספק */}
          <div>
            <Label>סוג רכב שירות</Label>
            <Select value={dispatchType} onValueChange={setDispatchType}>
              <SelectTrigger>
                <SelectValue placeholder="בחר סוג רכב שירות" />
              </SelectTrigger>
              <SelectContent>
                {DISPATCH_TYPES.map(({ key, label, icon: Icon, iconClass }) => (
                  <SelectItem key={key} value={key}>
                    <span className="flex items-center gap-2">
                      <Icon className={`w-3.5 h-3.5 ${iconClass}`} />
                      {label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* עריכת יעדים - גרר עם אחסנה (אחסנה + יעד) / קריאת המשך (יעד) — סעיף 7 */}
          {(showStorageField || showDestField) && (
            <div className="rounded-lg border border-stone-200 bg-stone-50/60 p-3 space-y-3">
              {showStorageField && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5 text-stone-700">
                    <Warehouse className="w-3.5 h-3.5" />
                    מיקום אחסנה (סיום רגל ראשונה)
                  </Label>
                  <CityAutocomplete
                    id="storage_city"
                    value={storageCity}
                    onChange={setStorageCity}
                    placeholder="עיר אחסנה..."
                  />
                  <Input
                    value={storageAddress}
                    onChange={(e) => setStorageAddress(e.target.value)}
                    placeholder="כתובת אחסנה"
                  />
                </div>
              )}
              {showDestField && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5 text-stone-700">
                    <Truck className="w-3.5 h-3.5" />
                    יעד סופי
                  </Label>
                  <CityAutocomplete
                    id="dest_city"
                    value={destCity}
                    onChange={setDestCity}
                    placeholder="עיר יעד..."
                  />
                  <Input
                    value={destAddress}
                    onChange={(e) => setDestAddress(e.target.value)}
                    placeholder="כתובת יעד"
                  />
                </div>
              )}
              {isStorage && (
                <p className="text-xs text-stone-500">
                  גרר 1: איסוף → אחסנה. גרר 2 (קריאת המשך): אחסנה → יעד סופי.
                </p>
              )}
            </div>
          )}

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
            {!call?.pickup_location_lat && (
              <p className="text-xs text-amber-700">
                לקריאה זו אין מיקום מדויק (קואורדינטות), לכן השיבוץ יתבסס על אזור הכיסוי בלבד.
              </p>
            )}
          </div>

          {call && (
            <Suspense fallback={<div className="h-20 bg-gray-50 rounded animate-pulse" />}>
              <VendorRecommendation
                callDetails={call}
                onSelectVendor={(vendor) => setSelectedVendor(vendor.id)}
              />
            </Suspense>
          )}

          <div>
            <Label>או בחר ספק ידנית</Label>
            <Select value={selectedVendor} onValueChange={setSelectedVendor}>
              <SelectTrigger>
                <SelectValue placeholder="בחר ספק" />
              </SelectTrigger>
              <SelectContent>
                {dispatchFilteredVendors.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-gray-400">
                    {dispatchType
                      ? 'אין ספקים זמינים מהסוג שנבחר כרגע'
                      : 'אין ספקים זמינים כרגע'}
                  </div>
                ) : (
                  dispatchFilteredVendors.map((vendor) => (
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
            {assigning
              ? 'משבץ...'
              : hasActiveVendor && mode === 'continue'
                ? 'פתח קריאת המשך'
                : hasActiveVendor && mode === 'replace'
                  ? 'החלף ספק'
                  : 'שבץ'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
