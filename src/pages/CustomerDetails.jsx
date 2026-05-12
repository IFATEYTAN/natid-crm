import React from 'react';
import { useCustomer } from '@/features/customers/hooks/useCustomers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  MapPin,
  Phone,
  Mail,
  AlertCircle,
  ArrowRight,
  Car,
  Calendar,
  Shield,
  CreditCard,
  AlertTriangle,
} from 'lucide-react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { PageLoader } from '@/components/ui/LoadingSpinner';

export default function CustomerDetails() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const id = searchParams.get('id');

  const { data: customer, isLoading, isError, error } = useCustomer(id);

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

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <p className="text-red-500 text-lg font-medium mb-2">שגיאה בטעינת נתונים</p>
        <p className="text-gray-500 text-sm">{error?.message || 'נסה לרענן את הדף'}</p>
      </div>
    );
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
        <Button variant="outline" className="gap-1" onClick={() => navigate(-1)}>
          <ArrowRight className="w-4 h-4" /> חזרה
        </Button>
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
              <a
                className="text-blue-600 hover:underline tabular-nums"
                dir="ltr"
                href={`tel:${customer.phone || ''}`}
              >
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
            <div className="font-medium text-right tabular-nums" dir="ltr">
              {customer.sla_response_minutes ?? '-'}
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-sm text-[#6b7280]">SLA הגעה (דקות)</div>
            <div className="font-medium text-right tabular-nums" dir="ltr">
              {customer.sla_arrival_minutes ?? '-'}
            </div>
          </div>

          <div className="space-y-1 md:col-span-2">
            <div className="text-sm text-[#6b7280]">הערות</div>
            <div className="font-medium whitespace-pre-wrap">{customer.notes || '-'}</div>
          </div>
        </CardContent>
      </Card>

      {/* Subscription Details */}
      {(customer.subscription_status ||
        customer.subscription_start_date ||
        customer.subscription_end_date) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Calendar className="w-5 h-5" />
              תוקף מנוי
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="text-sm text-[#6b7280]">מצב מנוי</div>
              <Badge className="w-fit">
                {customer.subscription_status === 'active'
                  ? 'פעיל'
                  : customer.subscription_status === 'suspended'
                    ? 'מושהה'
                    : customer.subscription_status === 'cancelled'
                      ? 'מבוטל'
                      : customer.subscription_status === 'expired'
                        ? 'פג תוקף'
                        : customer.subscription_status || '-'}
              </Badge>
            </div>
            {customer.subscription_sequence && (
              <div className="space-y-1">
                <div className="text-sm text-[#6b7280]">רצף מנויים</div>
                <div className="font-medium text-right tabular-nums" dir="ltr">
                  {customer.subscription_sequence}
                </div>
              </div>
            )}
            {customer.subscription_start_date && (
              <div className="space-y-1">
                <div className="text-sm text-[#6b7280]">תוקף מנוי מתאריך</div>
                <div className="font-medium text-right tabular-nums" dir="ltr">
                  {customer.subscription_start_date}
                </div>
              </div>
            )}
            {customer.subscription_end_date && (
              <div className="space-y-1">
                <div className="text-sm text-[#6b7280]">תוקף מנוי עד תאריך</div>
                <div className="font-medium text-right tabular-nums" dir="ltr">
                  {customer.subscription_end_date}
                </div>
              </div>
            )}
            {customer.subscription_issue_date && (
              <div className="space-y-1">
                <div className="text-sm text-[#6b7280]">תאריך הפקה</div>
                <div className="font-medium text-right tabular-nums" dir="ltr">
                  {customer.subscription_issue_date}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Vehicle Details */}
      {(customer.vehicle_number || customer.vehicle_type || customer.vehicle_model) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Car className="w-5 h-5" />
              פרטי רכב
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {customer.vehicle_number && (
              <div className="space-y-1">
                <div className="text-sm text-[#6b7280]">מספר רכב</div>
                <div className="font-medium text-right tabular-nums" dir="ltr">
                  {customer.vehicle_number}
                </div>
              </div>
            )}
            {customer.vehicle_type && (
              <div className="space-y-1">
                <div className="text-sm text-[#6b7280]">סוג רכב</div>
                <div className="font-medium">
                  {customer.vehicle_type === 'private'
                    ? 'פרטי'
                    : customer.vehicle_type === 'commercial_light'
                      ? 'מסחרי קל'
                      : customer.vehicle_type === 'commercial_heavy'
                        ? 'מסחרי כבד'
                        : customer.vehicle_type === 'motorcycle'
                          ? 'אופנוע'
                          : customer.vehicle_type}
                </div>
              </div>
            )}
            {customer.vehicle_model && (
              <div className="space-y-1">
                <div className="text-sm text-[#6b7280]">סוג דגם</div>
                <div className="font-medium">{customer.vehicle_model}</div>
              </div>
            )}
            {customer.vehicle_model_code && (
              <div className="space-y-1">
                <div className="text-sm text-[#6b7280]">קוד דגם / שם רכב</div>
                <div className="font-medium">{customer.vehicle_model_code}</div>
              </div>
            )}
            {customer.vehicle_year && (
              <div className="space-y-1">
                <div className="text-sm text-[#6b7280]">שנת ייצור</div>
                <div className="font-medium text-right tabular-nums" dir="ltr">
                  {customer.vehicle_year}
                </div>
              </div>
            )}
            {customer.vehicle_license_expiry && (
              <div className="space-y-1">
                <div className="text-sm text-[#6b7280]">תוקף רישיון רכב</div>
                <div className="font-medium text-right tabular-nums" dir="ltr">
                  {customer.vehicle_license_expiry}
                </div>
              </div>
            )}
            {customer.vehicle_personal_import && (
              <div className="space-y-1">
                <div className="text-sm text-[#6b7280]">יבוא אישי</div>
                <Badge className="w-fit">כן</Badge>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Coverage & Insurance */}
      {(customer.coverage_details || customer.agent_contract) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Shield className="w-5 h-5" />
              כיסוי וביטוח
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {customer.coverage_details && (
              <div className="space-y-1">
                <div className="text-sm text-[#6b7280]">פירוט כיסוי</div>
                <div className="font-medium whitespace-pre-wrap">{customer.coverage_details}</div>
              </div>
            )}
            {customer.agent_contract && (
              <div className="space-y-1">
                <div className="text-sm text-[#6b7280]">חוזה סוכן</div>
                <div className="font-medium whitespace-pre-wrap">{customer.agent_contract}</div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Payment Details */}
      {(customer.payment_method || customer.payment_date) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <CreditCard className="w-5 h-5" />
              תשלומים
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {customer.payment_method && (
              <div className="space-y-1">
                <div className="text-sm text-[#6b7280]">אופן תשלום</div>
                <div className="font-medium">
                  {customer.payment_method === 'credit_card'
                    ? 'כרטיס אשראי'
                    : customer.payment_method === 'bank_transfer'
                      ? 'העברה בנקאית'
                      : customer.payment_method === 'cash'
                        ? 'מזומן'
                        : customer.payment_method === 'check'
                          ? 'שיק'
                          : customer.payment_method}
                </div>
              </div>
            )}
            {customer.payment_date && (
              <div className="space-y-1">
                <div className="text-sm text-[#6b7280]">תאריך תשלום</div>
                <div className="font-medium text-right tabular-nums" dir="ltr">
                  {customer.payment_date}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Alerts */}
      {customer.alerts && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              התראות
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-medium whitespace-pre-wrap">{customer.alerts}</div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
