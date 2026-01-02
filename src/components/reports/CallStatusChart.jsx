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

const statusColors = {
  waiting_treatment: '#ED6C02',
  awaiting_assignment: '#ED6C02',
  assigning: '#0078D4',
  vendor_enroute: '#2E7D32',
  in_progress: '#0078D4',
  completed: '#1B5E20',
  cancelled: '#D32F2F'
};

export default function CallStatusChart({ calls }) {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (!chartRef.current) return;

    // Count calls by status
    const statusCounts = {};
    calls.forEach(call => {
      const status = call.call_status || 'waiting_treatment';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    const statuses = Object.keys(statusCounts);
    const counts = Object.values(statusCounts);
    const colors = statuses.map(s => statusColors[s] || '#9E9E9E');
    const labels = statuses.map(s => statusLabels[s] || s);

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
              label: function(context) {
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const value = context.parsed;
                const percentage = ((value / total) * 100).toFixed(1);
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
    <Card>
      <CardHeader>
        <CardTitle className="text-base">התפלגות קריאות לפי סטטוס</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative" style={{ height: '280px' }}>
          <canvas ref={chartRef} />
        </div>
      </CardContent>
    </Card>
  );
}