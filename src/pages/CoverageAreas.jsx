import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MapPin, Users, Truck, CheckCircle, Clock } from 'lucide-react';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import {
  SlideUp,
  StaggeredList,
  StaggeredItem,
  AnimatedCard,
} from '@/components/animations/AnimatedComponents';
import { cn } from '@/lib/utils';

const coverageAreas = [
  {
    key: 'center',
    label: 'מרכז',
    cities: [
      'תל אביב',
      'רמת גן',
      'גבעתיים',
      'בני ברק',
      'פתח תקווה',
      'ראשון לציון',
      'חולון',
      'בת ים',
    ],
  },
  {
    key: 'sharon',
    label: 'שרון',
    cities: ['נתניה', 'הרצליה', 'רעננה', 'כפר סבא', 'הוד השרון', 'רמת השרון'],
  },
  {
    key: 'north',
    label: 'צפון',
    cities: ['חיפה', 'עכו', 'נהריה', 'קריות', 'טבריה', 'צפת', 'נצרת'],
  },
  {
    key: 'south',
    label: 'דרום',
    cities: ['באר שבע', 'אשדוד', 'אשקלון', 'אילת', 'דימונה', 'קריית גת'],
  },
  {
    key: 'jerusalem',
    label: 'ירושלים והסביבה',
    cities: ['ירושלים', 'בית שמש', 'מודיעין', 'מעלה אדומים'],
  },
  { key: 'lowlands', label: 'שפלה', cities: ['רחובות', 'נס ציונה', 'לוד', 'רמלה', 'יבנה', 'גדרה'] },
];

const availabilityLabels = {
  available: 'זמין',
  busy: 'עסוק',
  offline: 'לא מחובר',
  on_break: 'בהפסקה',
};

const serviceTypeLabels = {
  tow_truck: 'גרר',
  mechanic: 'מכונאי',
  tire_service: 'צמיגים',
  locksmith: 'מנעולן',
  fuel_delivery: 'דלק',
  multi_service: 'שירות משולב',
};

export default function CoverageAreasPage() {
  const [selectedArea, setSelectedArea] = useState('all');

  const { data: vendors = [], isLoading } = useQuery({
    queryKey: ['vendors-coverage'],
    queryFn: () => base44.entities.Vendor.list('-updated_date', 500),
  });

  // Calculate coverage stats per area
  const areaStats = useMemo(() => {
    const stats = {};

    coverageAreas.forEach((area) => {
      const areaVendors = vendors.filter((v) => v.coverage_areas?.includes(area.key));

      stats[area.key] = {
        total: areaVendors.length,
        available: areaVendors.filter((v) => v.availability_status === 'available').length,
        busy: areaVendors.filter((v) => v.availability_status === 'busy').length,
        vendors: areaVendors,
      };
    });

    return stats;
  }, [vendors]);

  // Get vendors for selected area
  const displayedVendors = useMemo(() => {
    if (selectedArea === 'all') {
      return vendors;
    }
    return areaStats[selectedArea]?.vendors || [];
  }, [selectedArea, vendors, areaStats]);

  // Overall stats
  const totalStats = useMemo(
    () => ({
      totalVendors: vendors.length,
      totalAvailable: vendors.filter((v) => v.availability_status === 'available').length,
      areasWithCoverage: Object.values(areaStats).filter((s) => s.total > 0).length,
    }),
    [vendors, areaStats]
  );

  if (isLoading) {
    return <PageLoader text="טוען אזורי כיסוי..." />;
  }

  return (
    <SlideUp>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-[#111827]">אזורי כיסוי</h1>
          <p className="text-[#6b7280] text-sm">צפייה בפריסת הספקים לפי אזורים גיאוגרפיים</p>
        </div>

        {/* Overall Stats */}
        <StaggeredList className="grid grid-cols-3 gap-4">
          <StaggeredItem>
            <AnimatedCard className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[8px] bg-[#f3f4f6] flex items-center justify-center">
                  <Truck className="w-5 h-5 text-[#3b82f6]" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-[#111827]">{totalStats.totalVendors}</div>
                  <div className="text-sm text-[#6b7280]">סה"כ ספקים</div>
                </div>
              </div>
            </AnimatedCard>
          </StaggeredItem>
          <StaggeredItem>
            <AnimatedCard className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[8px] bg-[#f3f4f6] flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-[#111827]" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-[#111827]">
                    {totalStats.totalAvailable}
                  </div>
                  <div className="text-sm text-[#6b7280]">זמינים כעת</div>
                </div>
              </div>
            </AnimatedCard>
          </StaggeredItem>
          <StaggeredItem>
            <AnimatedCard className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[8px] bg-[#f3f4f6] flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-[#3b82f6]" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-[#111827]">
                    {totalStats.areasWithCoverage}
                  </div>
                  <div className="text-sm text-[#6b7280]">אזורים פעילים</div>
                </div>
              </div>
            </AnimatedCard>
          </StaggeredItem>
        </StaggeredList>

        {/* Area Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {coverageAreas.map((area) => {
            const stats = areaStats[area.key] || { total: 0, available: 0, busy: 0 };
            const isSelected = selectedArea === area.key;

            return (
              <Card
                key={area.key}
                className={cn(
                  'cursor-pointer transition-all hover:shadow-md',
                  isSelected ? 'border-[#3b82f6] bg-[#eff6ff]' : 'bg-white border-[#e5e7eb]'
                )}
                onClick={() => setSelectedArea(isSelected ? 'all' : area.key)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MapPin
                        className={cn('w-5 h-5', isSelected ? 'text-[#3b82f6]' : 'text-[#6b7280]')}
                      />
                      {area.label}
                    </CardTitle>
                    <Badge
                      className={
                        stats.total > 0 ? 'bg-[#111827] text-white' : 'bg-[#f3f4f6] text-[#6b7280]'
                      }
                    >
                      {stats.total} ספקים
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 mb-3">
                    <div className="flex items-center gap-1 text-sm">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="text-[#6b7280]">{stats.available} זמינים</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm">
                      <div className="w-2 h-2 rounded-full bg-orange-500" />
                      <span className="text-[#6b7280]">{stats.busy} עסוקים</span>
                    </div>
                  </div>
                  <div className="text-xs text-[#6b7280]">
                    {area.cities.slice(0, 4).join(', ')}
                    {area.cities.length > 4 ? '...' : ''}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Vendors List for Selected Area */}
        <Card className="bg-white border border-[#e5e7eb]">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                {selectedArea === 'all'
                  ? 'כל הספקים'
                  : `ספקים באזור ${coverageAreas.find((a) => a.key === selectedArea)?.label}`}
              </CardTitle>
              <Select value={selectedArea} onValueChange={setSelectedArea}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="בחר אזור" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל האזורים</SelectItem>
                  {coverageAreas.map((area) => (
                    <SelectItem key={area.key} value={area.key}>
                      {area.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {displayedVendors.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 mx-auto text-[#6b7280] mb-3" />
                <p className="text-[#6b7280]">אין ספקים באזור זה</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {displayedVendors.slice(0, 10).map((vendor) => (
                  <div
                    key={vendor.id}
                    className="flex items-center gap-3 p-3 rounded-[8px] border border-[#e5e7eb] hover:bg-[#f9fafb] transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-[#f3f4f6] flex items-center justify-center">
                      <Truck className="w-5 h-5 text-[#6b7280]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-[#111827] truncate">
                        {vendor.vendor_name}
                      </div>
                      <div className="text-xs text-[#6b7280]">
                        {vendor.service_type?.map((t) => serviceTypeLabels[t] || t).join(', ') ||
                          'לא צוין'}
                      </div>
                    </div>
                    <Badge
                      className={cn(
                        'text-xs',
                        vendor.availability_status === 'available'
                          ? 'bg-green-100 text-green-800'
                          : vendor.availability_status === 'busy'
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-gray-100 text-gray-800'
                      )}
                    >
                      {availabilityLabels[vendor.availability_status] || 'לא ידוע'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
            {displayedVendors.length > 10 && (
              <p className="text-center text-sm text-[#6b7280] mt-4">
                מציג 10 מתוך {displayedVendors.length} ספקים
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </SlideUp>
  );
}
