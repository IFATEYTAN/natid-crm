import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import DataTable from '@/components/ui/DataTable';
import { AlertTriangle, CheckCircle2, Truck, Shield } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const areaLabels = {
  center: 'מרכז',
  north: 'צפון',
  south: 'דרום',
  jerusalem: 'ירושלים',
  sharon: 'שרון',
  lowlands: 'שפלה',
};

const issueLabels = {
  mechanical: 'תקלה מכנית',
  stopped_driving: 'רכב עצר',
  flat_tire: "פנצ'ר",
  stuck_wheel: 'גלגל תקוע',
  accident: 'תאונה',
  no_fuel: 'אזל דלק',
  dead_battery: 'מצבר ריק',
  locked_keys: 'מפתחות ננעלו',
  other: 'אחר',
};

const TAB_KEYS = ['area', 'issue', 'vendor', 'insurance'];
const TAB_LABELS = {
  area: 'לפי אזור',
  issue: 'לפי סוג תקלה',
  vendor: 'לפי ספק',
  insurance: 'לפי חברת ביטוח',
};

// Shared helper to aggregate SLA data
function aggregateSLA(calls, keyFn, labelFn) {
  const groups = {};

  calls.forEach((call) => {
    const key = keyFn(call);
    if (!key) return;

    if (!groups[key]) {
      groups[key] = { total: 0, onTime: 0, breached: 0, avgResponseTime: [] };
    }

    groups[key].total++;

    if (call.time_to_vendor_assignment !== null && call.sla_target) {
      const isOnTime = call.time_to_vendor_assignment <= call.sla_target;
      if (isOnTime) {
        groups[key].onTime++;
      } else {
        groups[key].breached++;
      }
    }

    if (call.time_to_vendor_assignment !== null) {
      groups[key].avgResponseTime.push(call.time_to_vendor_assignment);
    }
  });

  return Object.entries(groups)
    .map(([key, data]) => ({
      label: labelFn(key),
      total: data.total,
      onTime: data.onTime,
      breached: data.breached,
      slaRate: data.total > 0 ? ((data.onTime / data.total) * 100).toFixed(1) : 0,
      avgResponseTime:
        data.avgResponseTime.length > 0
          ? Math.round(
              data.avgResponseTime.reduce((a, b) => a + b, 0) / data.avgResponseTime.length
            )
          : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

const slaProgressCell = (row) => (
  <div className="flex items-center gap-2">
    <div className="flex-1 bg-[#E0E0E0] rounded-full h-2">
      <div className="bg-[#22C55E] h-2 rounded-full" style={{ width: `${row.slaRate}%` }} />
    </div>
    <span className="text-sm font-medium">{row.slaRate}%</span>
  </div>
);

const breachedCell = (row) =>
  row.breached > 0 ? (
    <span className="text-[#FF6B6B] font-medium">{row.breached}</span>
  ) : (
    <span className="text-[#616161]">0</span>
  );

const responseTimeCell = (row) => `${row.avgResponseTime} דק'`;

const tooltipStyle = {
  backgroundColor: '#FFFFFF',
  border: '1px solid #E0E0E0',
  borderRadius: '4px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  fontFamily: 'Heebo',
  fontSize: 14,
  direction: 'rtl',
  textAlign: 'right',
};

export default function SLAReport({ calls }) {
  const [activeTab, setActiveTab] = useState('area');

  // Aggregate by area
  const areaStats = aggregateSLA(
    calls,
    (c) => c.pickup_location_area || 'unknown',
    (key) => areaLabels[key] || key
  );

  // Aggregate by issue type
  const issueStats = aggregateSLA(
    calls,
    (c) => c.issue_type || 'other',
    (key) => issueLabels[key] || key
  );

  // Aggregate by vendor
  const vendorStats = aggregateSLA(
    calls,
    (c) => c.assigned_vendor_name || null,
    (key) => key
  );

  // Aggregate by insurance company
  const insuranceStats = aggregateSLA(
    calls,
    (c) => c.insurance_company || null,
    (key) => key
  );

  const makeColumns = (firstHeader) => [
    { header: firstHeader, accessor: 'label' },
    { header: 'סה"כ קריאות', accessor: 'total' },
    { header: 'עמידה ב-SLA', cell: slaProgressCell },
    { header: 'חריגות', cell: breachedCell },
    { header: 'זמן תגובה ממוצע', cell: responseTimeCell },
  ];

  const statsMap = {
    area: { data: areaStats, col: 'אזור' },
    issue: { data: issueStats, col: 'סוג תקלה' },
    vendor: { data: vendorStats, col: 'ספק' },
    insurance: { data: insuranceStats, col: 'חברת ביטוח' },
  };

  // Overall stats
  const totalCalls = calls.length;
  const totalOnTime = areaStats.reduce((sum, s) => sum + s.onTime, 0);
  const totalBreached = areaStats.reduce((sum, s) => sum + s.breached, 0);
  const overallSLARate = totalCalls > 0 ? ((totalOnTime / totalCalls) * 100).toFixed(1) : 0;

  // Chart data from area stats (default view)
  const chartData = areaStats.map((stat) => ({
    name: stat.label,
    'עמידה ב-SLA': parseFloat(stat.slaRate),
    'זמן תגובה': stat.avgResponseTime,
  }));

  // Vendor chart data
  const vendorChartData = vendorStats.slice(0, 10).map((stat) => ({
    name: stat.label.length > 15 ? stat.label.slice(0, 15) + '...' : stat.label,
    'עמידה ב-SLA': parseFloat(stat.slaRate),
    'זמן תגובה': stat.avgResponseTime,
  }));

  // Insurance chart data
  const insuranceChartData = insuranceStats.map((stat) => ({
    name: stat.label.length > 15 ? stat.label.slice(0, 15) + '...' : stat.label,
    'עמידה ב-SLA': parseFloat(stat.slaRate),
    'זמן תגובה': stat.avgResponseTime,
  }));

  return (
    <div className="space-y-6" dir="rtl">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white border border-[#E0E0E0] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <CardContent className="pt-6 text-end" dir="rtl">
            <div className="text-sm text-[#616161]">עמידה כללית ב-SLA</div>
            <div className="text-2xl font-bold text-[#22C55E] mt-1">{overallSLARate}%</div>
          </CardContent>
        </Card>
        <Card className="bg-white border border-[#E0E0E0] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <CardContent className="pt-6 text-end" dir="rtl">
            <div className="text-sm text-[#616161]">קריאות בזמן</div>
            <div className="text-2xl font-bold text-[#22C55E] mt-1 flex items-center justify-end gap-2">
              {totalOnTime}
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border border-[#E0E0E0] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <CardContent className="pt-6 text-end" dir="rtl">
            <div className="text-sm text-[#616161]">חריגות SLA</div>
            <div className="text-2xl font-bold text-[#FF6B6B] mt-1 flex items-center justify-end gap-2">
              {totalBreached}
              <AlertTriangle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border border-[#E0E0E0] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <CardContent className="pt-6 text-end" dir="rtl">
            <div className="text-sm text-[#616161]">ספקים פעילים</div>
            <div className="text-2xl font-bold text-[#212121] mt-1 flex items-center justify-end gap-2">
              {vendorStats.length}
              <Truck className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Area Chart */}
      <Card className="bg-white border border-[#E0E0E0] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <CardHeader>
          <CardTitle className="text-[20px] font-medium text-[#212121] text-end">
            עמידה ב-SLA וזמני תגובה לפי אזור
          </CardTitle>
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
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontFamily: 'Heebo', fontSize: 12 }} />
              <Bar yAxisId="left" dataKey="עמידה ב-SLA" fill="#22C55E" radius={[4, 4, 0, 0]} />
              <Bar yAxisId="right" dataKey="זמן תגובה" fill="#FF6B6B" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Vendor SLA Chart */}
      {vendorChartData.length > 0 && (
        <Card className="bg-white border border-[#E0E0E0] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <CardHeader>
            <CardTitle className="text-[20px] font-medium text-[#212121] text-end flex items-center justify-end gap-2">
              <Truck className="w-5 h-5 text-[#616161]" />
              עמידה ב-SLA לפי ספק (עד 10 ספקים מובילים)
            </CardTitle>
          </CardHeader>
          <CardContent dir="rtl">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={vendorChartData} margin={{ right: 30, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#616161', fontFamily: 'Heebo', fontSize: 11 }}
                  stroke="#E0E0E0"
                  reversed={true}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  height={60}
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
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontFamily: 'Heebo', fontSize: 12 }} />
                <Bar yAxisId="left" dataKey="עמידה ב-SLA" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="זמן תגובה" fill="#f97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Insurance SLA Chart */}
      {insuranceChartData.length > 0 && (
        <Card className="bg-white border border-[#E0E0E0] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <CardHeader>
            <CardTitle className="text-[20px] font-medium text-[#212121] text-end flex items-center justify-end gap-2">
              <Shield className="w-5 h-5 text-[#616161]" />
              עמידה ב-SLA לפי חברת ביטוח
            </CardTitle>
          </CardHeader>
          <CardContent dir="rtl">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={insuranceChartData} margin={{ right: 30, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#616161', fontFamily: 'Heebo', fontSize: 11 }}
                  stroke="#E0E0E0"
                  reversed={true}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  height={60}
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
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontFamily: 'Heebo', fontSize: 12 }} />
                <Bar yAxisId="left" dataKey="עמידה ב-SLA" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="זמן תגובה" fill="#ec4899" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Tab-based Tables */}
      <Card className="bg-white border border-[#E0E0E0] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              {TAB_KEYS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    activeTab === tab
                      ? 'bg-white text-[#212121] shadow-sm'
                      : 'text-[#616161] hover:text-[#212121]'
                  }`}
                >
                  {TAB_LABELS[tab]}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent dir="rtl">
          <DataTable
            columns={makeColumns(statsMap[activeTab].col)}
            data={statsMap[activeTab].data}
            emptyMessage="אין נתונים"
          />
        </CardContent>
      </Card>
    </div>
  );
}
