import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import DataTable from '@/components/ui/DataTable';
import { Star, Clock, CheckCircle2, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function VendorPerformanceReport({ vendors, calls, ratings }) {
  const vendorStats = vendors.map(vendor => {
    const vendorCalls = calls.filter(c => c.assigned_vendor_id === vendor.id);
    const completedCalls = vendorCalls.filter(c => c.call_status === 'completed');
    const vendorRatings = ratings.filter(r => r.vendor_id === vendor.id);
    
    // Calculate average response time
    const responseTimes = vendorCalls
      .filter(c => c.assigned_at && c.vendor_arrival_time_actual)
      .map(c => {
        const assigned = new Date(c.assigned_at);
        const arrived = new Date(c.vendor_arrival_time_actual);
        return (arrived - assigned) / 1000 / 60; // minutes
      });
    const avgResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0;

    // Calculate average completion time
    const completionTimes = completedCalls
      .filter(c => c.assigned_at && c.closed_at)
      .map(c => {
        const assigned = new Date(c.assigned_at);
        const closed = new Date(c.closed_at);
        return (closed - assigned) / 1000 / 60; // minutes
      });
    const avgCompletionTime = completionTimes.length > 0
      ? completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length
      : 0;

    // Calculate average rating
    const avgRating = vendorRatings.length > 0
      ? vendorRatings.reduce((a, b) => a + b.overall_rating, 0) / vendorRatings.length
      : 0;

    // Calculate completion rate
    const completionRate = vendorCalls.length > 0
      ? (completedCalls.length / vendorCalls.length) * 100
      : 0;

    return {
      id: vendor.id,
      vendor_name: vendor.vendor_name,
      total_calls: vendorCalls.length,
      completed_calls: completedCalls.length,
      completion_rate: completionRate,
      avg_response_time: avgResponseTime,
      avg_completion_time: avgCompletionTime,
      avg_rating: avgRating,
      total_ratings: vendorRatings.length
    };
  }).sort((a, b) => b.total_calls - a.total_calls);

  const columns = [
    {
      header: 'ספק',
      cell: (row) => (
        <Link to={createPageUrl('VendorProfile') + '?id=' + row.id} className="text-[#0078D4] hover:underline font-medium">
          {row.vendor_name}
        </Link>
      )
    },
    {
      header: 'קריאות',
      accessor: 'total_calls',
      cell: (row) => (
        <div className="text-center">
          <div className="font-medium">{row.total_calls}</div>
          <div className="text-xs text-[#616161]">{row.completed_calls} הושלמו</div>
        </div>
      )
    },
    {
      header: 'אחוז השלמה',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-[#E0E0E0] rounded-full h-2">
            <div 
              className="bg-[#2E7D32] h-2 rounded-full"
              style={{ width: `${row.completion_rate}%` }}
            />
          </div>
          <span className="text-sm font-medium">{row.completion_rate.toFixed(0)}%</span>
        </div>
      )
    },
    {
      header: 'זמן תגובה ממוצע',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#0078D4]" />
          <span>{row.avg_response_time > 0 ? `${Math.round(row.avg_response_time)} דק'` : '-'}</span>
        </div>
      )
    },
    {
      header: 'זמן השלמה ממוצע',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#2E7D32]" />
          <span>{row.avg_completion_time > 0 ? `${Math.round(row.avg_completion_time)} דק'` : '-'}</span>
        </div>
      )
    },
    {
      header: 'דירוג',
      cell: (row) => row.avg_rating > 0 ? (
        <div className="flex items-center gap-2">
          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
          <span className="font-medium">{row.avg_rating.toFixed(1)}</span>
          <span className="text-xs text-[#616161]">({row.total_ratings})</span>
        </div>
      ) : '-'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white border border-[#E0E0E0] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <CardContent className="pt-6 text-right">
            <div className="text-sm text-[#616161]">סה"כ ספקים</div>
            <div className="text-2xl font-bold text-[#212121] mt-1">{vendors.length}</div>
          </CardContent>
        </Card>
        <Card className="bg-white border border-[#E0E0E0] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <CardContent className="pt-6 text-right">
            <div className="text-sm text-[#616161]">ממוצע קריאות לספק</div>
            <div className="text-2xl font-bold text-[#212121] mt-1">
              {vendors.length > 0 ? Math.round(calls.length / vendors.length) : 0}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border border-[#E0E0E0] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <CardContent className="pt-6 text-right">
            <div className="text-sm text-[#616161]">דירוג ממוצע כללי</div>
            <div className="text-2xl font-bold text-[#212121] mt-1 flex items-center justify-end gap-2">
              {ratings.length > 0 
                ? (ratings.reduce((a, b) => a + b.overall_rating, 0) / ratings.length).toFixed(1)
                : '0'}
              <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border border-[#E0E0E0] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <CardContent className="pt-6 text-right">
            <div className="text-sm text-[#616161]">ספק מוביל</div>
            <div className="text-xl font-bold text-[#212121] mt-1">
              {vendorStats.length > 0 ? vendorStats[0].vendor_name : '-'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={vendorStats}
        emptyMessage="אין נתוני ספקים"
      />
    </div>
  );
}