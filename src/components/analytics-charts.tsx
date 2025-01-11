'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Line, Bar } from 'react-chartjs-2';
import { useTheme } from 'next-themes';
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

interface WeeklyStats {
  day: string;
  average_downloads: number;
}

interface AnalyticsData {
  dailyLabels: string[];
  dailyDownloads: number[];
  monthlyLabels: string[];
  monthlyDownloads: number[];
  dataTransferTrends: {
    labels: string[];
    data: number[];
  };
  weeklyStats: WeeklyStats[];
  stats: {
    total: number;
    total_data_size: string;
    growthRate: number;
  };
  additionalStats: {
    average_daily_downloads: number;
    highest_daily_downloads: number;
    lowest_daily_downloads: number;
    average_daily_games: number;
    max_daily_games: number;
    min_daily_games: number;
  };
  gameTypeStats: {
    base_downloads: number;
    update_downloads: number;
    dlc_downloads: number;
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
  gameStats: {
    total_unique_games: number;
    average_game_size: string;
  };
}

export function AnalyticsCharts({ 
  period,
  startDate,
  endDate,
  year,
  month 
}: AnalyticsChartsProps) {
  const { theme } = useTheme();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const isDark = theme === 'dark';
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch data based on filters
    const fetchData = async () => {
      try {
        setIsLoading(true);

        const params = new URLSearchParams();
        if (period) params.set('period', period);
        if (startDate) params.set('startDate', startDate);
        if (endDate) params.set('endDate', endDate);
        if (year) params.set('year', year);
        if (month) params.set('month', month);

        const response = await fetch(`/api/analytics?${params.toString()}`);
        const data = await response.json();
        setData(data);
      } catch (error) {
        console.error('Error fetching analytics data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [period, startDate, endDate, year, month]);

  if (!data) {
    return <div className="flex justify-center items-center min-h-[200px]">Loading...</div>;
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

  return (
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
              labels: data.dailyLabels,
              datasets: [{
                label: 'Downloads',
                data: data.dailyDownloads,
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
              labels: data.monthlyLabels,
              datasets: [{
                label: 'Downloads',
                data: data.monthlyDownloads,
                backgroundColor: 'rgba(99, 102, 241, 0.8)',
              }],
            }}
            options={chartOptions}
          />
        </div>
      </Card>

      {/* Download Distribution Chart */}
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
                  data.gameTypeStats.base_downloads,
                  data.gameTypeStats.update_downloads,
                  data.gameTypeStats.dlc_downloads
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
        <h3 className="text-lg font-semibold mb-4">Daily Data Transfer</h3>
        <div className="h-[400px]">
          <Line
            data={{
              labels: data.dataTransferTrends.labels,
              datasets: [{
                label: 'Data Transferred',
                data: data.dataTransferTrends.data.map(bytes => bytes / (1024 * 1024 * 1024)), // Convert to GB
                borderColor: 'rgb(139, 92, 246)',
                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                fill: true,
              }],
            }}
            options={{
              ...chartOptions,
              scales: {
                ...chartOptions.scales,
                y: {
                  ...chartOptions.scales.y,
                  title: { display: true, text: 'Data Transferred (GB)' },
                  ticks: {
                    ...chartOptions.scales.y.ticks,
                    callback: (value) => typeof value === 'number' ? value.toFixed(2) + ' GB' : value
                  }
                }
              }
            }}
          />
        </div>
      </Card>

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card className="p-6">
          <h4 className="text-sm font-medium text-muted-foreground">Total Downloads</h4>
          <p className="text-2xl font-bold mt-2">{data.stats.total.toLocaleString()}</p>
          <p className="text-sm text-muted-foreground mt-1">
            Data Size: {data.stats.total_data_size}
          </p>
        </Card>
        
        <Card className="p-6">
          <h4 className="text-sm font-medium text-muted-foreground">Average Daily Downloads</h4>
          <p className="text-2xl font-bold mt-2">{data.additionalStats.average_daily_downloads.toLocaleString()}</p>
          <p className="text-sm text-muted-foreground mt-1">
            Range: {data.additionalStats.lowest_daily_downloads.toLocaleString()} - {data.additionalStats.highest_daily_downloads.toLocaleString()}
          </p>
        </Card>
        
        <Card className="p-6">
          <h4 className="text-sm font-medium text-muted-foreground">Daily Active Games</h4>
          <p className="text-2xl font-bold mt-2">{data.additionalStats.average_daily_games.toLocaleString()}</p>
          <p className="text-sm text-muted-foreground mt-1">
            Range: {data.additionalStats.min_daily_games.toLocaleString()} - {data.additionalStats.max_daily_games.toLocaleString()}
          </p>
        </Card>
        
        <Card className="p-6">
          <h4 className="text-sm font-medium text-muted-foreground">Growth Rate</h4>
          <p className="text-2xl font-bold mt-2">{data.stats.growthRate}%</p>
          <p className="text-sm text-muted-foreground mt-1">vs previous period</p>
        </Card>

        <Card className="p-6">
          <h4 className="text-sm font-medium text-muted-foreground">Most Active Day</h4>
          <p className="text-2xl font-bold mt-2">{new Date(data.peakStats.most_active_day).toLocaleDateString()}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {data.peakStats.most_active_day_downloads.toLocaleString()} downloads
          </p>
        </Card>

        <Card className="p-6">
          <h4 className="text-sm font-medium text-muted-foreground">Unique Games</h4>
          <p className="text-2xl font-bold mt-2">{data.gameStats.total_unique_games.toLocaleString()}</p>
          <p className="text-sm text-muted-foreground mt-1">
            Active in selected period
          </p>
        </Card>

        <Card className="p-6">
          <h4 className="text-sm font-medium text-muted-foreground">Average Game Size</h4>
          <p className="text-2xl font-bold mt-2">{data.gameStats.average_game_size}</p>
          <p className="text-sm text-muted-foreground mt-1">
            Per download
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
              labels: data.weeklyStats.map((d: WeeklyStats) => d.day),
              datasets: [{
                label: 'Average Downloads',
                data: data.weeklyStats.map((d: WeeklyStats) => d.average_downloads),
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
  );
}