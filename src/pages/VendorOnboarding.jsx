import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { queryKeys } from '@/lib/queryKeys';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserPlus, Link2, CheckCircle, List } from 'lucide-react';
import VendorInviteAndLink from '@/components/vendor/VendorInviteAndLink';
import VendorOnboardingStatus from '@/components/vendor/VendorOnboardingStatus';
import VendorOnboardingChecklist from '@/components/vendor/VendorOnboardingChecklist';

export default function VendorOnboarding() {
  const [activeTab, setActiveTab] = useState('invite');

  const vendorsQuery = useQuery({
    queryKey: queryKeys.vendors.all(),
    queryFn: () => base44.entities.Vendor.list('-created_date', 500),
  });

  const usersQuery = useQuery({
    queryKey: ['users-vendor-role'],
    queryFn: () => base44.entities.User.list('-created_date', 500),
  });

  const vendors = vendorsQuery.data || [];
  const users = usersQuery.data || [];
  const vendorUsers = users.filter(u => u.role === 'vendor' || u.role === 'ספק');

  const linkedVendors = vendors.filter(v => v.email);
  const unlinkedVendors = vendors.filter(v => !v.email);

  return (
    <div className="max-w-5xl mx-auto space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-[#111827]">ניהול חיבור ספקים</h1>
        <p className="text-[#6b7280] text-sm mt-1">
          הזמנת ספקים כמשתמשים, קישור לפרופיל, ומעקב אחרי מוכנות לעבודה
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-3xl font-bold text-[#111827]">{vendors.length}</div>
            <div className="text-xs text-[#6b7280] mt-1">סה"כ ספקים</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-3xl font-bold text-green-600">{linkedVendors.length}</div>
            <div className="text-xs text-[#6b7280] mt-1">מקושרים לחשבון</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-3xl font-bold text-amber-600">{unlinkedVendors.length}</div>
            <div className="text-xs text-[#6b7280] mt-1">ממתינים לקישור</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-3xl font-bold text-blue-600">{vendorUsers.length}</div>
            <div className="text-xs text-[#6b7280] mt-1">משתמשי ספק</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="invite" className="gap-1.5">
            <UserPlus className="w-4 h-4" />
            הזמנה וקישור
          </TabsTrigger>
          <TabsTrigger value="status" className="gap-1.5">
            <List className="w-4 h-4" />
            סטטוס ספקים
          </TabsTrigger>
          <TabsTrigger value="checklist" className="gap-1.5">
            <CheckCircle className="w-4 h-4" />
            רשימת תיוג
          </TabsTrigger>
        </TabsList>

        <TabsContent value="invite" className="mt-4">
          <VendorInviteAndLink
            vendors={vendors}
            vendorUsers={vendorUsers}
            onRefresh={() => {
              vendorsQuery.refetch();
              usersQuery.refetch();
            }}
          />
        </TabsContent>

        <TabsContent value="status" className="mt-4">
          <VendorOnboardingStatus
            vendors={vendors}
            users={users}
            vendorUsers={vendorUsers}
          />
        </TabsContent>

        <TabsContent value="checklist" className="mt-4">
          <VendorOnboardingChecklist />
        </TabsContent>
      </Tabs>
    </div>
  );
}