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
import { MoreVertical, RotateCcw, Truck, MapPin, Ban, Bell, CheckCircle } from 'lucide-react';
import { statusLabels } from '@/config/labels';

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
          <Button variant="outline" size="icon">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {/* Status changes - always available with edit permission */}
          {canEdit && !isClosedOrCancelled && (
            <>
              {call?.call_status !== 'vendor_arrived' && (
                <DropdownMenuItem onClick={() => onStatusChange('vendor_arrived')}>
                  <MapPin className="w-4 h-4 ml-2" />
                  נותן השירות הגיע
                </DropdownMenuItem>
              )}
              {call?.call_status !== 'in_progress' && (
                <DropdownMenuItem onClick={() => onStatusChange('in_progress')}>
                  <Truck className="w-4 h-4 ml-2" />
                  נותן השירות במקום
                </DropdownMenuItem>
              )}
              {call?.call_status !== 'vendor_enroute' && (
                <DropdownMenuItem onClick={() => onStatusChange('vendor_enroute')}>
                  <Truck className="w-4 h-4 ml-2" />
                  ספק בדרך
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
            </>
          )}

          {/* Assign vendor */}
          {canAssign && !isClosedOrCancelled && (
            <DropdownMenuItem onClick={onOpenAssignDialog}>
              <Truck className="w-4 h-4 ml-2" />
              שבץ ספק
            </DropdownMenuItem>
          )}

          {/* Add reminder */}
          <DropdownMenuItem onClick={onNavigateToReminders}>
            <Bell className="w-4 h-4 ml-2" />
            הוסף תזכורת
          </DropdownMenuItem>

          {/* Cancel */}
          {canEdit && !isClosedOrCancelled && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onOpenCancelDialog}
                className="text-red-600 focus:text-red-600"
              >
                <Ban className="w-4 h-4 ml-2" />
                ביטול קריאה
              </DropdownMenuItem>
            </>
          )}

          {/* Reopen / Edit closed call */}
          {canEdit && isClosedOrCancelled && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowReopenDialog(true)}>
                <RotateCcw className="w-4 h-4 ml-2" />
                תיקון קריאה / פתיחה מחדש
              </DropdownMenuItem>
            </>
          )}

          {/* Complete */}
          {canEdit && !isClosedOrCancelled && (
            <DropdownMenuItem onClick={() => onStatusChange('completed')}>
              <CheckCircle className="w-4 h-4 ml-2" />
              סגור קריאה
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

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
              <RotateCcw className="w-4 h-4 ml-2" />
              פתח מחדש
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
