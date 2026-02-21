import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Receipt, ExternalLink, Settings, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { useCurrentUserRole } from '@/components/auth/RoleGuard';

export default function InvoicesPage() {
  const { isAdmin } = useCurrentUserRole();
  const [crmUrl, setCrmUrl] = useState('');
  const [urlInput, setUrlInput] = useState('');

  useEffect(() => {
    const savedUrl = localStorage.getItem('invoices_crm_url');
    if (savedUrl) {
      setCrmUrl(savedUrl);
      setUrlInput(savedUrl);
    }
  }, []);

  const isValidUrl = (url) => {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'https:' || parsed.protocol === 'http:';
    } catch {
      return false;
    }
  };

  const handleSaveUrl = () => {
    if (!urlInput.trim()) {
      toast.error('יש להזין כתובת URL');
      return;
    }
    if (!isValidUrl(urlInput.trim())) {
      toast.error('כתובת URL לא תקינה - יש להזין כתובת המתחילה ב-https://');
      return;
    }
    setCrmUrl(urlInput.trim());
    localStorage.setItem('invoices_crm_url', urlInput.trim());
    toast.success('כתובת ה-CRM נשמרה בהצלחה');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#111827]">חשבוניות</h1>
        <p className="text-[#6b7280] text-sm">ניהול חשבוניות דרך מערכת ה-CRM הקיימת</p>
      </div>

      {/* Info Banner */}
      <Card className="bg-[#eff6ff] border border-[#bfdbfe]">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Receipt className="w-5 h-5 text-[#3b82f6] mt-0.5 shrink-0" />
            <p className="text-sm text-[#1e40af]">
              החשבוניות מנוהלות דרך מערכת ה-CRM הקיימת. ניתן לצפות, ליצור ולנהל חשבוניות ישירות מתוך
              הממשק למטה.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* iFrame Container - Takes most of the width */}
        <div className="lg:col-span-3">
          <Card className="bg-white border border-[#e5e7eb]">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ExternalLink className="w-5 h-5 text-[#3b82f6]" />
                מערכת CRM - חשבוניות
              </CardTitle>
            </CardHeader>
            <CardContent>
              {crmUrl && isValidUrl(crmUrl) ? (
                <iframe
                  src={crmUrl}
                  title="CRM חשבוניות"
                  className="w-full min-h-[600px] rounded-lg border border-[#e5e7eb]"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                  referrerPolicy="no-referrer"
                  allow="fullscreen"
                />
              ) : (
                <div className="w-full min-h-[600px] rounded-lg border border-[#e5e7eb] bg-[#f9fafb] flex flex-col items-center justify-center text-center p-8">
                  <Settings className="w-12 h-12 text-[#9ca3af] mb-4" />
                  <h3 className="text-lg font-medium text-[#374151] mb-2">לא הוגדרה כתובת CRM</h3>
                  <p className="text-sm text-[#6b7280] max-w-md">
                    {isAdmin
                      ? 'יש להגדיר את כתובת ה-URL של מערכת ה-CRM בהגדרות למטה כדי לצפות בחשבוניות.'
                      : 'כתובת מערכת ה-CRM טרם הוגדרה. יש לפנות למנהל המערכת.'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          {/* Purchase Flow Card */}
          <Card className="bg-white border border-[#e5e7eb]">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Receipt className="w-4 h-4 text-[#3b82f6]" />
                תהליך רכישה
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="text-sm text-[#6b7280] space-y-2 list-decimal list-inside">
                <li>מתפעל מבצע רכישה</li>
                <li>לוקחים מייל מהלקוח</li>
                <li>חשבונית נשלחת מיידית</li>
              </ol>
            </CardContent>
          </Card>

          {/* Customer Management Card */}
          <Card className="bg-white border border-[#e5e7eb]">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#3b82f6]" />
                ניהול לקוחות
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-[#6b7280]">
                החשבוניות מאוחסנות במודול &quot;ניהול לקוחות&quot; במערכת ה-CRM הקיימת.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Configuration Section - Admin Only */}
      {isAdmin && (
        <Card className="bg-white border border-[#e5e7eb]">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Settings className="w-5 h-5 text-[#3b82f6]" />
              הגדרות CRM
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-[#6b7280]">
              הזן את כתובת ה-URL של מערכת ה-CRM לצפייה בחשבוניות
            </p>
            <div className="flex gap-3">
              <div className="flex-1">
                <Label className="text-sm text-[#6b7280]">כתובת URL של מערכת ה-CRM</Label>
                <Input
                  type="url"
                  placeholder="https://crm.example.com/invoices"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  className="mt-1"
                  dir="ltr"
                />
              </div>
              <div className="flex items-end">
                <Button onClick={handleSaveUrl} className="bg-[#3b82f6] hover:bg-[#2563eb]">
                  שמור
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
