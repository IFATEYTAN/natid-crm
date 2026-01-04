import React, { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Chart, registerables } from 'chart.js';
import { TrendingUp } from 'lucide-react';

Chart.register(...registerables);

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

    // Create soft gradient colors based on response time
    const colors = data.map(time => {
      if (time <= 20) return '#22C55E'; // success-soft-500 - ירוק עדין
      if (time <= 30) return '#0EA5E9'; // secondary-soft-500 - כחול עדין
      if (time <= 40) return '#F59E0B'; // warning-soft-500 - כתום עדין
      return '#FF6B6B'; // primary-soft-500 - אדום עדין
    });

    // Create new chart with live update animation
    const ctx = chartRef.current.getContext('2d');
    chartInstance.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'זמן תגובה ממוצע (דקות)',
          data,
          backgroundColor: colors,
          borderColor: colors.map(c => c),
          borderWidth: 2,
          borderRadius: 8,
          barThickness: 'flex',
          maxBarThickness: 40
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
            titleFont: {
              family: 'Heebo, sans-serif',
              size: 14
            },
            bodyFont: {
              family: 'Heebo, sans-serif',
              size: 13
            },
            callbacks: {
              label: function(context) {
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
              callback: function(value) {
                return value + ' דק\'';
              }
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.05)'
            }
          },
          y: {
            ticks: {
              font: {
                family: 'Heebo, sans-serif',
                size: 12
              },
              crossAlign: 'far',
              padding: 10
            },
            grid: {
              display: false
            }
          }
        },
        animation: {
          duration: 1500,
          easing: 'easeInOutQuart',
          delay: (context) => {
            // Stagger animation for each bar
            return context.dataIndex * 100;
          },
          onProgress: function(animation) {
            // Create "live update" effect
            const chart = animation.chart;
            const ctx = chart.ctx;
            ctx.save();
            ctx.shadowBlur = 15;
            ctx.shadowColor = 'rgba(0, 120, 212, 0.3)';
            ctx.restore();
          }
        },
        transitions: {
          active: {
            animation: {
              duration: 400
            }
          }
        }
      }
    });

    // Add periodic subtle animation (shimmer effect)
    const shimmerInterval = setInterval(() => {
      if (chartInstance.current) {
        chartInstance.current.update('none');
      }
    }, 3000);

    return () => {
      clearInterval(shimmerInterval);
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [calls, vendors]);

  return (
    <Card className="bg-white border border-[#E0E0E0] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
      <CardHeader>
        <div className="flex items-center justify-between flex-row-reverse">
          <CardTitle className="text-[20px] font-medium text-[#212121] text-right">זמני תגובה ממוצעים - 10 ספקים מובילים</CardTitle>
          <div className="flex items-center gap-1 text-xs text-[#2E7D32]">
            <TrendingUp className="w-4 h-4" />
            <span>עדכון בזמן אמת</span>
          </div>
        </div>
      </CardHeader>
      <CardContent dir="rtl">
        <div className="relative" style={{ height: '350px' }}>
          <canvas ref={chartRef} />
        </div>
        <div className="mt-4 flex flex-wrap gap-3 justify-end text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[#616161]">מצוין (≤20 דק')</span>
            <div className="w-3 h-3 rounded-full bg-[#2E7D32]" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[#616161]">טוב (21-30 דק')</span>
            <div className="w-3 h-3 rounded-full bg-[#0288D1]" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[#616161]">סביר (31-40 דק')</span>
            <div className="w-3 h-3 rounded-full bg-[#FF6B00]" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[#616161]">דורש שיפור (>40 דק')</span>
            <div className="w-3 h-3 rounded-full bg-[#FF0000]" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}