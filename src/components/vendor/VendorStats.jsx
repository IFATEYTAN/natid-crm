import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Clock, Star, TrendingUp, Calendar, DollarSign } from 'lucide-react';

export default function VendorStats({ vendor, calls = [], onStatClick }) {
  // Calculate stats
  const completedCalls = calls.filter((c) => c.call_status === 'completed');

  const thisMonth = new Date();
  const thisMonthCalls = completedCalls.filter((c) => {
    if (!c.created_date) return false;
    const created = new Date(c.created_date);
    if (isNaN(created.getTime())) return false;
    return (
      created.getMonth() === thisMonth.getMonth() &&
      created.getFullYear() === thisMonth.getFullYear()
    );
  });

  const lastMonth = new Date();
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  const lastMonthCalls = completedCalls.filter((c) => {
    if (!c.created_date) return false;
    const created = new Date(c.created_date);
    if (isNaN(created.getTime())) return false;
    return (
      created.getMonth() === lastMonth.getMonth() &&
      created.getFullYear() === lastMonth.getFullYear()
    );
  });

  const monthlyGrowth =
    lastMonthCalls.length > 0
      ? (((thisMonthCalls.length - lastMonthCalls.length) / lastMonthCalls.length) * 100).toFixed(0)
      : 0;

  // Calculate average response time
  const avgResponseTime =
    completedCalls.length > 0
      ? completedCalls
          .filter((c) => c.assigned_at && c.vendor_arrival_time_actual)
          .reduce((sum, c) => {
            const assigned = new Date(c.assigned_at);
            const arrived = new Date(c.vendor_arrival_time_actual);
            return sum + (arrived - assigned) / 60000; // minutes
          }, 0) / completedCalls.filter((c) => c.assigned_at && c.vendor_arrival_time_actual).length
      : 0;

  const stats = [
    {
      id: 'month',
      title: 'קריאות החודש',
      value: thisMonthCalls.length,
      icon: Calendar,
      color: 'bg-blue-100 text-blue-600',
      trend:
        monthlyGrowth > 0 ? `+${monthlyGrowth}%` : monthlyGrowth < 0 ? `${monthlyGrowth}%` : null,
      trendPositive: monthlyGrowth > 0,
    },
    {
      id: 'completed',
      title: 'סה"כ נסגרו',
      value: completedCalls.length,
      icon: CheckCircle,
      color: 'bg-green-100 text-green-600',
    },
    {
      id: 'rating',
      title: 'דירוג ממוצע',
      value: vendor?.average_rating?.toFixed(1) || '-',
      icon: Star,
      color: 'bg-yellow-100 text-yellow-600',
      suffix: vendor?.total_ratings ? `(${vendor.total_ratings})` : null,
    },
    {
      id: 'arrival',
      title: 'זמן הגעה ממוצע',
      value: avgResponseTime > 0 ? Math.round(avgResponseTime) : '-',
      icon: Clock,
      color: 'bg-purple-100 text-purple-600',
      suffix: "דק'",
    },
    {
      id: 'completion',
      title: 'אחוז השלמה',
      value: calls.length > 0 ? Math.round((completedCalls.length / calls.length) * 100) : 0,
      icon: TrendingUp,
      color: 'bg-indigo-100 text-indigo-600',
      suffix: '%',
    },
    {
      id: 'pending',
      title: 'תשלומים ממתינים',
      value: vendor?.pending_payments || 0,
      icon: DollarSign,
      color: 'bg-orange-100 text-orange-600',
      prefix: '₪',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {stats.map((stat, idx) => {
        const Icon = stat.icon;
        return (
          <Card
            key={idx}
            className={`bg-white ${onStatClick ? 'cursor-pointer hover:shadow-md transition-all hover:bg-gray-50' : ''}`}
            onClick={() => onStatClick && onStatClick(stat.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full ${stat.color} flex items-center justify-center`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-baseline gap-1">
                    {stat.prefix && <span className="text-lg">{stat.prefix}</span>}
                    <span className="text-2xl font-bold text-[#172B4D]">{stat.value}</span>
                    {stat.suffix && <span className="text-sm text-[#6B778C]">{stat.suffix}</span>}
                  </div>
                  <div className="text-xs text-[#6B778C]">{stat.title}</div>
                  {stat.trend && (
                    <div
                      className={`text-xs ${stat.trendPositive ? 'text-green-600' : 'text-red-600'}`}
                    >
                      {stat.trend} מהחודש הקודם
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
