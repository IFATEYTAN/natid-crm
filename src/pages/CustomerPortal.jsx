import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  Phone,
  Hash,
  Clock,
  MapPin,
  Truck,
  CheckCircle,
  XCircle,
  Loader2,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

const statusConfig = {
  waiting_treatment: { label: 'ממתין לטיפול', color: 'bg-yellow-100 text-yellow-800', step: 1 },
  awaiting_assignment: { label: 'ממתין לשיבוץ', color: 'bg-yellow-100 text-yellow-800', step: 1 },
  assigning: { label: 'ספק שובץ', color: 'bg-blue-100 text-blue-800', step: 2 },
  vendor_enroute: { label: 'נותן שירות בדרך', color: 'bg-blue-100 text-blue-800', step: 3 },
  in_progress: { label: 'בטיפול', color: 'bg-indigo-100 text-indigo-800', step: 4 },
  vendor_arrived: { label: 'נותן שירות הגיע', color: 'bg-indigo-100 text-indigo-800', step: 4 },
  future_service: { label: 'שירות עתידי', color: 'bg-purple-100 text-purple-800', step: 2 },
  completed: { label: 'סגור', color: 'bg-green-100 text-green-800', step: 5 },
  cancelled: { label: 'בוטל', color: 'bg-red-100 text-red-800', step: 0 },
};

const serviceTypeLabels = {
  towing: 'גרירה',
  battery: 'מצבר',
  flat_tire: "פנצ'ר",
  fuel: 'דלק',
  lockout: 'פתיחת רכב',
  accident: 'תאונה',
  other: 'אחר',
};

const STEPS = [
  { label: 'קריאה נפתחה', step: 1 },
  { label: 'שובץ ספק', step: 2 },
  { label: 'ספק בדרך', step: 3 },
  { label: 'בטיפול', step: 4 },
  { label: 'סגור', step: 5 },
];

export default function CustomerPortal() {
  const [phone, setPhone] = useState('');
  const [callNumber, setCallNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!phone.trim() || !callNumber.trim()) {
      setError('יש להזין מספר טלפון ומספר קריאה');
      return;
    }

    setLoading(true);
    setError('');
    setData(null);

    try {
      const response = await base44.functions.invoke('getCustomerPortalData', {
        phone: phone.trim(),
        call_number: callNumber.trim(),
      });

      if (response.data?.success) {
        setData(response.data);
      } else {
        setError(response.data?.error || 'שגיאה בטעינת הנתונים');
      }
    } catch (err) {
      setError(err?.message || 'שגיאה בחיבור לשרת');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setData(null);
    setPhone('');
    setCallNumber('');
    setError('');
  };

  const currentStep = data ? statusConfig[data.call.status]?.step || 0 : 0;
  const isCancelled = data?.call.status === 'cancelled';

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white" dir="rtl">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-[#212121]">מעקב קריאת שירות</h1>
          <p className="text-[#616161]">הזן את פרטי הקריאה למעקב בזמן אמת</p>
        </div>

        {/* Search Form */}
        {!data && (
          <Card className="bg-white shadow-md">
            <CardContent className="pt-6">
              <form onSubmit={handleSearch} className="space-y-4">
                <div>
                  <Label className="flex items-center gap-2 mb-1.5">
                    <Hash className="w-4 h-4" />
                    מספר קריאה
                  </Label>
                  <Input
                    value={callNumber}
                    onChange={(e) => setCallNumber(e.target.value)}
                    placeholder="C-12345678"
                    dir="ltr"
                    className="text-end"
                  />
                </div>
                <div>
                  <Label className="flex items-center gap-2 mb-1.5">
                    <Phone className="w-4 h-4" />
                    מספר טלפון
                  </Label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="050-1234567"
                    dir="ltr"
                    className="text-end"
                    type="tel"
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                    <XCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full gap-2 bg-[#f97316] hover:bg-[#ea580c]"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                  חפש קריאה
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {data && (
          <>
            {/* Back Button */}
            <Button variant="ghost" onClick={handleReset} className="gap-2">
              <ArrowRight className="w-4 h-4" />
              חיפוש חדש
            </Button>

            {/* Status Card */}
            <Card className="bg-white shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">קריאה {data.call.call_number}</CardTitle>
                  <Badge className={statusConfig[data.call.status]?.color || 'bg-gray-100'}>
                    {statusConfig[data.call.status]?.label || data.call.status}
                  </Badge>
                </div>
                <p className="text-sm text-[#616161]">
                  {data.call.customer_name && `שלום ${data.call.customer_name.split(' ')[0]},`}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Progress Steps */}
                {!isCancelled && (
                  <div className="flex items-center justify-between px-2">
                    {STEPS.map((s, i) => (
                      <div key={s.step} className="flex flex-col items-center gap-1 flex-1">
                        <div className="flex items-center w-full">
                          {i > 0 && (
                            <div
                              className={`flex-1 h-1 rounded ${
                                currentStep >= s.step ? 'bg-green-500' : 'bg-gray-200'
                              }`}
                            />
                          )}
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                              currentStep >= s.step
                                ? 'bg-green-500 text-white'
                                : currentStep === s.step - 1
                                  ? 'bg-blue-500 text-white animate-pulse'
                                  : 'bg-gray-200 text-gray-500'
                            }`}
                          >
                            {currentStep >= s.step ? <CheckCircle className="w-4 h-4" /> : s.step}
                          </div>
                          {i < STEPS.length - 1 && (
                            <div
                              className={`flex-1 h-1 rounded ${
                                currentStep > s.step ? 'bg-green-500' : 'bg-gray-200'
                              }`}
                            />
                          )}
                        </div>
                        <span className="text-[10px] text-center text-gray-500 mt-1">
                          {s.label}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {isCancelled && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700">
                    <XCircle className="w-5 h-5" />
                    <span className="font-medium">קריאה זו בוטלה</span>
                  </div>
                )}

                {/* Details */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-start gap-2">
                    <Clock className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-gray-500">נפתחה</div>
                      <div className="font-medium">
                        {data.call.created_date
                          ? format(new Date(data.call.created_date), 'dd/MM/yy HH:mm', {
                              locale: he,
                            })
                          : '-'}
                      </div>
                    </div>
                  </div>

                  {data.call.service_type && (
                    <div className="flex items-start gap-2">
                      <Truck className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="text-gray-500">סוג שירות</div>
                        <div className="font-medium">
                          {serviceTypeLabels[data.call.service_type] || data.call.service_type}
                        </div>
                      </div>
                    </div>
                  )}

                  {data.call.location_address && (
                    <div className="flex items-start gap-2 col-span-2">
                      <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="text-gray-500">מיקום</div>
                        <div className="font-medium">{data.call.location_address}</div>
                      </div>
                    </div>
                  )}

                  {data.call.vendor_name && (
                    <div className="flex items-start gap-2 col-span-2">
                      <Truck className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="text-gray-500">נותן שירות</div>
                        <div className="font-medium">{data.call.vendor_name}</div>
                      </div>
                    </div>
                  )}

                  {data.call.closed_at && (
                    <div className="flex items-start gap-2 col-span-2">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="text-gray-500">הסתיים</div>
                        <div className="font-medium">
                          {format(new Date(data.call.closed_at), 'dd/MM/yy HH:mm', { locale: he })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Refresh */}
                {!['completed', 'cancelled'].includes(data.call.status) && (
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={handleSearch}
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    רענן סטטוס
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Timeline */}
            {data.history?.length > 0 && (
              <Card className="bg-white shadow-md">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">התקדמות הטיפול</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {data.history.map((item, i) => (
                      <div key={i} className="flex gap-3 text-sm">
                        <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
                        <div className="flex-1">
                          <div className="text-gray-700">{item.new_value}</div>
                          <div className="text-xs text-gray-400">
                            {item.created_date
                              ? format(new Date(item.created_date), 'dd/MM HH:mm', { locale: he })
                              : ''}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-gray-400 pb-4">נתי שירותי דרך — מעקב קריאות</div>
      </div>
    </div>
  );
}
