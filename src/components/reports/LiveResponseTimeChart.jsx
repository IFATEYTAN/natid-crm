import React, { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

/**
 * LiveResponseTimeChart - Minimalist Design
 * Uses only 2-3 colors: Gray scale + Blue accent
 */
export default function LiveResponseTimeChart({ calls, vendors }) {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (!chartRef.current || vendors.length === 0) return;

    // Calculate average response time per vendor
    const vendorResponseTimes = vendors.map(vendor => {
      const vendorCalls = calls.filter(c =>
        c.assigned_vendor_id === vendor.id &&
        c.time_to_vendor_assignment !== null
      );

      if (vendorCalls.length === 0) return null;

      const avgTime = vendorCalls.reduce((sum, c) => sum + c.time_to_vendor_assignment, 0) / vendorCalls.length;

      return {
        name: vendor.vendor_name,
        avgTime: Math.round(avgTime),
        callCount: vendorCalls.length
      };
    }).filter(Boolean).sort((a, b) => b.callCount - a.callCount).slice(0, 10);

    if (vendorResponseTimes.length === 0) {
      return;
    }

    const labels = vendorResponseTimes.map(v => v.name);
    const data = vendorResponseTimes.map(v => v.avgTime);
    const callCounts = vendorResponseTimes.map(v => v.callCount);

    // Destroy previous chart
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    // Minimalist color scheme - gray with blue accent for best performers
    const colors = data.map(time => {
      if (time <= 20) return '#374151'; // Gray-700 (best - darker = better)
      if (time <= 30) return '#6B7280'; // Gray-500
      if (time <= 40) return '#9CA3AF'; // Gray-400
      return '#D1D5DB'; // Gray-300 (needs improvement - lighter)
    });

    // Create new chart
    const ctx = chartRef.current.getContext('2d');
    chartInstance.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'זמן תגובה ממוצע (דקות)',
          data,
          backgroundColor: colors,
          borderColor: colors,
          borderWidth: 0,
          borderRadius: 4,
          barThickness: 'flex',
          maxBarThickness: 32
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            rtl: true,
            backgroundColor: '#FFFFFF',
            titleColor: '#374151',
            bodyColor: '#6B7280',
            borderColor: '#E5E7EB',
            borderWidth: 1,
            titleFont: {
              family: 'Heebo, sans-serif',
              size: 14,
              weight: '600'
            },
            bodyFont: {
              family: 'Heebo, sans-serif',
              size: 13
            },
            padding: 12,
            cornerRadius: 6,
            callbacks: {
              label: function (context) {
                const index = context.dataIndex;
                const time = data[index];
                const count = callCounts[index];
                return [
                  ` זמן תגובה: ${time} דקות`,
                  ` קריאות: ${count}`
                ];
              }
            }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            ticks: {
              font: {
                family: 'Heebo, sans-serif',
                size: 11
              },
              color: '#6B7280',
              callback: function (value) {
                return value + ' דק\'';
              }
            },
            grid: {
              color: '#F3F4F6',
              drawBorder: false
            }
          },
          y: {
            ticks: {
              font: {
                family: 'Heebo, sans-serif',
                size: 12
              },
              color: '#374151',
              crossAlign: 'far',
              padding: 8
            },
            grid: {
              display: false
            }
          }
        },
        animation: {
          duration: 600,
          easing: 'easeOutQuart'
        }
      }
    });

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [calls, vendors]);

  return (
    <Card className="bg-white border border-gray-200 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold text-gray-900 text-right">זמני תגובה ממוצעים - 10 ספקים מובילים</CardTitle>
      </CardHeader>
      <CardContent dir="rtl">
        <div className="relative" style={{ height: '320px' }}>
          <canvas ref={chartRef} />
        </div>
        <div className="mt-4 flex flex-wrap gap-4 justify-end text-xs">
          <div className="flex items-center gap-2">
            <span className="text-gray-600">מצוין (≤20 דק')</span>
            <div className="w-3 h-3 rounded bg-gray-700" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-600">טוב (21-30 דק')</span>
            <div className="w-3 h-3 rounded bg-gray-500" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-600">סביר (31-40 דק')</span>
            <div className="w-3 h-3 rounded bg-gray-400" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-600">לשיפור (>40 דק')</span>
            <div className="w-3 h-3 rounded bg-gray-300" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
