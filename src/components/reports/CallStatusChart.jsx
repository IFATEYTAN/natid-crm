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

/**
 * Minimalist color palette - 2-3 colors only
 * Primary: Grays
 * Accent: Blue for active states
 */
const statusColors = {
  waiting_treatment: '#9CA3AF',  // Gray-400
  awaiting_assignment: '#6B7280', // Gray-500
  assigning: '#3B82F6',           // Blue-500 (active)
  vendor_enroute: '#60A5FA',      // Blue-400 (active)
  in_progress: '#2563EB',         // Blue-600 (active)
  completed: '#374151',           // Gray-700
  cancelled: '#D1D5DB'            // Gray-300
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
    const colors = statuses.map((s) => statusColors[s] || '#9CA3AF');
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
        cutout: '65%',
        plugins: {
          legend: {
            position: 'bottom',
            rtl: true,
            labels: {
              font: {
                family: 'Heebo, sans-serif',
                size: 12
              },
              padding: 16,
              usePointStyle: true,
              pointStyle: 'circle',
              color: '#374151'
            }
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
          duration: 800,
          easing: 'easeOutQuart'
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
    <Card className="bg-white border border-gray-200 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold text-gray-900 text-right">התפלגות קריאות לפי סטטוס</CardTitle>
      </CardHeader>
      <CardContent dir="rtl">
        <div className="relative" style={{ height: '280px' }}>
          <canvas ref={chartRef} />
        </div>
      </CardContent>
    </Card>
  );
}
