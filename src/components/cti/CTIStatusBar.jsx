import { useState } from 'react';
import { Phone, Settings } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const STATUS_CONFIG = {
  connected: {
    color: 'bg-green-500',
    text: 'CTI מחובר',
    badgeClass: 'text-green-700 border-green-300 bg-green-50',
  },
  disconnected: {
    color: 'bg-red-500',
    text: 'CTI מנותק',
    badgeClass: 'text-red-700 border-red-300 bg-red-50',
  },
  connecting: {
    color: 'bg-yellow-500',
    text: 'CTI מתחבר...',
    badgeClass: 'text-yellow-700 border-yellow-300 bg-yellow-50',
  },
};

/**
 * CTI Status Indicator Bar
 *
 * Shows CTI connection status with a colored dot indicator.
 * Clicking opens a settings dialog for CTI configuration.
 *
 * @param {'connected' | 'disconnected' | 'connecting'} status - Current CTI status
 * @param {function} onSettingsChange - Callback when settings are saved
 */
export default function CTIStatusBar({ status = 'disconnected', onSettingsChange }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [extension, setExtension] = useState(
    () => localStorage.getItem('cti_extension') || ''
  );
  const [autoPopup, setAutoPopup] = useState(
    () => localStorage.getItem('cti_auto_popup') === 'true'
  );
  const [autoCreateCase, setAutoCreateCase] = useState(
    () => localStorage.getItem('cti_auto_create_case') === 'true'
  );

  const config = STATUS_CONFIG[status] || STATUS_CONFIG.disconnected;

  const handleSave = () => {
    localStorage.setItem('cti_extension', extension);
    localStorage.setItem('cti_auto_popup', String(autoPopup));
    localStorage.setItem('cti_auto_create_case', String(autoCreateCase));

    if (onSettingsChange) {
      onSettingsChange({ extension, autoPopup, autoCreateCase });
    }

    toast.success('הגדרות CTI נשמרו בהצלחה');
    setDialogOpen(false);
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <button
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
          dir="rtl"
        >
          <span className={`h-2.5 w-2.5 rounded-full ${config.color} animate-pulse`} />
          <Phone className="h-3.5 w-3.5 text-gray-600" />
          <Badge variant="outline" className={`text-xs ${config.badgeClass}`}>
            {config.text}
          </Badge>
        </button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            הגדרות CTI מהירות
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Extension */}
          <div className="space-y-2">
            <Label htmlFor="cti-extension">מספר שלוחה</Label>
            <Input
              id="cti-extension"
              value={extension}
              onChange={(e) => setExtension(e.target.value)}
              placeholder="לדוגמה: 101"
              dir="ltr"
              className="text-left"
            />
          </div>

          {/* Auto-popup */}
          <div className="flex items-center justify-between">
            <Label htmlFor="cti-auto-popup">פופאפ אוטומטי בשיחה נכנסת</Label>
            <Switch
              id="cti-auto-popup"
              checked={autoPopup}
              onCheckedChange={setAutoPopup}
            />
          </div>

          {/* Auto-create case */}
          <div className="flex items-center justify-between">
            <Label htmlFor="cti-auto-create">יצירת קריאה אוטומטית</Label>
            <Switch
              id="cti-auto-create"
              checked={autoCreateCase}
              onCheckedChange={setAutoCreateCase}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDialogOpen(false)}>
            ביטול
          </Button>
          <Button onClick={handleSave}>
            שמור
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
