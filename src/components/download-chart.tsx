'use client';

import * as React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ScaleOptionsByType,
  Scale,
  CoreScaleOptions,
  Tick
} from 'chart.js';
import { useTheme } from 'next-themes';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface DownloadChartProps {
  data: Record<string, number>;
}

export function DownloadChart({ data }: DownloadChartProps) {
  const [mounted, setMounted] = React.useState(false);
  const { theme } = useTheme();

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = theme === 'dark';

  const sortedData = Object.entries(data)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-30);

  const chartData = {
    labels: sortedData.map(([date]) => {
      const [year, month, day] = date.split('-');
      return `${month}/${day}`;
    }),
    datasets: [
      {
        label: 'Downloads',
        data: sortedData.map(([, value]) => value),
        fill: true,
        borderColor: 'rgb(99, 102, 241)',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: isDark ? '#1F2937' : 'white',
        titleColor: isDark ? 'white' : 'black',
        bodyColor: isDark ? 'white' : 'black',
        borderColor: isDark ? '#374151' : '#E5E7EB',
        borderWidth: 1,
        padding: 12,
        displayColors: false,
        callbacks: {
          title: (items: any[]) => {
            if (items.length > 0) {
              const date = new Date(sortedData[items[0].dataIndex][0]);
              return date.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              });
            }
            return '';
          },
          label: (item: any) => {
            return `Downloads: ${item.raw.toLocaleString()}`;
          }
        }
      },
    },
    scales: {
      y: {
        type: 'linear' as const,
        beginAtZero: true,
        grid: {
          color: isDark ? '#374151' : '#E5E7EB',
        },
        ticks: {
          callback: function(this: Scale<CoreScaleOptions>, value: number | string) {
            if (typeof value === 'number') {
              return value.toLocaleString();
            }
            return value;
          },
          color: isDark ? '#9CA3AF' : '#6B7280',
        },
      },
      x: {
        type: 'category' as const,
        grid: {
          color: isDark ? '#374151' : '#E5E7EB',
        },
        ticks: {
          color: isDark ? '#9CA3AF' : '#6B7280',
        },
      },
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false,
    },
    elements: {
      point: {
        backgroundColor: 'rgb(99, 102, 241)',
        borderColor: 'white',
        borderWidth: 2,
      },
    },
  };

  if (!mounted) {
    return <div className="h-[400px] bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />;
  }

  return (
    <div className="h-[400px]">
      <Line data={chartData} options={options} />
    </div>
  );
}