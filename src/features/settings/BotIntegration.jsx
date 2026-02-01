import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Bot,
  Copy,
  CheckCircle2,
  ExternalLink,
  MessageSquare,
  Phone,
  Globe
} from 'lucide-react';

export default function BotIntegration() {
  const [copied, setCopied] = useState(false);

  const webhookUrl = `${window.location.origin}/api/functions/99digitalBot`;
  const apiKey = import.meta.env.VITE_BOT_API_KEY || '[יש להגדיר VITE_BOT_API_KEY בקובץ .env]';

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const samplePayload = `{
  "source_system": "99digital_bot",
  "bot_session_id": "{{session_id}}",
  "channel": "{{channel}}",
  "timestamp": "{{timestamp}}",
  "customer": {
    "name": "{{customer_name}}",
    "phone": "{{customer_phone}}",
    "phone_2": "{{customer_phone_2}}",
    "is_vip": false
  },
  "vehicle": {
    "plate": "{{vehicle_plate}}",
    "model": "{{vehicle_model}}",
    "type": "{{vehicle_type}}",
    "fuel_type": "{{fuel_type}}"
  },
  "incident": {
    "type": "{{issue_type}}",
    "description": "{{issue_description}}",
    "priority": "רגיל",
    "pickup_location": {
      "address": "{{pickup_location_address}}",
      "city": "{{pickup_location_city}}",
      "lat": "{{location_lat}}",
      "lon": "{{location_lon}}"
    },
    "dropoff_location": {
      "address": "{{dropoff_location_address}}",
      "garage_name": "{{dropoff_garage_name}}",
      "garage_phone": "{{dropoff_garage_phone}}"
    }
  },
  "questionnaire": {
    "is_road_accessible": "{{is_road_accessible}}",
    "is_underground_parking": "{{is_underground_parking}}",
    "is_gear_neutral": "{{is_gear_neutral}}",
    "is_steering_locked": "{{is_steering_locked}}",
    "is_handbrake_released": "{{is_handbrake_released}}",
    "is_toll_road": "{{is_toll_road}}",
    "is_customer_with_vehicle": "{{is_customer_with_vehicle}}",
    "has_key": "{{has_key}}",
    "customer_response_code": "{{customer_response_code}}"
  }
}`;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-[32px] font-bold text-[#0078D4]">אינטגרציית בוט 99 Digital</h1>
        <p className="text-[#616161] text-sm">הגדרות חיבור לבוט השירות</p>
      </div>

      {/* Flow Diagram */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bot className="w-4 h-4 text-[#0078D4]" />
            זרימת העבודה
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-center">
            <div className="flex-1">
              <div className="w-16 h-16 bg-[#E3F2FD] rounded-full flex items-center justify-center mx-auto mb-2">
                <MessageSquare className="w-8 h-8 text-[#0078D4]" />
              </div>
              <p className="font-medium">לקוח פונה</p>
              <p className="text-sm text-[#616161]">WhatsApp/Web/SMS</p>
            </div>
            <div className="text-2xl text-[#9E9E9E]">→</div>
            <div className="flex-1">
              <div className="w-16 h-16 bg-[#E3F2FD] rounded-full flex items-center justify-center mx-auto mb-2">
                <Bot className="w-8 h-8 text-[#0078D4]" />
              </div>
              <p className="font-medium">בוט 99 Digital</p>
              <p className="text-sm text-[#616161]">שאלון + איסוף נתונים</p>
            </div>
            <div className="text-2xl text-[#9E9E9E]">→</div>
            <div className="flex-1">
              <div className="w-16 h-16 bg-[#E3F2FD] rounded-full flex items-center justify-center mx-auto mb-2">
                <Globe className="w-8 h-8 text-[#0078D4]" />
              </div>
              <p className="font-medium">Base44 CRM</p>
              <p className="text-sm text-[#616161]">יצירת קריאה</p>
            </div>
            <div className="text-2xl text-[#9E9E9E]">→</div>
            <div className="flex-1">
              <div className="w-16 h-16 bg-[#E8F5E9] rounded-full flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 className="w-8 h-8 text-[#2E7D32]" />
              </div>
              <p className="font-medium">תור עבודה</p>
              <p className="text-sm text-[#616161]">שיבוץ למוקדן</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Webhook Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">הגדרות Webhook ב-99 Digital</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Webhook URL</Label>
            <div className="flex gap-2">
              <Input
                value={webhookUrl}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(webhookUrl)}
              >
                {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          <div>
            <Label>Method</Label>
            <Input value="POST" readOnly />
          </div>

          <div>
            <Label>Headers</Label>
            <Textarea
              value={`Content-Type: application/json
Authorization: Bearer ${apiKey}
X-Bot-Source: 99digital`}
              readOnly
              rows={3}
              className="font-mono text-sm"
            />
          </div>

          <div>
            <Label>Payload Structure</Label>
            <Textarea
              value={samplePayload}
              readOnly
              rows={15}
              className="font-mono text-xs"
            />
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => copyToClipboard(samplePayload)}
            >
              <Copy className="w-3 h-3 mr-2" />
              העתק דוגמת Payload
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Supported Channels */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">ערוצים נתמכים</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <MessageSquare className="w-8 h-8 text-[#25D366] mx-auto mb-2" />
              <p className="font-medium">WhatsApp</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <MessageSquare className="w-8 h-8 text-[#0084FF] mx-auto mb-2" />
              <p className="font-medium">Messenger</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <Globe className="w-8 h-8 text-[#0078D4] mx-auto mb-2" />
              <p className="font-medium">Web Chat</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <Phone className="w-8 h-8 text-[#616161] mx-auto mb-2" />
              <p className="font-medium">SMS/IVR</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documentation Link */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">תיעוד נוסף</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button variant="outline" className="w-full justify-between">
            <span>מדריך הגדרת בוט ב-99 Digital</span>
            <ExternalLink className="w-4 h-4" />
          </Button>
          <Button variant="outline" className="w-full justify-between">
            <span>דוגמאות Flow מוכנים</span>
            <ExternalLink className="w-4 h-4" />
          </Button>
          <Button variant="outline" className="w-full justify-between">
            <span>בדיקת Webhook</span>
            <ExternalLink className="w-4 h-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}