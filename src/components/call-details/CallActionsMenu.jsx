import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MoreVertical, RotateCcw, Truck, MapPin, Warehouse, Ban, Bell, CheckCircle, MessageCircle, Users } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { showToast } from '@/components/ui/FeedbackToast';
import { Input } from '@/components/ui/input';
import { statusLabels } from '@/components/config/labels';
import { canTransition, getAllowedTransitions, getTransitionLabel } from '@/config/statusTransitions';

// אייקון לכל קיצור-סטטוס בתפריט הפעולות
const STATUS_SHORTCUT_ICONS = {
  vendor_arrived: MapPin,
  vendor_enroute: Truck,
  in_progress: Truck,
  in_storage: Warehouse,
};

export default function CallActionsMenu({
  call,
  callId,
  canEdit,
  canAssign,
  onStatusChange,
  onOpenAssignDialog,
  onOpenCancelDialog,
  onNavigateToReminders,
}) {
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showReopenDialog, setShowReopenDialog] = useState(false);
  const [reopenReason, setReopenReason] = useState('');
  const [showWhatsAppDialog, setShowWhatsAppDialog] = useState(false);
  const [whatsAppType, setWhatsAppType] = useState('vendor_call_details');
  const [whatsAppGroupId, setWhatsAppGroupId] = useState('');
  const [whatsAppCustomMsg, setWhatsAppCustomMsg] = useState('');
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);

  const handleSendWhatsApp = async () => {
    setSendingWhatsApp(true);
    try {
      const payload = {
        type: whatsAppType,
        call_id: callId,
        vendor_phone: call?.vendor_phone || call?.assigned_vendor_phone,
        group_id: whatsAppGroupId,
        message: whatsAppCustomMsg,
      };
      const res = await base44.functions.invoke('sendWhatsApp', payload);
      if (res?.data?.success) {
        showToast.success('הודעת WhatsApp נשלחה בהצלחה');
        setShowWhatsAppDialog(false);
      } else {
        showToast.error(res?.data?.message || 'שגיאה בשליחת WhatsApp');
      }
    } catch (err) {
      showToast.error('שגיאה בשליחת WhatsApp');
    } finally {
      setSendingWhatsApp(false);
    }
  };

  const isClosedOrCancelled =
    call?.call_status === 'completed' || call?.call_status === 'cancelled';

  const handleReopen = () => {
    if (!canEdit) return;
    onStatusChange('waiting_treatment', `פתיחה מחדש: ${reopenReason}`);
    setShowReopenDialog(false);
    setReopenReason('');
  };

  return (
    <>
      <DropdownMenu dir="rtl">
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" aria-label="אפשרויות נוספות">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {/* Status changes — only the allowed next steps for the current status */}
          {canEdit &&
            !isClosedOrCancelled &&
            (() => {
              // סטטוס לא ממופה — נופל חזרה לקיצורים הקודמים
              const allowed = getAllowedTransitions(call?.call_status) || [
                'vendor_arrived',
                'in_progress',
                'vendor_enroute',
              ];
              const shortcuts = allowed.filter((s) => s !== 'completed' && s !== 'cancelled');
              if (!shortcuts.length) return null;
              return (
                <>
                  {shortcuts.map((status) => {
                    const Icon = STATUS_SHORTCUT_ICONS[status] || Truck;
                    return (
                      <DropdownMenuItem key={status} onClick={() => onStatusChange(status)}>
                        <Icon className="w-4 h-4 ms-2" />
                        {getTransitionLabel(status, statusLabels)}
                      </DropdownMenuItem>
                    );
                  })}
                  <DropdownMenuSeparator />
                </>
              );
            })()}

          {/* Assign vendor */}
          {canAssign && !isClosedOrCancelled && (
            <DropdownMenuItem onClick={onOpenAssignDialog}>
              <Truck className="w-4 h-4 ms-2" />
              שבץ ספק
            </DropdownMenuItem>
          )}

          {/* WhatsApp */}
          {canEdit && !isClosedOrCancelled && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => { setWhatsAppType('vendor_call_details'); setShowWhatsAppDialog(true); }}>
                <MessageCircle className="w-4 h-4 ms-2 text-green-600" />
                שלח פרטים לספק (WhatsApp)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setWhatsAppType('group_message'); setShowWhatsAppDialog(true); }}>
                <Users className="w-4 h-4 ms-2 text-green-600" />
                שלח לקבוצת WhatsApp
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}

          {/* Add reminder */}
          <DropdownMenuItem onClick={onNavigateToReminders}>
            <Bell className="w-4 h-4 ms-2" />
            הוסף תזכורת
          </DropdownMenuItem>

          {/* Cancel */}
          {canEdit && !isClosedOrCancelled && canTransition(call?.call_status, 'cancelled') && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onOpenCancelDialog}
                className="text-red-600 focus:text-red-600"
              >
                <Ban className="w-4 h-4 ms-2" />
                ביטול קריאה
              </DropdownMenuItem>
            </>
          )}

          {/* Reopen / Edit closed call */}
          {canEdit && isClosedOrCancelled && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowReopenDialog(true)}>
                <RotateCcw className="w-4 h-4 ms-2" />
                תיקון קריאה / פתיחה מחדש
              </DropdownMenuItem>
            </>
          )}

          {/* Complete */}
          {canEdit && !isClosedOrCancelled && canTransition(call?.call_status, 'completed') && (
            <DropdownMenuItem onClick={() => onStatusChange('completed')}>
              <CheckCircle className="w-4 h-4 ms-2" />
              סגור קריאה
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* WhatsApp Dialog */}
      <Dialog open={showWhatsAppDialog} onOpenChange={setShowWhatsAppDialog}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-green-600" />
              {whatsAppType === 'group_message' ? 'שליחת הודעה לקבוצת WhatsApp' : 'שליחת פרטי קריאה לספק'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {whatsAppType === 'vendor_call_details' && (
              <div className="p-3 bg-green-50 rounded-lg text-sm text-green-800">
                <p className="font-semibold">משלוח לספק: {call?.assigned_vendor_name || 'לא שובץ'}</p>
                <p className="text-xs mt-1">טלפון: {call?.vendor_phone || call?.assigned_vendor_phone || 'לא צוין'}</p>
                <p className="text-xs mt-1">ההודעה תכלול את כל פרטי הקריאה: מספר, לקוח, מיקום, סוג שירות, פרטי רכב.</p>
              </div>
            )}
            {whatsAppType === 'group_message' && (
              <div className="space-y-3">
                <div>
                  <Label>מזהה קבוצה (Group ID)</Label>
                  <Input
                    value={whatsAppGroupId}
                    onChange={(e) => setWhatsAppGroupId(e.target.value)}
                    placeholder="XXXXXXXXXX@g.us או מספר קבוצה"
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-400 mt-1">ניתן להזין מספר קבוצות מופרדים בפסיק</p>
                </div>
                <div>
                  <Label>הודעה</Label>
                  <Textarea
                    value={whatsAppCustomMsg}
                    onChange={(e) => setWhatsAppCustomMsg(e.target.value)}
                    rows={4}
                    placeholder="כתוב את ההודעה לשליחה לקבוצה..."
                    className="mt-1"
                  />
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowWhatsAppDialog(false)}>ביטול</Button>
            <Button
              onClick={handleSendWhatsApp}
              disabled={sendingWhatsApp || (whatsAppType === 'group_message' && !whatsAppGroupId.trim())}
              className="bg-green-600 hover:bg-green-700 gap-2"
            >
              <MessageCircle className="w-4 h-4" />
              {sendingWhatsApp ? 'שולח...' : 'שלח WhatsApp'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reopen Dialog */}
      <Dialog open={showReopenDialog} onOpenChange={setShowReopenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>פתיחה מחדש / תיקון קריאה</DialogTitle>
            <DialogDescription>
              הקריאה כרגע במצב "{statusLabels[call?.call_status]}". פעולה זו תחזיר את הקריאה למצב
              "ממתין לטיפול".
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <div>
              <Label>סיבה לפתיחה מחדש</Label>
              <Textarea
                value={reopenReason}
                onChange={(e) => setReopenReason(e.target.value)}
                placeholder="נא לציין סיבה..."
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReopenDialog(false)}>
              ביטול
            </Button>
            <Button onClick={handleReopen} disabled={!reopenReason.trim()}>
              <RotateCcw className="w-4 h-4 ms-2" />
              פתח מחדש
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
