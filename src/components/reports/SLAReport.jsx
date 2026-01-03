import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import DataTable from '@/components/ui/DataTable';
import { AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const areaLabels = {
  center: 'מרכז',
  north: 'צפון',
  south: 'דרום',
  jerusalem: 'ירושלים',
  sharon: 'שרון',
  lowlands: 'שפלה'
};

const issueLabels = {
  mechanical: 'תקלה מכנית',
  stopped_driving: 'רכב עצר',
  flat_tire: 'פנצ\'ר',
  stuck_wheel: 'גלגל תקוע',
  accident: 'תאונה',
  no_fuel: 'אזל דלק',
  dead_battery: 'מצבר ריק',
  locked_keys: 'מפתחות ננעלו',
  other: 'אחר'
};

export default function SLAReport({ calls }) {
  // Group by area
  const byArea = {};
  const byIssueType = {};

  calls.forEach(call => {
    const area = call.pickup_location_area || 'unknown';
    const issueType = call.issue_type || 'other';
    
    if (!byArea[area]) {
      byArea[area] = { total: 0, onTime: 0, breached: 0, avgResponseTime: [] };
    }
    if (!byIssueType[issueType]) {
      byIssueType[issueType] = { total: 0, onTime: 0, breached: 0, avgResponseTime: [] };
    }

    byArea[area].total++;
    byIssueType[issueType].total++;

    // Check SLA
    if (call.time_to_vendor_assignment !== null && call.sla_target) {
      const isOnTime = call.time_to_vendor_assignment <= call.sla_target;
      if (isOnTime) {
        byArea[area].onTime++;
        byIssueType[issueType].onTime++;
      } else {
        byArea[area].breached++;
        byIssueType[issueType].breached++;
      }
    }

    // Add response time
    if (call.time_to_vendor_assignment !== null) {
      byArea[area].avgResponseTime.push(call.time_to_vendor_assignment);
      byIssueType[issueType].avgResponseTime.push(call.time_to_vendor_assignment);
    }
  });

  // Calculate stats
  const areaStats = Object.entries(byArea).map(([area, data]) => ({
    area: areaLabels[area] || area,
    total: data.total,
    onTime: data.onTime,
    breached: data.breached,
    slaRate: data.total > 0 ? ((data.onTime / data.total) * 100).toFixed(1) : 0,
    avgResponseTime: data.avgResponseTime.length > 0
      ? Math.round(data.avgResponseTime.reduce((a, b) => a + b, 0) / data.avgResponseTime.length)
      : 0
  })).sort((a, b) => b.total - a.total);

  const issueStats = Object.entries(byIssueType).map(([issue, data]) => ({
    issueType: issueLabels[issue] || issue,
    total: data.total,
    onTime: data.onTime,
    breached: data.breached,
    slaRate: data.total > 0 ? ((data.onTime / data.total) * 100).toFixed(1) : 0,
    avgResponseTime: data.avgResponseTime.length > 0
      ? Math.round(data.avgResponseTime.reduce((a, b) => a + b, 0) / data.avgResponseTime.length)
      : 0
  })).sort((a, b) => b.total - a.total);

  const areaColumns = [
    { header: 'אזור', accessor: 'area' },
    { header: 'סה"כ קריאות', accessor: 'total' },
    {
      header: 'עמידה ב-SLA',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-[#E0E0E0] rounded-full h-2">
            <div 
              className="bg-[#2E7D32] h-2 rounded-full"
              style={{ width: `${row.slaRate}%` }}
            />
          </div>
          <span className="text-sm font-medium">{row.slaRate}%</span>
        </div>
      )
    },
    {
      header: 'חריגות',
      cell: (row) => row.breached > 0 ? (
        <span className="text-[#D32F2F] font-medium">{row.breached}</span>
      ) : (
        <span className="text-[#616161]">0</span>
      )
    },
    {
      header: 'זמן תגובה ממוצע',
      cell: (row) => `${row.avgResponseTime} דק'`
    }
  ];

  const issueColumns = [
    { header: 'סוג תקלה', accessor: 'issueType' },
    { header: 'סה"כ קריאות', accessor: 'total' },
    {
      header: 'עמידה ב-SLA',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-[#E0E0E0] rounded-full h-2">
            <div 
              className="bg-[#2E7D32] h-2 rounded-full"
              style={{ width: `${row.slaRate}%` }}
            />
          </div>
          <span className="text-sm font-medium">{row.slaRate}%</span>
        </div>
      )
    },
    {
      header: 'זמן תגובה ממוצע',
      cell: (row) => `${row.avgResponseTime} דק'`
    }
  ];

  // Prepare chart data
  const chartData = areaStats.map(stat => ({
    name: stat.area,
    'עמידה ב-SLA': parseFloat(stat.slaRate),
    'זמן תגובה': stat.avgResponseTime
  }));

  const totalCalls = calls.length;
  const totalOnTime = Object.values(byArea).reduce((sum, data) => sum + data.onTime, 0);
  const totalBreached = Object.values(byArea).reduce((sum, data) => sum + data.breached, 0);
  const overallSLARate = totalCalls > 0 ? ((totalOnTime / totalCalls) * 100).toFixed(1) : 0;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white border border-[#E0E0E0] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <CardContent className="pt-6 text-right">
            <div className="text-sm text-[#616161]">עמידה כללית ב-SLA</div>
            <div className="text-2xl font-bold text-[#2E7D32] mt-1">{overallSLARate}%</div>
          </CardContent>
        </Card>
        <Card className="bg-white border border-[#E0E0E0] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <CardContent className="pt-6 text-right">
            <div className="text-sm text-[#616161]">קריאות בזמן</div>
            <div className="text-2xl font-bold text-[#2E7D32] mt-1 flex items-center justify-end gap-2">
              {totalOnTime}
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border border-[#E0E0E0] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <CardContent className="pt-6 text-right">
            <div className="text-sm text-[#616161]">חריגות SLA</div>
            <div className="text-2xl font-bold text-[#D32F2F] mt-1 flex items-center justify-end gap-2">
              {totalBreached}
              <AlertTriangle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border border-[#E0E0E0] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <CardContent className="pt-6 text-right">
            <div className="text-sm text-[#616161]">אזור עם הכי הרבה חריגות</div>
            <div className="text-xl font-bold text-[#212121] mt-1">
              {areaStats.length > 0 ? areaStats.sort((a, b) => b.breached - a.breached)[0].area : '-'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card className="bg-white border border-[#E0E0E0] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <CardHeader>
          <CardTitle className="text-[20px] font-medium text-[#212121] text-right">עמידה ב-SLA וזמני תגובה לפי אזור</CardTitle>
        </CardHeader>
        <CardContent dir="rtl">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ right: 30, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
              <XAxis 
                dataKey="name" 
                tick={{ fill: '#616161', fontFamily: 'Heebo', fontSize: 12 }}
                stroke="#E0E0E0"
                reversed={true}
              />
              <YAxis 
                yAxisId="left" 
                tick={{ fill: '#616161', fontFamily: 'Heebo', fontSize: 12 }}
                stroke="#E0E0E0"
                orientation="right"
              />
              <YAxis 
                yAxisId="right" 
                orientation="left" 
                tick={{ fill: '#616161', fontFamily: 'Heebo', fontSize: 12 }}
                stroke="#E0E0E0"
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E0E0E0',
                  borderRadius: '4px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  fontFamily: 'Heebo',
                  fontSize: 14,
                  direction: 'rtl',
                  textAlign: 'right'
                }}
              />
              <Legend wrapperStyle={{ fontFamily: 'Heebo', fontSize: 12 }} />
              <Bar yAxisId="left" dataKey="עמידה ב-SLA" fill="#2E7D32" radius={[4, 4, 0, 0]} />
              <Bar yAxisId="right" dataKey="זמן תגובה" fill="#FF0000" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Tables */}
      <div className="grid lg:grid-cols-2 gap-6" dir="rtl">
        <div>
          <h3 className="text-[20px] font-medium text-[#212121] mb-4 text-right">לפי אזור</h3>
          <DataTable
            columns={areaColumns}
            data={areaStats}
            emptyMessage="אין נתונים"
          />
        </div>
        <div>
          <h3 className="text-[20px] font-medium text-[#212121] mb-4 text-right">לפי סוג תקלה</h3>
          <DataTable
            columns={issueColumns}
            data={issueStats}
            emptyMessage="אין נתונים"
          />
        </div>
      </div>
    </div>
  );
}