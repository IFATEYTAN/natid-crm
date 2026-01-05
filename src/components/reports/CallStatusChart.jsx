import React, { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

const statusLabels = {
  waiting_treatment: 'ממתין לטיפול',
  awaiting_assignment: 'ממתין לשיוך',
  assigning: 'בשיוך',
  vendor_enroute: 'ספק בדרך',
  in_progress: 'בטיפול',
  completed: 'הושלם',
  cancelled: 'בוטל'
};

// Soft color palette for call statuses - צבעים עדינים לסטטוסים
const statusColors = {
  waiting_treatment: '#F59E0B',   // warning-soft-500 - כתום עדין - ממתין לטיפול
  awaiting_assignment: '#FF6B6B', // primary-soft-500 - אדום עדין - ממתין לשיוך
  assigning: '#8B5CF6',           // info-soft-500 - סגול עדין - בשיוך
  vendor_enroute: '#FFA07A',      // chart-soft-4 - כתום-ורוד עדין - ספק בדרך
  in_progress: '#0EA5E9',         // secondary-soft-500 - תכלת עדין - בטיפול
  completed: '#4ECDC4',           // chart-soft-2 - טורקיז עדין - הושלם
  cancelled: '#A3A3A3'            // neutral-soft-400 - אפור עדין - בוטל
};

export default function CallStatusChart({ calls }) {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (!chartRef.current) return;

    // Count calls by status
    const statusCounts = {};
    calls.forEach((call) => {
      const status = call.call_status || 'waiting_treatment';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    const statuses = Object.keys(statusCounts);
    const counts = Object.values(statusCounts);
    const colors = statuses.map((s) => statusColors[s] || '#9E9E9E');
    const labels = statuses.map((s) => statusLabels[s] || s);

    // Destroy previous chart
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    // Create new chart
    const ctx = chartRef.current.getContext('2d');
    chartInstance.current = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data: counts,
          backgroundColor: colors,
          borderColor: '#FFFFFF',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            rtl: true,
            labels: {
              font: {
                family: 'Heebo, sans-serif',
                size: 12
              },
              padding: 15,
              usePointStyle: true,
              pointStyle: 'circle'
            }
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
              label: function (context) {
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const value = context.parsed;
                const percentage = (value / total * 100).toFixed(1);
                return ` ${context.label}: ${value} (${percentage}%)`;
              }
            }
          }
        },
        animation: {
          animateRotate: true,
          animateScale: true,
          duration: 1000,
          easing: 'easeInOutQuart'
        }
      }
    });

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [calls]);

  return (
    <Card className="bg-white border border-[#E0E0E0] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
      <CardHeader>
        <CardTitle className="text-[20px] font-medium text-[#212121] text-right">התפלגות קריאות לפי סטטוס</CardTitle>
      </CardHeader>
      <CardContent dir="rtl">
        <div className="relative" style={{ height: '280px' }}>
          <canvas ref={chartRef} className="text-gray-900" />
        </div>
      </CardContent>
    </Card>);

}