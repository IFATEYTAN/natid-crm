import React, { useMemo, Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Repeat, MapPin, Car } from 'lucide-react';
import { CustomerFrequencyChart, IssueTypesChart } from '@/components/reports/ReportsCharts';

export default function CustomerAnalysisReport({ calls }) {
  // Stats calculation
  const stats = useMemo(() => {
    const uniqueCustomers = new Set(calls.map(c => c.customer_phone)).size;
    const returningCustomers = calls.reduce((acc, call) => {
        acc[call.customer_phone] = (acc[call.customer_phone] || 0) + 1;
        return acc;
    }, {});
    
    const returningCount = Object.values(returningCustomers).filter(count => count > 1).length;
    const totalCalls = calls.length;

    return {
      uniqueCustomers,
      returningCustomers: returningCount,
      avgCallsPerCustomer: uniqueCustomers ? (totalCalls / uniqueCustomers).toFixed(1) : 0,
    };
  }, [calls]);

  // Top Customers
  const topCustomersData = useMemo(() => {
    const counts = {};
    calls.forEach((call) => {
      const name = call.customer_name || call.customer_phone || 'לא ידוע';
      counts[name] = (counts[name] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([name, count]) => ({ name, calls: count }))
      .sort((a, b) => b.calls - a.calls)
      .slice(0, 10);
  }, [calls]);

  // Service Types (using existing logic logic but passing to chart)
  const serviceTypesData = useMemo(() => {
      const typeCounts = {};
      const typeLabels = {
        mechanical: 'תקלה מכנית',
        stopped_driving: 'רכב לא נוסע',
        flat_tire: "פנצ'ר",
        accident: 'תאונה',
        no_fuel: 'אין דלק',
        dead_battery: 'מצבר',
        locked_keys: 'מפתחות',
        other: 'אחר',
      };
  
      calls.forEach((call) => {
        const type = call.issue_type || 'other';
        typeCounts[type] = (typeCounts[type] || 0) + 1;
      });
  
      return Object.entries(typeCounts)
        .map(([type, count]) => ({
          name: typeLabels[type] || type,
          value: count,
        }))
        .sort((a, b) => b.value - a.value);
  }, [calls]);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-pink-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-pink-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.uniqueCustomers}</div>
                <div className="text-xs text-gray-500">לקוחות ייחודיים</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                <Repeat className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.returningCustomers}</div>
                <div className="text-xs text-gray-500">לקוחות חוזרים</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center">
                <Car className="w-5 h-5 text-teal-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.avgCallsPerCustomer}</div>
                <div className="text-xs text-gray-500">ממוצע קריאות ללקוח</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">לקוחות מובילים (תדירות)</CardTitle>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<Skeleton className="h-[300px]" />}>
              <CustomerFrequencyChart data={topCustomersData} />
            </Suspense>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
             <CardTitle className="text-lg">סוגי שירות נפוצים</CardTitle>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<Skeleton className="h-[300px]" />}>
               <IssueTypesChart data={serviceTypesData} />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}