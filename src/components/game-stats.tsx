import { Card } from '@/components/ui/card';
import { DownloadChart } from '@/components/download-chart';
import { Clock, Download, History } from 'lucide-react';
import { EmptyState } from '@/components/empty-state';
import type { Game } from '@/lib/types';

interface PeriodStats {
  period: '72h' | '7d' | '30d';
  icon: typeof Clock | typeof Download | typeof History;
  label: string;
  gradient: string;
  downloads: number;
  comparison?: {
    value: number;
    label: string;
  };
}

export function GameStats({ game }: { game: Game }) {
  if (!game?.stats) {
    return (
      <EmptyState 
        title="No Game Data"
        message="Statistics for this game are not available."
      />
    );
  }

  const calculatePeriodDownloads = (days: number) => {
    const dates = Object.entries(game.stats.per_date)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-days);
    return dates.reduce((sum, [, downloads]) => sum + downloads, 0);
  };

  const last72h = calculatePeriodDownloads(3);
  const last7d = calculatePeriodDownloads(7);
  const last30d = calculatePeriodDownloads(30);

  const periods: PeriodStats[] = [
    {
      period: '72h',
      icon: Clock,
      label: 'Last 72 Hours',
      gradient: 'from-indigo-500 to-indigo-600',
      downloads: last72h,
      comparison: {
        value: (last72h / last7d) * 100,
        label: 'vs last week'
      }
    },
    {
      period: '7d',
      icon: Download,
      label: 'Last 7 Days',
      gradient: 'from-violet-500 to-violet-600',
      downloads: last7d,
      comparison: {
        value: (last7d / last30d) * 100,
        label: 'vs last month'
      }
    },
    {
      period: '30d',
      icon: History,
      label: 'Last 30 Days',
      gradient: 'from-purple-500 to-purple-600',
      downloads: last30d,
      comparison: {
        value: last30d / 30,
        label: 'daily average'
      }
    }
  ];

  return (
    <div className="space-y-6">
      {/* Period Stats */}
      <div className="grid gap-6 md:grid-cols-3">
        {periods.map(({ period, icon: Icon, label, gradient, downloads, comparison }) => (
          <div 
            key={period}
            className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-indigo-500/20 to-indigo-600/20 p-[1px]"
          >
            <Card className="relative h-full overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.08] to-indigo-600/[0.08] opacity-50 group-hover:opacity-100 transition-opacity" />
              <div className={`relative p-6 bg-gradient-to-r ${gradient}`}>
                <div className="flex items-center justify-between text-white">
                  <h3 className="text-sm font-medium opacity-90">{label}</h3>
                  <Icon className="w-4 h-4 opacity-75" />
                </div>
                <p className="mt-4 text-3xl font-bold text-white">
                  {downloads.toLocaleString()}
                </p>
                {comparison && (
                  <p className="mt-2 text-xs text-white/75">
                    {comparison.value.toFixed(1).replace(/\.0$/, '')}
                    {comparison.label.includes('vs') ? '%' : ''} {comparison.label}
                  </p>
                )}
              </div>
            </Card>
          </div>
        ))}
      </div>

      {/* Download Chart */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-indigo-500/20 to-indigo-600/20 p-[1px]">
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.03] to-indigo-600/[0.03]" />
          <div className="relative p-6 bg-gradient-to-r from-indigo-500 to-indigo-600">
            <h2 className="text-xl font-semibold text-white">Download History</h2>
          </div>
          <div className="relative p-6">
            <DownloadChart data={game.stats.per_date} />
          </div>
        </Card>
      </div>
    </div>
  );
}