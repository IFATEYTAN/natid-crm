import { useState, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Phone,
  PhoneIncoming,
  PhoneOff,
  Settings,
  AlertCircle,
  User,
  Clock,
  Plus,
  Wifi,
  WifiOff,
  TestTube2,
  Link2,
  Copy,
  Check,
} from 'lucide-react';
import CTICallerPopup from '@/components/cti/CTICallerPopup';
import CTIStatusBar from '@/components/cti/CTIStatusBar';

const STORAGE_KEYS = {
  serverUrl: 'cti_server_url',
  extension: 'cti_extension',
  autoPopup: 'cti_auto_popup',
  autoCreateCase: 'cti_auto_create_case',
  recording: 'cti_recording',
};

const MOCK_CALLER = {
  phone: '050-1234567',
  name: 'ישראל ישראלי',
  customerId: 'cust_12345',
  openCalls: 2,
  lastCallDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  isExistingCustomer: true,
};

const MOCK_NEW_CALLER = {
  phone: '052-9876543',
  name: null,
  customerId: null,
  openCalls: 0,
  lastCallDate: null,
  isExistingCustomer: false,
};

export default function CTISettings() {
  // Connection settings
  const [serverUrl, setServerUrl] = useState(
    () => localStorage.getItem(STORAGE_KEYS.serverUrl) || ''
  );
  const [extension, setExtension] = useState(
    () => localStorage.getItem(STORAGE_KEYS.extension) || ''
  );
  const [connectionStatus, setConnectionStatus] = useState('disconnected');

  // Behavior settings
  const [autoPopup, setAutoPopup] = useState(
    () => localStorage.getItem(STORAGE_KEYS.autoPopup) === 'true'
  );
  const [autoCreateCase, setAutoCreateCase] = useState(
    () => localStorage.getItem(STORAGE_KEYS.autoCreateCase) === 'true'
  );
  const [recording, setRecording] = useState(
    () => localStorage.getItem(STORAGE_KEYS.recording) === 'true'
  );

  // Test popup state
  const [showPopup, setShowPopup] = useState(false);
  const [testCallerData, setTestCallerData] = useState(null);

  // Webhook URL copy state
  const [copied, setCopied] = useState(false);

  const webhookUrl = `${window.location.origin}/api/ctiWebhook`;

  const handleSaveConnection = () => {
    localStorage.setItem(STORAGE_KEYS.serverUrl, serverUrl);
    localStorage.setItem(STORAGE_KEYS.extension, extension);
    toast.success('הגדרות חיבור נשמרו בהצלחה');
  };

  const handleSaveBehavior = () => {
    localStorage.setItem(STORAGE_KEYS.autoPopup, String(autoPopup));
    localStorage.setItem(STORAGE_KEYS.autoCreateCase, String(autoCreateCase));
    localStorage.setItem(STORAGE_KEYS.recording, String(recording));
    toast.success('הגדרות התנהגות נשמרו בהצלחה');
  };

  const handleTestConnection = () => {
    setConnectionStatus('connecting');
    toast.info('בודק חיבור...');

    // Simulate connection attempt
    setTimeout(() => {
      if (serverUrl && extension) {
        setConnectionStatus('connected');
        toast.success('חיבור CTI הצליח (סימולציה)');
      } else {
        setConnectionStatus('disconnected');
        toast.error('נא למלא כתובת שרת ומספר שלוחה');
      }
    }, 2000);
  };

  const handleSimulateExisting = () => {
    setTestCallerData(MOCK_CALLER);
    setShowPopup(true);
    toast.info('סימולציה: שיחה נכנסת מלקוח מוכר');
  };

  const handleSimulateNew = () => {
    setTestCallerData(MOCK_NEW_CALLER);
    setShowPopup(true);
    toast.info('סימולציה: שיחה נכנסת ממספר לא מוכר');
  };

  const handleCreateCase = useCallback(() => {
    setShowPopup(false);
    toast.success('קריאה חדשה נפתחה (סימולציה)');
  }, []);

  const handleViewCustomer = useCallback(() => {
    setShowPopup(false);
    toast.info('מעבר לכרטיס לקוח (סימולציה)');
  }, []);

  const handleDismiss = useCallback(() => {
    setShowPopup(false);
  }, []);

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl).then(() => {
      setCopied(true);
      toast.success('כתובת Webhook הועתקה');
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Phone className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">הגדרות טלפוניה CTI</h1>
            <p className="text-gray-500 text-sm">
              ניהול חיבור טלפוניה ממוחשבת למערכת
            </p>
          </div>
        </div>
        <CTIStatusBar status={connectionStatus} />
      </div>

      {/* Section 1: Connection Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wifi className="h-5 w-5" />
            הגדרות חיבור
          </CardTitle>
          <CardDescription>
            הגדרת חיבור למרכזיה (PBX) או שרת טלפוניה
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="server-url">כתובת שרת PBX</Label>
            <Input
              id="server-url"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              placeholder="wss://pbx.example.com:8089/ws"
              dir="ltr"
              className="text-left font-mono"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="extension">מספר שלוחה</Label>
            <Input
              id="extension"
              value={extension}
              onChange={(e) => setExtension(e.target.value)}
              placeholder="לדוגמה: 101"
              dir="ltr"
              className="text-left"
            />
          </div>

          <div className="flex items-center gap-2">
            <Label>סטטוס חיבור:</Label>
            {connectionStatus === 'connected' && (
              <Badge className="bg-green-100 text-green-700 border-green-300">
                <Wifi className="h-3 w-3 ml-1" />
                מחובר
              </Badge>
            )}
            {connectionStatus === 'disconnected' && (
              <Badge variant="outline" className="text-red-700 border-red-300 bg-red-50">
                <WifiOff className="h-3 w-3 ml-1" />
                מנותק
              </Badge>
            )}
            {connectionStatus === 'connecting' && (
              <Badge variant="outline" className="text-yellow-700 border-yellow-300 bg-yellow-50">
                <Wifi className="h-3 w-3 ml-1 animate-pulse" />
                מתחבר...
              </Badge>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <Button onClick={handleSaveConnection}>שמור הגדרות</Button>
            <Button variant="outline" onClick={handleTestConnection}>
              בדוק חיבור
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Behavior Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            הגדרות התנהגות
          </CardTitle>
          <CardDescription>
            הגדרת התנהגות המערכת בעת קבלת שיחות
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-popup">פופאפ אוטומטי בשיחה נכנסת</Label>
              <p className="text-sm text-gray-500">
                הצגת חלון זיהוי מתקשר אוטומטית כשנכנסת שיחה
              </p>
            </div>
            <Switch
              id="auto-popup"
              checked={autoPopup}
              onCheckedChange={setAutoPopup}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-create">יצירת קריאה אוטומטית</Label>
              <p className="text-sm text-gray-500">
                יצירת קריאת שירות חדשה אוטומטית עם קבלת שיחה
              </p>
            </div>
            <Switch
              id="auto-create"
              checked={autoCreateCase}
              onCheckedChange={setAutoCreateCase}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="recording">הקלטת שיחות</Label>
              <p className="text-sm text-gray-500">
                הקלטה אוטומטית של שיחות נכנסות (דורש תמיכה במרכזיה)
              </p>
            </div>
            <Switch
              id="recording"
              checked={recording}
              onCheckedChange={setRecording}
            />
          </div>

          <div className="pt-2">
            <Button onClick={handleSaveBehavior}>שמור הגדרות</Button>
          </div>
        </CardContent>
      </Card>

      {/* Section 3: Test */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube2 className="h-5 w-5" />
            בדיקת סימולציה
          </CardTitle>
          <CardDescription>
            הפעלת סימולציה של שיחה נכנסת לבדיקת התצוגה
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Button onClick={handleSimulateExisting} className="bg-green-600 hover:bg-green-700">
              <PhoneIncoming className="h-4 w-4 ml-2" />
              סימולציה - לקוח מוכר
            </Button>
            <Button onClick={handleSimulateNew} variant="outline">
              <PhoneIncoming className="h-4 w-4 ml-2" />
              סימולציה - מספר לא מוכר
            </Button>
          </div>
          <p className="text-sm text-gray-500">
            <AlertCircle className="h-4 w-4 inline ml-1" />
            הסימולציה תציג את חלון זיהוי המתקשר עם נתונים לדוגמה
          </p>
        </CardContent>
      </Card>

      {/* Section 4: Webhook URL */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Webhook למרכזיה חיצונית
          </CardTitle>
          <CardDescription>
            כתובת Webhook לשילוב עם מרכזיה חיצונית (PBX). הגדר כתובת זו במרכזיה
            לקבלת התראות על שיחות נכנסות.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Input
              value={webhookUrl}
              readOnly
              dir="ltr"
              className="text-left font-mono bg-gray-50"
            />
            <Button variant="outline" size="icon" onClick={handleCopyWebhook}>
              {copied ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-sm text-amber-800">
              <strong>אבטחה:</strong> ה-Webhook מוגן בסוד משותף. יש להגדיר במרכזיה
              כותרת (Header) בשם <code dir="ltr">x-webhook-secret</code> עם הערך שהוגדר
              במשתנה הסביבה <code dir="ltr">CTI_WEBHOOK_SECRET</code> בהגדרות האפליקציה.
              ללא הסוד — בקשות יידחו.
            </p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              <strong>פורמט בקשה:</strong> POST עם JSON
            </p>
            <pre
              className="text-xs text-blue-700 mt-2 bg-blue-100 p-2 rounded font-mono overflow-x-auto"
              dir="ltr"
            >
{`{
  "event": "incoming_call",
  "caller_id": "0501234567",
  "extension": "101"
}`}
            </pre>
          </div>
        </CardContent>
      </Card>

      {/* Caller Popup (for simulation) */}
      <CTICallerPopup
        isOpen={showPopup}
        callerData={testCallerData}
        onCreateCase={handleCreateCase}
        onViewCustomer={handleViewCustomer}
        onDismiss={handleDismiss}
      />
    </div>
  );
}
