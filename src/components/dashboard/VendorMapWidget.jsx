import { lazyRetry } from '@/lib/lazyRetry';
import React, { Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { queryKeys } from '@/lib/queryKeys';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { MapPin } from 'lucide-react';

const VendorTrackingLeafletMap = lazyRetry(
  () => import('@/components/maps/VendorTrackingLeafletMap')
);

export default function VendorMapWidget() {
  const { data: vendors = [], isLoading } = useQuery({
    queryKey: queryKeys.dashboardVendorLocations.all(),
    queryFn: () => base44.entities.Vendor.filter({ is_active: true }, '-updated_date', 1000),
    refetchInterval: 30000,
  });

  const vendorsWithLocation = vendors.filter((v) => v.current_latitude && v.current_longitude);
  const availableCount = vendors.filter((v) => v.availability_status === 'available').length;
  const busyCount = vendors.filter((v) => v.availability_status === 'busy').length;

  if (isLoading) return <Skeleton className="h-[350px]" />;

  return (
    <Card className="hover:shadow-md transition-all duration-300 overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-500" />
              מעקב GPS ספקים
            </CardTitle>
            <CardDescription>מיקום ספקים בזמן אמת</CardDescription>
          </div>
          <div className="flex gap-2">
            <Badge className="bg-green-100 text-green-800 text-xs">{availableCount} זמינים</Badge>
            <Badge className="bg-orange-100 text-orange-800 text-xs">{busyCount} עסוקים</Badge>
            <Badge className="bg-blue-100 text-blue-800 text-xs">
              {vendorsWithLocation.length} עם מיקום
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="h-[300px]">
          <Suspense
            fallback={
              <div className="h-full w-full bg-gray-50 flex items-center justify-center text-gray-400">
                טוען מפה...
              </div>
            }
          >
            <VendorTrackingLeafletMap vendors={vendorsWithLocation} />
          </Suspense>
        </div>
      </CardContent>
    </Card>
  );
}