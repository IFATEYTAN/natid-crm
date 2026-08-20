import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Phone, Mail, AlertCircle, ArrowRight, Car, Calendar } from 'lucide-react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { queryKeys } from '@/lib/queryKeys';
import { getClient } from '@/lib/srvApi';

const Field = ({ label, value, dir }) => (
  <div className="space-y-1">
    <div className="text-sm text-[#6b7280]">{label}</div>
    <div className="font-medium text-right tabular-nums" dir={dir}>
      {value ?? '-'}
    </div>
  </div>
);

/**
 * Subscription/client detail, sourced from srv GET /clients/{sub_id} (real
 * Nati data). `id` in the URL is a subscription ID, not a client ID — see
 * srv.natid.co.il CLAUDE.md's GET /clients/{sub_id} note.
 */
export default function CustomerDetails() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const subId = searchParams.get('id');

  const { data, isLoading, isError, error } = useQuery({
    queryKey: queryKeys.clientSearch.detail(subId),
    queryFn: () => getClient(subId),
    enabled: !!subId,
  });
  const customer = data?.data;

  if (!subId) {
    return (
      <div className="flex items-center justify-center min-h-[300px]" dir="rtl">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-orange-500 mb-3" />
            <h2 className="text-lg font-bold mb-1">חסר מזהה מנוי</h2>
            <p className="text-[#6b7280] mb-4">כתובת העמוד צריכה לכלול פרמטר id.</p>
            <Link to={createPageUrl('Customers')}>
              <Button variant="outline">חזרה לחיפוש לקוחות</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return <PageLoader text="טוען פרטי לקוח..." />;
  }

  if (isError || !customer) {
    return (
      <div className="flex items-center justify-center min-h-[300px]" dir="rtl">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-3" />
            <h2 className="text-lg font-bold mb-1">הלקוח לא נמצא</h2>
            <p className="text-[#6b7280] mb-4">{error?.message || 'ודאי שהקישור נכון.'}</p>
            <Link to={createPageUrl('Customers')}>
              <Button variant="outline">חזרה לחיפוש לקוחות</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            {customer.full_name || 'ללא שם'}
            {customer.yashir_top_client === 1 && (
              <Badge className="bg-amber-100 text-amber-800">לקוח מוביל</Badge>
            )}
          </h1>
          <p className="text-sm text-[#6b7280]">מנוי #{customer.sub_num}</p>
        </div>
        <Button variant="outline" className="gap-1" onClick={() => navigate(-1)}>
          <ArrowRight className="w-4 h-4" /> חזרה
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">פרטי קשר</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="text-sm text-[#6b7280]">טלפון</div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-[#6b7280]" />
              <a
                className="text-blue-600 hover:underline tabular-nums text-right"
                dir="ltr"
                href={`tel:${customer.client_tel || ''}`}
              >
                {customer.client_tel || '-'}
              </a>
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-sm text-[#6b7280]">אימייל</div>
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-[#6b7280]" />
              <a
                className="text-blue-600 hover:underline"
                href={`mailto:${customer.client_email || ''}`}
              >
                {customer.client_email || '-'}
              </a>
            </div>
          </div>
          <div className="space-y-1 md:col-span-2">
            <div className="text-sm text-[#6b7280]">כתובת</div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#6b7280]" />
              <span>{customer.client_address || '-'}</span>
            </div>
          </div>
          <Field label="סוכן" value={customer.agent_name} />
          <Field label="מס' סוכן" value={customer.agent_num} dir="ltr" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Calendar className="w-5 h-5" />
            פרטי מנוי
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="חבילה" value={customer.pck_name} />
          <Field label="ותק" value={customer.sub_sequence} />
          <Field label="תוקף מתאריך" value={customer.start_date} dir="ltr" />
          <Field label="תוקף עד תאריך" value={customer.end_date} dir="ltr" />
          <Field label="נפתח בתאריך" value={customer.date_added} dir="ltr" />
          <Field label="שולם" value={customer.isPaid ? 'כן' : 'לא'} />
          <div className="space-y-1 md:col-span-2">
            <div className="text-sm text-[#6b7280]">מוצרים מכוסים</div>
            <div className="font-medium whitespace-pre-wrap">{customer.products || '-'}</div>
          </div>
          {customer.notes && (
            <div className="space-y-1 md:col-span-2">
              <div className="text-sm text-[#6b7280]">הערות</div>
              <div className="font-medium whitespace-pre-wrap">{customer.notes}</div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Car className="w-5 h-5" />
            פרטי רכב
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="מספר רכב" value={customer.car_number} dir="ltr" />
          <Field label="סוג רכב" value={customer.car_type} />
          <Field label="שם רכב" value={customer.car_name} />
          <Field label="שנת ייצור" value={customer.car_year} dir="ltr" />
          <Field label="קטגוריית רכב" value={customer.vehicle_class} />
          <Field label="תוקף רישיון" value={customer.tokef_dt} dir="ltr" />
          {customer.multi_req > 0 && (
            <Field label="קריאות נוספות פעילות" value={customer.multi_req} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
