import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import StatCard from '@/components/ui/StatCard';
import {
  ArrowRight,
  MapPin,
  Phone,
  Mail,
  Star,
  FileText,
  Activity
} from 'lucide-react';
import VendorAIInsights from '@/components/ai/VendorAIInsights';
import { format, parseISO } from 'date-fns';
import { he } from 'date-fns/locale';
import { Skeleton } from "@/components/ui/skeleton";

export default function VendorProfile() {
  const urlParams = new URLSearchParams(window.location.search);
  const vendorId = urlParams.get('id');

  const { data: vendor, isLoading: vendorLoading } = useQuery({
    queryKey: ['vendor', vendorId],
    queryFn: async () => {
      const vendors = await base44.entities.Vendor.filter({ id: vendorId });
      return vendors[0];
    },
    enabled: !!vendorId,
  });

  const { data: calls = [], isLoading: callsLoading } = useQuery({
    queryKey: ['vendor-calls', vendorId],
    queryFn: () => base44.entities.Call.filter({ assigned_vendor_id: vendorId }, '-created_date', 50),
    enabled: !!vendorId,
  });

  const { data: ratings = [] } = useQuery({
    queryKey: ['vendor-ratings', vendorId],
    queryFn: () => base44.entities.VendorRating.filter({ vendor_id: vendorId }, '-created_date', 20),
    enabled: !!vendorId,
  });

  const { data: payments = [] } = useQuery({
    queryKey: ['vendor-payments', vendorId],
    queryFn: () => base44.entities.VendorPayment.filter({ vendor_id: vendorId }, '-created_date', 20),
    enabled: !!vendorId,
  });

  const { data: contracts = [] } = useQuery({
    queryKey: ['vendor-contracts', vendorId],
    queryFn: () => base44.entities.VendorContract.filter({ vendor_id: vendorId }, '-created_date'),
    enabled: !!vendorId,
  });

  const { data: location } = useQuery({
    queryKey: ['vendor-location', vendorId],
    queryFn: async () => {
      const locations = await base44.entities.VendorLocation.filter({ vendor_id: vendorId }, '-created_date', 1);
      return locations[0];
    },
    enabled: !!vendorId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (vendorLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid lg:grid-cols-4 gap-6">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="text-center py-12">
        <p className="text-[#616161]">ספק לא נמצא</p>
        <Link to={createPageUrl('ServiceProviders')}>
          <Button variant="outline" className="mt-4">חזרה לספקים</Button>
        </Link>
      </div>
    );
  }

  const activeContract = contracts.find(c => c.status === 'active');
  const completedCalls = calls.filter(c => c.call_status === 'completed').length;
  const avgRating = ratings.length > 0 
    ? (ratings.reduce((acc, r) => acc + r.overall_rating, 0) / ratings.length).toFixed(1)
    : vendor.average_rating || 0;

  const callColumns = [
    {
      header: 'מספר קריאה',
      accessor: 'call_number',
      cell: (row) => (
        <Link to={createPageUrl('CallDetails') + '?id=' + row.id} className="text-[#0078D4] hover:underline">
          {row.call_number}
        </Link>
      )
    },
    {
      header: 'לקוח',
      accessor: 'customer_name'
    },
    {
      header: 'סטטוס',
      cell: (row) => <StatusBadge status={row.call_status} size="sm" />
    },
    {
      header: 'תאריך',
      cell: (row) => row.created_date ? format(parseISO(row.created_date), 'dd/MM/yyyy HH:mm', { locale: he }) : '-'
    }
  ];

  const ratingColumns = [
    {
      header: 'קריאה',
      accessor: 'call_number',
      cell: (row) => (
        <Link to={createPageUrl('CallDetails') + '?id=' + row.call_id} className="text-[#0078D4] hover:underline">
          {row.call_number}
        </Link>
      )
    },
    {
      header: 'דירוג',
      cell: (row) => (
        <div className="flex items-center gap-1">
          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
          <span className="font-medium">{row.overall_rating}</span>
        </div>
      )
    },
    {
      header: 'משוב',
      accessor: 'feedback',
      cell: (row) => row.feedback ? row.feedback.substring(0, 50) + '...' : '-'
    },
    {
      header: 'תאריך',
      cell: (row) => row.created_date ? format(parseISO(row.created_date), 'dd/MM/yyyy', { locale: he }) : '-'
    }
  ];

  const paymentColumns = [
    {
      header: 'סוג',
      cell: (row) => {
        const types = {
          call_payment: 'תשלום קריאה',
          monthly_fee: 'דמי חודש',
          bonus: 'בונוס',
          adjustment: 'התאמה'
        };
        return types[row.payment_type] || row.payment_type;
      }
    },
    {
      header: 'סכום',
      cell: (row) => `₪${row.amount.toLocaleString()}`
    },
    {
      header: 'סטטוס',
      cell: (row) => <StatusBadge status={row.status} size="sm" />
    },
    {
      header: 'תאריך',
      cell: (row) => row.created_date ? format(parseISO(row.created_date), 'dd/MM/yyyy', { locale: he }) : '-'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to={createPageUrl('ServiceProviders')}>
            <Button variant="ghost" size="icon">
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-[32px] font-bold text-[#212121]">{vendor.vendor_name}</h1>
            <div className="flex items-center gap-3 mt-1">
              <StatusBadge status={vendor.availability_status || (vendor.is_available_now ? 'available' : 'offline')} />
              {location && (
                <span className="text-sm text-[#616161] flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  עדכון אחרון: {format(parseISO(location.created_date), 'HH:mm', { locale: he })}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Phone className="w-4 h-4" />
            התקשר
          </Button>
          <Button className="bg-[#0078D4] gap-2">
            <Mail className="w-4 h-4" />
            שלח הודעה
          </Button>
        </div>
      </div>

      {/* AI Insights */}
      <VendorAIInsights vendorId={vendorId} />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="קריאות הושלמו"
          value={completedCalls}
        />
        <StatCard
          title="דירוג ממוצע"
          value={avgRating}
        />
        <StatCard
          title="זמן תגובה ממוצע"
          value={vendor.average_response_time ? `${Math.round(vendor.average_response_time)} דק'` : '-'}
        />
        <StatCard
          title="תשלומים ממתינים"
          value={`₪${vendor.pending_payments?.toLocaleString() || 0}`}
        />
      </div>

      {/* Contact & Contract Info */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">פרטי קשר</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-[#616161]" />
              <div>
                <p className="text-sm text-[#616161]">טלפון ראשי</p>
                <p className="font-medium">{vendor.phone}</p>
              </div>
            </div>
            {vendor.phone_2 && (
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-[#616161]" />
                <div>
                  <p className="text-sm text-[#616161]">טלפון משני</p>
                  <p className="font-medium">{vendor.phone_2}</p>
                </div>
              </div>
            )}
            {vendor.email && (
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-[#616161]" />
                <div>
                  <p className="text-sm text-[#616161]">אימייל</p>
                  <p className="font-medium">{vendor.email}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3">
              <MapPin className="w-4 h-4 text-[#616161]" />
              <div>
                <p className="text-sm text-[#616161]">אזורי כיסוי</p>
                <p className="font-medium">{vendor.coverage_areas?.join(', ') || '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4" />
              חוזה פעיל
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeContract ? (
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-[#616161]">מספר חוזה</p>
                  <p className="font-medium">{activeContract.contract_number}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-[#616161]">תאריך התחלה</p>
                    <p className="font-medium">
                      {format(parseISO(activeContract.start_date), 'dd/MM/yyyy', { locale: he })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[#616161]">תאריך סיום</p>
                    <p className="font-medium">
                      {activeContract.end_date ? format(parseISO(activeContract.end_date), 'dd/MM/yyyy', { locale: he }) : '-'}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-[#616161]">תעריף לקריאה</p>
                  <p className="font-medium">₪{activeContract.rate_per_call?.toLocaleString() || '-'}</p>
                </div>
              </div>
            ) : (
              <p className="text-center py-8 text-[#616161]">אין חוזה פעיל</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="calls" className="space-y-4">
        <TabsList>
          <TabsTrigger value="calls">
            <Activity className="w-4 h-4 ml-2" />
            קריאות ({calls.length})
          </TabsTrigger>
          <TabsTrigger value="ratings">
            <Star className="w-4 h-4 ml-2" />
            דירוגים ({ratings.length})
          </TabsTrigger>
          <TabsTrigger value="payments">
            <DollarSign className="w-4 h-4 ml-2" />
            תשלומים ({payments.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calls">
          <DataTable
            columns={callColumns}
            data={calls}
            isLoading={callsLoading}
            emptyMessage="אין קריאות"
          />
        </TabsContent>

        <TabsContent value="ratings">
          <DataTable
            columns={ratingColumns}
            data={ratings}
            emptyMessage="אין דירוגים"
          />
        </TabsContent>

        <TabsContent value="payments">
          <DataTable
            columns={paymentColumns}
            data={payments}
            emptyMessage="אין תשלומים"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}