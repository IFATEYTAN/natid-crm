import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Save, Copy, Check, ExternalLink, AlertCircle, Key } from 'lucide-react';
import { toast } from 'sonner';

export default function IntegrationSettings() {
  const [copied, setCopied] = useState(false);
  const [settings, setSettings] = useState({
    // Webhook Settings
    webhookEnabled: true,
    webhookUrl: '',
    webhookSecret: '',

    // CRM Integration
    crmType: 'salesforce', // salesforce, hubspot, custom
    apiKey: '',
    apiEndpoint: '',
    syncInterval: '5', // minutes
    autoCreateCalls: true,
    autoAssignToQueue: true,

    // Field Mapping
    fieldMapping: {
      customer_name: 'Name',
      customer_phone: 'Phone',
      customer_email: 'Email',
      issue_type: 'Case_Type__c',
      priority: 'Priority',
      description: 'Description',
      location: 'Location__c',
    },
  });

  useEffect(() => {
    // Load settings from localStorage
    const saved = localStorage.getItem('integrationSettings');
    if (saved) {
      setSettings(JSON.parse(saved));
    }

    // Generate webhook URL
    const baseUrl = window.location.origin;
    const webhookUrl = `${baseUrl}/api/functions/externalCrmWebhook`;
    setSettings((prev) => ({ ...prev, webhookUrl }));
  }, []);

  const handleSave = () => {
    localStorage.setItem('integrationSettings', JSON.stringify(settings));
    toast.success('ההגדרות נשמרו בהצלחה');
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('הועתק ללוח');
    setTimeout(() => setCopied(false), 2000);
  };

  const generateWebhookSecret = () => {
    const secret =
      'whsec_' +
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);
    setSettings((prev) => ({ ...prev, webhookSecret: secret }));
    toast.success('נוצר מפתח חדש');
  };

  const samplePayload = {
    customer: {
      name: 'John Doe',
      phone: '+972501234567',
      email: 'john@example.com',
      company: 'ABC Corp',
    },
    case: {
      type: 'mechanical',
      priority: 'urgent',
      description: "Car won't start",
      location: {
        address: '123 Main St, Tel Aviv',
        city: 'Tel Aviv',
        lat: 32.0853,
        lon: 34.7818,
      },
      vehicle: {
        plate: '12-345-67',
        model: 'Toyota Corolla 2020',
        type: 'private',
      },
    },
    metadata: {
      crm_id: 'SF-12345',
      source: 'salesforce',
    },
  };

  return (
    <div className="space-y-6">
      <div>
        <h1>אינטגרציות CRM</h1>
        <p className="text-[var(--color-text-secondary)]">
          חיבור למערכות CRM חיצוניות וסנכרון אוטומטי
        </p>
      </div>

      {/* Webhook Configuration */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg p-5">
        <h3 className="mb-4">Webhook להזנת קריאות</h3>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">אפשר Webhook</Label>
              <p className="text-sm text-[#616161]">קבל קריאות חדשות דרך HTTP POST</p>
            </div>
            <Switch
              checked={settings.webhookEnabled}
              onCheckedChange={(checked) =>
                setSettings((prev) => ({ ...prev, webhookEnabled: checked }))
              }
            />
          </div>

          {settings.webhookEnabled && (
            <>
              <div>
                <Label>Webhook URL</Label>
                <div className="flex gap-2 mt-1">
                  <Input value={settings.webhookUrl} readOnly className="font-mono text-sm" />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(settings.webhookUrl)}
                    aria-label="העתק"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-[#2E7D32]" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-[#616161] mt-1">שלח POST request לכתובת זו מה-CRM שלך</p>
              </div>

              <div>
                <Label>Webhook Secret</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={settings.webhookSecret}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, webhookSecret: e.target.value }))
                    }
                    placeholder="whsec_..."
                    className="font-mono text-sm"
                  />
                  <Button variant="outline" onClick={generateWebhookSecret}>
                    <Key className="w-4 h-4 ms-2" />
                    צור חדש
                  </Button>
                </div>
                <p className="text-xs text-[#616161] mt-1">
                  שלח מפתח זה ב-header בשם X-Webhook-Secret
                </p>
              </div>

              <div className="p-4 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-[#6B7280] flex-shrink-0 mt-0.5" />
                  <div className="space-y-2 text-sm">
                    <p className="font-medium text-[#111827]">הוראות הגדרה</p>
                    <ol className="list-decimal list-inside space-y-1 text-[#6B7280]">
                      <li>העתק את ה-Webhook URL</li>
                      <li>הגדר Webhook בממשק ה-CRM שלך</li>
                      <li>הוסף את ה-Secret כ-header (X-Webhook-Secret)</li>
                      <li>שלח אירועים מסוג "Case Created" או "Ticket Created"</li>
                    </ol>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* CRM Integration */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg p-5">
        <h3 className="mb-4">חיבור CRM</h3>
        <div className="space-y-6">
          <div>
            <Label>סוג CRM</Label>
            <Select
              value={settings.crmType}
              onValueChange={(value) => setSettings((prev) => ({ ...prev, crmType: value }))}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="salesforce">Salesforce</SelectItem>
                <SelectItem value="hubspot">HubSpot</SelectItem>
                <SelectItem value="zoho">Zoho CRM</SelectItem>
                <SelectItem value="custom">מותאם אישית</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>API Key / Access Token</Label>
            <Input
              type="password"
              value={settings.apiKey}
              onChange={(e) => setSettings((prev) => ({ ...prev, apiKey: e.target.value }))}
              placeholder="Enter your API key..."
              className="mt-1"
            />
            <p className="text-xs text-[#616161] mt-1">
              API key מהמערכת החיצונית (אופציונלי, רק אם גם עושה Pull)
            </p>
          </div>

          {settings.crmType === 'custom' && (
            <div>
              <Label>API Endpoint</Label>
              <Input
                value={settings.apiEndpoint}
                onChange={(e) => setSettings((prev) => ({ ...prev, apiEndpoint: e.target.value }))}
                placeholder="https://api.yourcrm.com/v1"
                className="mt-1"
              />
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">יצירה אוטומטית של קריאות</Label>
              <p className="text-sm text-[#616161]">צור קריאה חדשה אוטומטית מכל webhook</p>
            </div>
            <Switch
              checked={settings.autoCreateCalls}
              onCheckedChange={(checked) =>
                setSettings((prev) => ({ ...prev, autoCreateCalls: checked }))
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">שיבוץ אוטומטי לתור</Label>
              <p className="text-sm text-[#616161]">הוסף לתור עבודה אוטומטית</p>
            </div>
            <Switch
              checked={settings.autoAssignToQueue}
              onCheckedChange={(checked) =>
                setSettings((prev) => ({ ...prev, autoAssignToQueue: checked }))
              }
            />
          </div>
        </div>
      </div>

      {/* Field Mapping */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg p-5">
        <h3 className="mb-4">מיפוי שדות</h3>
        <div className="space-y-4">
          <p className="text-sm text-[#6B7280]">
            התאם את שמות השדות מה-CRM החיצוני לשדות במערכת Base44
          </p>

          {Object.entries(settings.fieldMapping).map(([key, value]) => (
            <div key={key} className="grid grid-cols-2 gap-4 items-center">
              <div>
                <Label className="text-sm text-[#6B7280]">{key.replace(/_/g, ' ')}</Label>
              </div>
              <Input
                value={value}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    fieldMapping: {
                      ...prev.fieldMapping,
                      [key]: e.target.value,
                    },
                  }))
                }
                placeholder="שם השדה ב-CRM"
                className="text-sm"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Sample Payload */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg p-5">
        <h3 className="mb-4">דוגמת Payload</h3>
        <div className="space-y-3">
          <p className="text-sm text-[#6B7280]">
            שלח POST request ל-webhook עם payload בפורמט הבא:
          </p>
          <div className="relative">
            <pre className="bg-[#212121] text-[#E0E0E0] p-4 rounded-lg overflow-x-auto text-xs">
              {JSON.stringify(samplePayload, null, 2)}
            </pre>
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 start-2"
              onClick={() => copyToClipboard(JSON.stringify(samplePayload, null, 2))}
              aria-label="העתק"
            >
              <Copy className="w-4 h-4 text-white" />
            </Button>
          </div>
          <div className="flex items-center gap-2 text-sm text-[#6B7280]">
            <ExternalLink className="w-4 h-4" />
            <a
              href="https://docs.base44.com/integrations/webhook"
              target="_blank"
              className="text-[#111827] hover:underline"
            >
              תיעוד מלא
            </a>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} className="btn-primary gap-2">
          <Save className="w-4 h-4" />
          שמור הגדרות
        </Button>
      </div>
    </div>
  );
}
