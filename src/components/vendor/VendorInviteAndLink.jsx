import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UserPlus, Link2, Mail, Loader2, CheckCircle, AlertCircle, ArrowDown } from 'lucide-react';
import { showToast } from '@/components/ui/FeedbackToast';

export default function VendorInviteAndLink({ vendors = [], vendorUsers = [], onRefresh }) {
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [email, setEmail] = useState('');
  const [step, setStep] = useState(1); // 1=select, 2=invite, 3=link
  const [inviteStatus, setInviteStatus] = useState(null); // null, 'success', 'error', 'exists'

  const selectedVendor = vendors.find(v => v.id === selectedVendorId);
  const vendorsWithoutEmail = vendors.filter(v => !v.email);
  const vendorsWithEmail = vendors.filter(v => v.email);

  // Check if email already exists as a user
  const existingUser = vendorUsers.find(u => u.email === email.trim().toLowerCase());

  // Step 1: Invite user
  const inviteMutation = useMutation({
    mutationFn: async () => {
      await base44.users.inviteUser(email.trim(), 'vendor');
    },
    onSuccess: () => {
      setInviteStatus('success');
      showToast.success(`הזמנה נשלחה ל-${email}`);
      setStep(3);
    },
    onError: (err) => {
      const msg = err?.message || err?.response?.data?.error || '';
      if (msg.includes('already') || msg.includes('exists')) {
        setInviteStatus('exists');
        showToast.info('המשתמש כבר קיים במערכת, ממשיך לקישור...');
        setStep(3);
      } else {
        setInviteStatus('error');
        showToast.error('שגיאה בהזמנה: ' + msg);
      }
    },
  });

  // Step 2: Link vendor to user
  const linkMutation = useMutation({
    mutationFn: async () => {
      return base44.functions.invoke('linkVendorToUser', {
        vendor_id: selectedVendorId,
        user_email: email.trim(),
      });
    },
    onSuccess: () => {
      showToast.success(`הספק ${selectedVendor?.vendor_name} קושר בהצלחה ל-${email}`);
      setSelectedVendorId('');
      setEmail('');
      setStep(1);
      setInviteStatus(null);
      onRefresh?.();
    },
    onError: (err) => {
      showToast.error(err?.response?.data?.error || 'שגיאה בקישור');
    },
  });

  const handleStartProcess = () => {
    if (!selectedVendorId || !email.trim()) {
      showToast.error('יש לבחור ספק ולהזין אימייל');
      return;
    }
    if (existingUser) {
      // User already exists, skip to link
      setInviteStatus('exists');
      setStep(3);
    } else {
      setStep(2);
    }
  };

  const handleInvite = () => {
    inviteMutation.mutate();
  };

  const handleLink = () => {
    linkMutation.mutate();
  };

  const handleReset = () => {
    setSelectedVendorId('');
    setEmail('');
    setStep(1);
    setInviteStatus(null);
  };

  return (
    <div className="space-y-4">
      {/* Main Process Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-blue-600" />
            הזמנת ספק וקישור לפרופיל
          </CardTitle>
          <CardDescription>
            תהליך בן 3 שלבים: בחירת ספק → הזמנה כמשתמש → קישור לפרופיל
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Progress Steps */}
          <div className="flex items-center justify-center gap-4">
            {[
              { num: 1, label: 'בחירה' },
              { num: 2, label: 'הזמנה' },
              { num: 3, label: 'קישור' },
            ].map((s, i) => (
              <div key={s.num} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                  ${step >= s.num ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                  {step > s.num ? <CheckCircle className="w-4 h-4" /> : s.num}
                </div>
                <span className={`text-sm ${step >= s.num ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
                  {s.label}
                </span>
                {i < 2 && <ArrowDown className="w-4 h-4 text-gray-300 rotate-[-90deg]" />}
              </div>
            ))}
          </div>

          {/* Step 1: Select Vendor + Email */}
          <div className={`space-y-4 ${step > 1 ? 'opacity-60' : ''}`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">בחר ספק</label>
                <Select
                  value={selectedVendorId}
                  onValueChange={setSelectedVendorId}
                  disabled={step > 1}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="בחר ספק..." />
                  </SelectTrigger>
                  <SelectContent>
                    {vendorsWithoutEmail.length > 0 && (
                      <>
                        <div className="px-2 py-1.5 text-xs font-semibold text-amber-600">
                          ⚠️ ללא קישור ({vendorsWithoutEmail.length})
                        </div>
                        {vendorsWithoutEmail.map(v => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.vendor_name} {v.phone ? `(${v.phone})` : ''}
                          </SelectItem>
                        ))}
                      </>
                    )}
                    {vendorsWithEmail.length > 0 && (
                      <>
                        <div className="px-2 py-1.5 text-xs font-semibold text-green-600">
                          ✅ מקושרים ({vendorsWithEmail.length})
                        </div>
                        {vendorsWithEmail.map(v => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.vendor_name} ({v.email})
                          </SelectItem>
                        ))}
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">אימייל הספק</label>
                <div className="relative">
                  <Mail className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="email"
                    dir="ltr"
                    placeholder="vendor@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="ps-10"
                    disabled={step > 1}
                  />
                </div>
                {existingUser && step === 1 && (
                  <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    משתמש קיים - ידלג להזמנה ויקושר ישירות
                  </p>
                )}
              </div>
            </div>

            {step === 1 && (
              <Button
                onClick={handleStartProcess}
                disabled={!selectedVendorId || !email.trim()}
                className="w-full"
              >
                <UserPlus className="w-4 h-4" />
                התחל תהליך חיבור
              </Button>
            )}
          </div>

          {/* Step 2: Invite */}
          {step === 2 && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="pt-4 space-y-3">
                <h3 className="font-bold text-blue-800">שלב 2: הזמנת משתמש</h3>
                <p className="text-sm text-blue-700">
                  המשתמש <strong dir="ltr">{email}</strong> יקבל הזמנה להצטרף למערכת עם תפקיד "ספק" (vendor).
                  לאחר ההרשמה, הוא יקבל גישה לפורטל הספקים.
                </p>
                <div className="flex gap-2">
                  <Button
                    onClick={handleInvite}
                    isLoading={inviteMutation.isPending}
                    className="flex-1"
                  >
                    <Mail className="w-4 h-4" />
                    שלח הזמנה
                  </Button>
                  <Button variant="outline" onClick={handleReset}>
                    ביטול
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Link */}
          {step === 3 && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-4 space-y-3">
                <h3 className="font-bold text-green-800">שלב 3: קישור לפרופיל ספק</h3>
                <p className="text-sm text-green-700">
                  {inviteStatus === 'exists'
                    ? `המשתמש ${email} כבר קיים במערכת.`
                    : `ההזמנה נשלחה ל-${email}.`
                  }
                  {' '}כעת נקשר את המייל לפרופיל הספק <strong>{selectedVendor?.vendor_name}</strong>.
                </p>
                <p className="text-xs text-green-600">
                  הפעולה תעדכן את שדה האימייל בפרופיל הספק ותגדיר את תפקיד המשתמש ל-"vendor".
                </p>
                <div className="flex gap-2">
                  <Button
                    onClick={handleLink}
                    isLoading={linkMutation.isPending}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <Link2 className="w-4 h-4" />
                    קשר ספק למשתמש
                  </Button>
                  <Button variant="outline" onClick={handleReset}>
                    ביטול
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Quick Status */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">ספקים שעדיין לא מקושרים</CardTitle>
        </CardHeader>
        <CardContent>
          {vendorsWithoutEmail.length === 0 ? (
            <div className="text-center py-4 text-green-600 flex items-center justify-center gap-2">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">כל הספקים מקושרים!</span>
            </div>
          ) : (
            <div className="divide-y max-h-64 overflow-y-auto">
              {vendorsWithoutEmail.map(v => (
                <div key={v.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <span className="font-medium text-sm">{v.vendor_name}</span>
                    {v.phone && <span className="text-xs text-gray-500 mr-2" dir="ltr">{v.phone}</span>}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1"
                    onClick={() => {
                      setSelectedVendorId(v.id);
                      setStep(1);
                      setInviteStatus(null);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  >
                    <UserPlus className="w-3 h-3" />
                    הזמן
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}