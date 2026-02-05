import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ArrowRight,
  Pencil,
  Phone,
  Mail,
  MapPin,
  Clock,
  Truck,
  Star,
  CheckCircle,
  XCircle,
  User,
  Loader2,
  FileText
} from 'lucide-react';
import { SlideUp, AnimatedCard, StaggeredList, StaggeredItem } from '@/components/animations/AnimatedComponents';

const serviceTypeLabels = {
  tow_truck: 'גרר',
  mechanic: 'מכונאי',
  tire_service: 'צמיגים',
  locksmith: 'מנעולן',
  fuel_delivery: 'דלק',
  multi_service: 'שירות משולב',
};

const coverageLabels = {
  center: 'מרכז',
  sharon: 'שרון',
  north: 'צפון',
  south: 'דרום',
  jerusalem: 'ירושלים',
  lowlands: 'שפלה',
};

export default function VendorDetailsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const id = searchParams.get('id');

  const { data: vendor, isLoading } = useQuery({
    queryKey: ['vendor', id],
    queryFn: () => base44.entities.Vendor.get(id),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold mb-4">הספק לא נמצא</h2>
        <Button onClick={() => navigate(createPageUrl('ServiceProviders'))}>
          חזרה לרשימה
        </Button>
      </div>
    );
  }

  return (
    <SlideUp>
      <div className="max-w-4xl mx-auto space-y-6 pb-10">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowRight className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-[#111827]">{vendor.vendor_name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={vendor.is_active ? 'default' : 'secondary'} className={vendor.is_active ? 'bg-green-600' : ''}>
                  {vendor.is_active ? 'פעיל' : 'לא פעיל'}
                </Badge>
                <span className="text-sm text-gray-500">
                  {vendor.availability_status === 'available' ? 'זמין כעת' : 'לא זמין'}
                </span>
              </div>
            </div>
          </div>
          <Button 
            className="bg-[#3b82f6] hover:bg-[#2563eb] gap-2"
            onClick={() => navigate(createPageUrl(`EditVendor?id=${vendor.id}`))}
          >
            <Pencil className="w-4 h-4" />
            עריכה
          </Button>
        </div>

        <StaggeredList className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Info */}
          <StaggeredItem className="md:col-span-2 space-y-6">
            <AnimatedCard className="bg-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="w-5 h-5 text-gray-500" />
                  פרטי התקשרות
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                      <Phone className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">טלפון ראשי</div>
                      <div className="font-medium" dir="ltr">{vendor.phone}</div>
                    </div>
                  </div>
                  
                  {vendor.phone_2 && (
                    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                        <Phone className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">טלפון משני</div>
                        <div className="font-medium" dir="ltr">{vendor.phone_2}</div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center shrink-0">
                      <Mail className="w-4 h-4 text-orange-600" />
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">אימייל</div>
                      <div className="font-medium break-all">{vendor.email || '-'}</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-purple-600" />
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">איש קשר</div>
                      <div className="font-medium">{vendor.contact_person || '-'}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </AnimatedCard>

            <AnimatedCard className="bg-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Truck className="w-5 h-5 text-gray-500" />
                  שירותים ואזורים
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-3">סוגי שירות</h3>
                  <div className="flex flex-wrap gap-2">
                    {vendor.service_type?.map(type => (
                      <Badge key={type} variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100">
                        {serviceTypeLabels[type] || type}
                      </Badge>
                    ))}
                    {!vendor.service_type?.length && <span className="text-gray-400 text-sm">לא הוגדרו שירותים</span>}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-3">רכבים נתמכים</h3>
                  <div className="flex flex-wrap gap-2">
                    {vendor.vehicle_types_supported?.map(type => (
                      <Badge key={type} variant="outline">
                        {type === 'private' ? 'רכב פרטי' : 
                         type === 'commercial_light' ? 'מסחרי קל' :
                         type === 'truck' ? 'משאית' : 
                         type === 'motorcycle' ? 'אופנוע' : type}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    אזורי כיסוי
                  </h3>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {vendor.coverage_areas?.map(area => (
                      <Badge key={area} className="bg-gray-100 text-gray-800 hover:bg-gray-200 border-0">
                        {coverageLabels[area] || area}
                      </Badge>
                    ))}
                  </div>
                  {vendor.coverage_cities && (
                    <p className="text-sm text-gray-600 mt-2 bg-gray-50 p-3 rounded-md">
                      {vendor.coverage_cities}
                    </p>
                  )}
                </div>
              </CardContent>
            </AnimatedCard>
          </StaggeredItem>

          {/* Sidebar Info */}
          <StaggeredItem className="space-y-6">
            <AnimatedCard className="bg-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Clock className="w-5 h-5 text-gray-500" />
                  זמינות ושעות
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium">עובד 24/7</span>
                  {vendor.works_24_7 ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                
                {!vendor.works_24_7 && (
                  <div className="text-center p-3 border rounded-lg">
                    <div className="text-sm text-gray-500 mb-1">שעות פעילות</div>
                    <div className="font-bold text-lg dir-ltr">
                      {vendor.working_hours_start} - {vendor.working_hours_end}
                    </div>
                  </div>
                )}
              </CardContent>
            </AnimatedCard>

            <AnimatedCard className="bg-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Star className="w-5 h-5 text-yellow-500" />
                  ביצועים
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center p-4 bg-yellow-50 rounded-xl">
                  <div className="text-3xl font-bold text-yellow-600 mb-1">
                    {vendor.average_rating?.toFixed(1) || '0.0'}
                  </div>
                  <div className="text-xs text-yellow-700">דירוג ממוצע</div>
                  <div className="text-xs text-gray-500 mt-1">({vendor.total_ratings || 0} דירוגים)</div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-xl font-bold text-blue-600">{vendor.total_jobs || 0}</div>
                    <div className="text-xs text-blue-700">עבודות</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-xl font-bold text-green-600">{vendor.success_rate || 0}%</div>
                    <div className="text-xs text-green-700">הצלחה</div>
                  </div>
                </div>
              </CardContent>
            </AnimatedCard>
            
            {vendor.notes && (
              <AnimatedCard className="bg-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileText className="w-5 h-5 text-gray-500" />
                    הערות
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{vendor.notes}</p>
                </CardContent>
              </AnimatedCard>
            )}
          </StaggeredItem>
        </StaggeredList>
      </div>
    </SlideUp>
  );
}