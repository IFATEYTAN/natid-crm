import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Phone, Mail, AlertCircle, ArrowRight } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { PageLoader } from '@/components/ui/LoadingSpinner';

export default function CustomerDetails() {
  const [searchParams] = useSearchParams();
  const id = searchParams.get('id');

  const { data: customer, isLoading } = useQuery({
    queryKey: ['customer', id],
    enabled: !!id,
    queryFn: async () => {
      const res = await base44.entities.Customer.filter({ id });
      return res?.[0] || null;
    },
  });

  if (!id) {
    return (
      <div className="flex items-center justify-center min-h-[300px]" dir="rtl">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-orange-500 mb-3" />
            <h2 className="text-lg font-bold mb-1">חסר מזהה לקוח</h2>
            <p className="text-[#6b7280] mb-4">כתובת העמוד צריכה לכלול פרמטר id.</p>
            <Link to={createPageUrl('Customers')}>
              <Button variant="outline">חזרה לרשימת לקוחות</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return <PageLoader text="טוען פרטי לקוח..." />;
  }

  if (!customer) {
    return (
      <div className="flex items-center justify-center min-h-[300px]" dir="rtl">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-3" />
            <h2 className="text-lg font-bold mb-1">הלקוח לא נמצא</h2>
            <p className="text-[#6b7280] mb-4">ודאי שהקישור נכון או שהלקוח קיים.</p>
            <Link to={createPageUrl('Customers')}>
              <Button variant="outline">חזרה לרשימת לקוחות</Button>
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
          <h1 className="text-2xl font-bold">פרטי לקוח</h1>
          <p className="text-sm text-[#6b7280]">צפייה ופרטי בסיס</p>
        </div>
        <Link to={createPageUrl('Customers')}>
          <Button variant="outline" className="gap-1">
            <ArrowRight className="w-4 h-4" /> חזרה
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{customer.name || 'ללא שם'}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="text-sm text-[#6b7280]">סוג לקוח</div>
            <Badge className="w-fit">{customer.customer_type || 'לא צוין'}</Badge>
          </div>

          <div className="space-y-1">
            <div className="text-sm text-[#6b7280]">איש קשר</div>
            <div className="font-medium">{customer.contact_person || '-'}</div>
          </div>

          <div className="space-y-1">
            <div className="text-sm text-[#6b7280]">טלפון</div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-[#6b7280]" />
              <a className="text-blue-600 hover:underline" href={`tel:${customer.phone || ''}`}>
                {customer.phone || '-'}
              </a>
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-sm text-[#6b7280]">אימייל</div>
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-[#6b7280]" />
              <a className="text-blue-600 hover:underline" href={`mailto:${customer.email || ''}`}>
                {customer.email || '-'}
              </a>
            </div>
          </div>

          <div className="space-y-1 md:col-span-2">
            <div className="text-sm text-[#6b7280]">כתובת</div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#6b7280]" />
              <span>{(customer.address || '-') + (customer.city ? `, ${customer.city}` : '')}</span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-sm text-[#6b7280]">סטטוס</div>
            <Badge className="w-fit">{customer.status || '-'}</Badge>
          </div>

          <div className="space-y-1">
            <div className="text-sm text-[#6b7280]">חוזה</div>
            <div className="font-medium">{customer.contract_type || 'none'}</div>
          </div>

          <div className="space-y-1">
            <div className="text-sm text-[#6b7280]">SLA תגובה (דקות)</div>
            <div className="font-medium">{customer.sla_response_minutes ?? '-'}</div>
          </div>

          <div className="space-y-1">
            <div className="text-sm text-[#6b7280]">SLA הגעה (דקות)</div>
            <div className="font-medium">{customer.sla_arrival_minutes ?? '-'}</div>
          </div>

          <div className="space-y-1 md:col-span-2">
            <div className="text-sm text-[#6b7280]">הערות</div>
            <div className="font-medium whitespace-pre-wrap">{customer.notes || '-'}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
