import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Link2, Settings, CheckCircle, XCircle, ExternalLink, RefreshCw } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import NatiSyncPanel from '@/components/integrations/NatiSyncPanel';

const integrations = [
  {
    id: 'salesforce',
    name: 'Salesforce',
    description: 'סנכרון לקוחות וקריאות עם Salesforce CRM',
    icon: '☁️',
    status: 'disconnected',
  },
  {
    id: 'hubspot',
    name: 'HubSpot',
    description: 'חיבור ל-HubSpot לניהול לידים ולקוחות',
    icon: '🟠',
    status: 'disconnected',
  },
  {
    id: 'zapier',
    name: 'Zapier',
    description: 'אוטומציות וחיבור לאלפי אפליקציות',
    icon: '⚡',
    status: 'disconnected',
  },
  {
    id: 'google_sheets',
    name: 'Google Sheets',
    description: 'ייצוא נתונים אוטומטי לגיליונות',
    icon: '📊',
    status: 'disconnected',
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp Business',
    description: 'שליחת עדכונים ללקוחות בוואטסאפ',
    icon: '💬',
    status: 'disconnected',
  },
  {
    id: 'sms',
    name: 'SMS Gateway',
    description: 'שליחת הודעות SMS ללקוחות וספקים',
    icon: '📱',
    status: 'disconnected',
  },
];

export default function IntegrationSettingsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [integrationStates, setIntegrationStates] = useState(
    integrations.reduce((acc, int) => ({ ...acc, [int.id]: { enabled: false, apiKey: '' } }), {})
  );

  const handleToggle = (id) => {
    setIntegrationStates((prev) => ({
      ...prev,
      [id]: { ...prev[id], enabled: !prev[id].enabled },
    }));
    toast.success('הגדרות נשמרו');
  };

  const handleSaveApiKey = (id) => {
    toast.success('מפתח API נשמר בהצלחה');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#111827]">אינטגרציות CRM</h1>
        <p className="text-[#6b7280] text-sm">חיבור למערכות חיצוניות וסנכרון נתונים</p>
      </div>

      {/* Nati Sync Panel - admin only */}
      {isAdmin && <NatiSyncPanel />}

      {/* Info Card */}
      <Card className="bg-[#f3f4f6] border border-[#e5e7eb]">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Link2 className="w-5 h-5 text-[#3b82f6] mt-0.5" />
            <div>
              <h3 className="font-medium text-[#111827] mb-1">אינטגרציות זמינות</h3>
              <p className="text-sm text-[#6b7280]">
                חבר את המערכת שלך לכלים חיצוניים לסנכרון אוטומטי של נתונים, שליחת התראות ועוד.
                לחיבור אינטגרציה, הפעל אותה והזן את מפתח ה-API המתאים.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Integrations List */}
      <div className="grid gap-4">
        {integrations.map((integration) => (
          <Card key={integration.id} className="bg-white border border-[#e5e7eb]">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-[8px] bg-[#f3f4f6] flex items-center justify-center text-2xl">
                    {integration.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-[#111827]">{integration.name}</h3>
                      {integrationStates[integration.id]?.enabled ? (
                        <Badge className="bg-[#111827] text-white text-xs">מחובר</Badge>
                      ) : (
                        <Badge className="bg-[#6b7280] text-white text-xs">לא מחובר</Badge>
                      )}
                    </div>
                    <p className="text-sm text-[#6b7280]">{integration.description}</p>
                  </div>
                </div>
                <Switch
                  checked={integrationStates[integration.id]?.enabled}
                  onCheckedChange={() => handleToggle(integration.id)}
                />
              </div>

              {integrationStates[integration.id]?.enabled && (
                <div className="mt-4 pt-4 border-t border-[#e5e7eb]">
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <Label className="text-sm text-[#6b7280]">מפתח API</Label>
                      <Input
                        type="password"
                        placeholder="הזן מפתח API..."
                        value={integrationStates[integration.id]?.apiKey}
                        onChange={(e) =>
                          setIntegrationStates((prev) => ({
                            ...prev,
                            [integration.id]: { ...prev[integration.id], apiKey: e.target.value },
                          }))
                        }
                        className="mt-1"
                      />
                    </div>
                    <div className="flex items-end gap-2">
                      <Button
                        onClick={() => handleSaveApiKey(integration.id)}
                        className="bg-[#3b82f6] hover:bg-[#2563eb]"
                      >
                        שמור
                      </Button>
                      <Button variant="outline" size="icon" aria-label="רענן">
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Help Section */}
      <Card className="bg-white border border-[#e5e7eb]">
        <CardHeader>
          <CardTitle className="text-lg text-[#111827]">צריך עזרה?</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-[#6b7280] mb-4">
            לקבלת מפתחות API ותמיכה טכנית בחיבור אינטגרציות, פנה לצוות התמיכה.
          </p>
          <Button variant="outline" className="gap-2">
            <ExternalLink className="w-4 h-4" />
            מדריך אינטגרציות
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
