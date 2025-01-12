'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Line, Bar } from 'react-chartjs-2';
import { useTheme } from 'next-themes';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { formatFileSize } from '@/lib/utils';
import { EmptyState } from '@/components/empty-state';
import { useAnalyticsStore } from '@/lib/analytics-store';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface AnalyticsChartsProps {
  period?: string | undefined;
  startDate?: string;
  endDate?: string;
  year?: string;
  month?: string;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface WeeklyStats {
  day: string;
  average_downloads: number;
}

interface AnalyticsData {
  dailyStats: {
    date: string;
    total_downloads: number;
    unique_games: number;
    data_transferred: number;
  }[];
  monthlyStats: {
    year: number;
    month: number;
    total_downloads: number;
    data_transferred: number;
  }[];
  periodStats: {
    period: string;
    content_type: string;
    total_downloads: number;
    data_transferred: number;
    unique_items: number;
    growth_rate: number;
  }[];
  weeklyDistribution: WeeklyStats[];
  hourlyDistribution: {
    hour: number;
    average_downloads: number;
  }[];
  dataTransferTrends: {
    date: string;
    data_transferred: number;
  }[];
  gameTypeStats: {
    base_downloads: number;
    update_downloads: number;
    dlc_downloads: number;
    base_data_transferred: number;
    update_data_transferred: number;
    dlc_data_transferred: number;
    base_data_size: string;
    update_data_size: string;
    dlc_data_size: string;
    unique_base_games: number;
    unique_updates: number;
    unique_dlc: number;
  };
  peakStats: {
    peak_hour: number;
    peak_hour_downloads: number;
    most_active_day: string;
    most_active_day_downloads: number;
  };
  availableYears: number[];
}

export function AnalyticsCharts({ 
  period,
  startDate,
  endDate,
  year,
  month 
}: AnalyticsChartsProps) {
  const { data, setData } = useAnalyticsStore();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Ensure we have a period parameter
      if (!period && !startDate && !endDate && !year && !month) {
        period = 'all';
      }

      const params = new URLSearchParams();
      if (period) params.set('period', period);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      if (year) params.set('year', year);
      if (month) params.set('month', month);

      const response = await fetch(`/api/analytics?${params.toString()}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to load analytics data');
      }
      
      const newData = await response.json();
      setData(newData);
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      setError('Failed to load analytics data. Please try refreshing the page.');
    } finally {
      setIsLoading(false);
    }
  }, [period, startDate, endDate, year, month, setData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <EmptyState title="Error" message={error} />;
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        labels: {
          color: isDark ? '#e5e7eb' : '#374151',
        },
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: isDark ? '#1F2937' : 'white',
        titleColor: isDark ? 'white' : 'black',
        bodyColor: isDark ? 'white' : 'black',
        borderColor: isDark ? '#374151' : '#E5E7EB',
        borderWidth: 1,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: isDark ? '#374151' : '#E5E7EB',
        },
        ticks: {
          color: isDark ? '#9CA3AF' : '#6B7280',
        },
      },
      x: {
        grid: {
          color: isDark ? '#374151' : '#E5E7EB',
        },
        ticks: {
          color: isDark ? '#9CA3AF' : '#6B7280',
        },
      },
    },
  };

  return data ? (
    <div className="grid gap-6">
      {/* Tracking Period Info */}
      <Card className="p-6 bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-5 h-5 text-amber-600 dark:text-amber-400"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-medium text-amber-800 dark:text-amber-200">Important Note About Data</h3>
            <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
              The data shown here does not represent complete statistics for 2024. Initial tracking began on September 28-29, 2024, 
              continued until December 14, 2024, and resumed with full system deployment on January 5, 2025.
            </p>
          </div>
        </div>
      </Card>

      {/* Daily Downloads Chart */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Daily Downloads</h3>
        <div className="h-[400px]">
          <Line
            data={{
              labels: data.dailyStats.map(d => d.date),
              datasets: [{
                label: 'Downloads',
                data: data.dailyStats.map(d => d.total_downloads),
                borderColor: 'rgb(99, 102, 241)',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                fill: true,
              }],
            }}
            options={chartOptions}
          />
        </div>
      </Card>

      {/* Monthly Trends */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Monthly Trends</h3>
        <div className="h-[400px]">
          <Bar
            data={{
              labels: data.monthlyStats.map(m => `${m.year}-${m.month}`),
              datasets: [{
                label: 'Downloads',
                data: data.monthlyStats.map(m => m.total_downloads),
                backgroundColor: 'rgba(99, 102, 241, 0.8)',
              }],
            }}
            options={chartOptions}
          />
        </div>
      </Card>

      {/* Content Type Distribution Chart */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Download Distribution by Type</h3>
        <div className="h-[400px]">
          {data.gameTypeStats && data.gameTypeStats.base_downloads !== undefined ? (
          <Bar
            data={{
              labels: ['Base Games', 'Updates', 'DLC'],
              datasets: [{
                label: 'Downloads',
                data: [
                  data.periodStats.find(s => s.content_type === 'base')?.total_downloads || 0,
                  data.periodStats.find(s => s.content_type === 'update')?.total_downloads || 0,
                  data.periodStats.find(s => s.content_type === 'dlc')?.total_downloads || 0
                ],
                backgroundColor: [
                  'rgba(99, 102, 241, 0.8)',
                  'rgba(139, 92, 246, 0.8)',
                  'rgba(167, 139, 250, 0.8)'
                ],
              }],
            }}
            options={chartOptions}
          />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No data available
            </div>
          )}
        </div>
      </Card>

      {/* Data Transfer Trends */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Data Transfer Trends</h3>
        <div className="h-[400px]">
          <Line
            data={{
              labels: data.dailyStats.map(d => d.date),
              datasets: [{
                label: 'Data Transferred',
                data: data.dataTransferTrends.map(d => d.data_transferred / (1024 * 1024 * 1024)),
                borderColor: 'rgb(139, 92, 246)',
                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                fill: true,
              }],
            }}
            options={{
              ...chartOptions,
              scales: {
                ...chartOptions.scales,
                y: { ...chartOptions.scales.y, title: { display: true, text: 'Data Transferred (GB)' } }
              }
            }}
          />
        </div>
      </Card>

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card className="p-6">
          <h4 className="text-sm font-medium text-muted-foreground">Total Downloads</h4>
          <p className="text-2xl font-bold mt-2">{data.periodStats.find(s => s.content_type === 'all')?.total_downloads.toLocaleString()}</p>
          <p className="text-sm text-muted-foreground mt-1">
            Data Size: {formatFileSize(data.gameTypeStats.base_data_transferred + data.gameTypeStats.update_data_transferred + data.gameTypeStats.dlc_data_transferred)}
          </p>
        </Card>
        
        <Card className="p-6">
          <h4 className="text-sm font-medium text-muted-foreground">Average Daily Downloads</h4>
          <p className="text-2xl font-bold mt-2">{Math.round(data.dailyStats.reduce((sum, d) => sum + d.total_downloads, 0) / data.dailyStats.length).toLocaleString()}</p>
          <p className="text-sm text-muted-foreground mt-1">
            Range: {Math.min(...data.dailyStats.map(d => d.total_downloads)).toLocaleString()} - {Math.max(...data.dailyStats.map(d => d.total_downloads)).toLocaleString()}
          </p>
        </Card>
        
        <Card className="p-6">
          <h4 className="text-sm font-medium text-muted-foreground">Daily Active Games</h4>
          <p className="text-2xl font-bold mt-2">{Math.round(data.dailyStats.reduce((sum, d) => sum + d.unique_games, 0) / data.dailyStats.length).toLocaleString()}</p>
          <p className="text-sm text-muted-foreground mt-1">
            Range: {Math.min(...data.dailyStats.map(d => d.unique_games)).toLocaleString()} - {Math.max(...data.dailyStats.map(d => d.unique_games)).toLocaleString()}
          </p>
        </Card>
        
        <Card className="p-6">
          <h4 className="text-sm font-medium text-muted-foreground">Growth Rate</h4>
          <p className="text-2xl font-bold mt-2">{data.periodStats.find(s => s.content_type === 'all')?.growth_rate || 0}%</p>
          <p className="text-sm text-muted-foreground mt-1">vs previous period</p>
        </Card>

        <Card className="p-6">
          <h4 className="text-sm font-medium text-muted-foreground">Most Active Day</h4>
          <p className="text-2xl font-bold mt-2">
            {data.dailyStats.length > 0 ? new Date(
              data.dailyStats.reduce((max, day) => 
                day.total_downloads > max.total_downloads ? day : max
              ).date
            ).toLocaleDateString() : 'No data'}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {Math.max(...data.dailyStats.map(d => d.total_downloads)).toLocaleString()} downloads
          </p>
        </Card>

        <Card className="p-6">
          <h4 className="text-sm font-medium text-muted-foreground">Unique Games</h4>
          <p className="text-2xl font-bold mt-2">{data.gameTypeStats.unique_base_games.toLocaleString()}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {data.periodStats.find(s => s.content_type === 'all')?.unique_items.toLocaleString()} active in period
          </p>
        </Card>

        <Card className="p-6">
          <h4 className="text-sm font-medium text-muted-foreground">Average Game Size</h4>
          <p className="text-2xl font-bold mt-2">{formatFileSize(data.periodStats.find(s => s.content_type === 'all')?.data_transferred || 0)}</p>
          <p className="text-sm text-muted-foreground mt-1">per period
          </p>
        </Card>
      </div>

      {/* Game Type Distribution */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        {data.gameTypeStats && data.gameTypeStats.base_downloads !== undefined ? (
          <>
        <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
          <h4 className="text-sm font-medium text-muted-foreground">Base Games</h4>
          <p className="text-2xl font-bold mt-2">{data.gameTypeStats.base_downloads.toLocaleString()}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {data.gameTypeStats.unique_base_games.toLocaleString()} unique games
            <br />
            Data: {data.gameTypeStats.base_data_size}
          </p>
        </div>
        <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
          <h4 className="text-sm font-medium text-muted-foreground">Updates</h4>
          <p className="text-2xl font-bold mt-2">{data.gameTypeStats.update_downloads.toLocaleString()}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {data.gameTypeStats.unique_updates.toLocaleString()} unique updates
            <br />
            Data: {data.gameTypeStats.update_data_size}
          </p>
        </div>
        <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
          <h4 className="text-sm font-medium text-muted-foreground">DLC</h4>
          <p className="text-2xl font-bold mt-2">{data.gameTypeStats.dlc_downloads.toLocaleString()}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {data.gameTypeStats.unique_dlc.toLocaleString()} unique DLC
            <br />
            Data: {data.gameTypeStats.dlc_data_size}
          </p>
        </div>
          </>
        ) : (
          <div className="col-span-3 text-center text-muted-foreground py-8">
            No distribution data available
          </div>
        )}
      </div>

      {/* Weekly Distribution */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Weekly Download Pattern</h3>
        <div className="h-[400px]">
          <Bar
            data={{
              labels: data.weeklyDistribution.map(d => d.day),
              datasets: [{
                label: 'Average Downloads',
                data: data.weeklyDistribution.map(d => d.average_downloads),
                backgroundColor: 'rgba(167, 139, 250, 0.8)',
              }],
            }}
            options={{
              ...chartOptions,
              scales: {
                ...chartOptions.scales,
                y: { ...chartOptions.scales.y, title: { display: true, text: 'Average Downloads' } },
                x: { ...chartOptions.scales.x, title: { display: true, text: 'Day of Week' } }
              }
            }}
          />
        </div>
      </Card>
    </div>
  ) : null;
}