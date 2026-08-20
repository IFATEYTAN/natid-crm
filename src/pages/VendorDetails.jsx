import React from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { getSupplier } from '@/lib/srvApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { AlertCircle, ArrowRight, Phone, Mail, MapPin, Clock, Warehouse } from 'lucide-react';

const Field = ({ label, value, dir }) => (
  <div className="space-y-1">
    <div className="text-sm text-[#6b7280]">{label}</div>
    <div className="font-medium text-right" dir={dir}>
      {value || '-'}
    </div>
  </div>
);

const TEL_LABELS = ['ראשי', 'נוסף 1', 'נוסף 2', 'נוסף 3', 'נוסף 4', 'נוסף 5', 'נוסף 6', 'נוסף 7'];

/**
 * Supplier contact card, sourced from srv GET /suppliers/{id} (real Nati
 * data, port of PHP f_kablan_info()). Read-only — see ServiceProviders.jsx.
 */
export default function VendorDetailsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const kablanId = searchParams.get('id');

  const { data, isLoading, isError, error } = useQuery({
    queryKey: queryKeys.lookups.supplierDetail(kablanId),
    queryFn: () => getSupplier(kablanId),
    enabled: !!kablanId,
  });
  const supplier = data?.data;

  if (!kablanId) {
    return (
      <div className="flex items-center justify-center min-h-[300px]" dir="rtl">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-orange-500 mb-3" />
            <h2 className="text-lg font-bold mb-1">חסר מזהה ספק</h2>
            <Link to={createPageUrl('ServiceProviders')}>
              <Button variant="outline">חזרה לרשימת הספקים</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) return <PageLoader text="טוען פרטי ספק..." />;

  if (isError || !supplier) {
    return (
      <div className="flex items-center justify-center min-h-[300px]" dir="rtl">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-3" />
            <h2 className="text-lg font-bold mb-1">הספק לא נמצא</h2>
            <p className="text-[#6b7280] mb-4">{error?.message}</p>
            <Link to={createPageUrl('ServiceProviders')}>
              <Button variant="outline">חזרה לרשימת הספקים</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const phones = Array.from({ length: 8 }, (_, i) => supplier[`tel${i}`]).filter(Boolean);
  const storages = [supplier.storage1, supplier.storage2, supplier.storage3].filter(Boolean);

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{supplier.kablan_name}</h1>
        <Button variant="outline" className="gap-1" onClick={() => navigate(-1)}>
          <ArrowRight className="w-4 h-4" /> חזרה
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">פרטי קשר</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1 md:col-span-2">
            <div className="text-sm text-[#6b7280]">טלפונים</div>
            <div className="flex flex-wrap gap-x-6 gap-y-1">
              {phones.length === 0 && <span className="font-medium">-</span>}
              {phones.map((tel, i) => (
                <span key={i} className="flex items-center gap-1.5 font-medium" dir="ltr">
                  <Phone className="w-3.5 h-3.5 text-[#6b7280]" />
                  {tel}
                  <span className="text-xs text-[#6b7280]" dir="rtl">
                    ({TEL_LABELS[i]})
                  </span>
                </span>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-sm text-[#6b7280]">פקס</div>
            <div className="font-medium" dir="ltr">
              {supplier.fax || '-'}
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-sm text-[#6b7280]">אימייל</div>
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-[#6b7280]" />
              <a className="text-blue-600 hover:underline" href={`mailto:${supplier.email || ''}`}>
                {supplier.email || '-'}
              </a>
            </div>
          </div>
          <div className="space-y-1 md:col-span-2">
            <div className="text-sm text-[#6b7280]">כתובת</div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#6b7280]" />
              <span>{supplier.address || '-'}</span>
            </div>
          </div>
          <Field label="שעות פעילות" value={supplier.work_hours} />
        </CardContent>
      </Card>

      {storages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Warehouse className="w-5 h-5" />
              מגרשי אחסנה
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {storages.map((s, i) => (
              <div key={i} className="text-sm">
                {s}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {supplier.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Clock className="w-5 h-5" />
              הערות
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{supplier.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
