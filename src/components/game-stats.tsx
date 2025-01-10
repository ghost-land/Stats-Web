import { Card } from '@/components/ui/card';
import { DownloadChart } from '@/components/download-chart';
import { TrendingDown, TrendingUp, Clock, Download, History, ChevronRight } from 'lucide-react';
import { EmptyState } from '@/components/empty-state';
import type { Game } from '@/lib/types';
import { getGameRankings } from '@/lib/api';

interface PeriodStats {
  period: '72h' | '7d' | '30d';
  icon: typeof Clock | typeof Download | typeof History;
  label: string;
  gradient: string;
  downloads: number;
  rank?: {
    current: number | null;
    previous: number | null;
    change: number | null;
  };
  comparison?: {
    value: number;
    label: string;
  };
}

const RankBadge = ({ change }: { change: number | null }) => {
  if (change === null) return null;

  const Icon = change > 0 ? TrendingUp : change < 0 ? TrendingDown : ChevronRight;
  const baseClasses = 'inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium rounded border ml-2';
  const colorClasses = change > 0 
    ? 'bg-emerald-500 text-white border-emerald-500'
    : change < 0 
    ? 'bg-rose-500 text-white border-rose-500'
    : 'bg-slate-500 text-white border-slate-500';

  return (
    <span className={`${baseClasses} ${colorClasses}`}>
      <Icon className="w-3 h-3" />
      {change > 0 ? `+${change}` : change < 0 ? `${change}` : '='}
    </span>
  );
};

export async function GameStats({ game }: { game: Game }) {
  if (!game?.stats) {
    return (
      <EmptyState 
        title="No Game Data"
        message="Statistics for this game are not available."
      />
    );
  }

  const last72h = game.stats.period_downloads?.last_72h || 0;
  const last7d = game.stats.period_downloads?.last_7d || 0;
  const last30d = game.stats.period_downloads?.last_30d || 0;

  // Get rankings for all periods
  const rankings = await getGameRankings(game.tid);

  const periods: PeriodStats[] = [
    {
      period: '72h',
      icon: Clock,
      label: 'Last 72 Hours',
      gradient: 'from-indigo-500 to-indigo-600',
      downloads: last72h,
      rank: rankings?.['72h'],
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
      rank: rankings?.['7d'],
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
      rank: rankings?.['30d'],
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
        {periods.map(({ period, icon: Icon, label, gradient, downloads, rank, comparison }) => (
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
                <div className="mt-4">
                  <p className="text-xl font-semibold text-white">
                    {downloads.toLocaleString()}
                  </p>
                  {rank && rank.current !== null && rank.current > 0 && (
                    <p className="mt-1 text-sm text-white/90 flex items-center">
                      Rank: #{rank.current}
                      {rank.change !== null && rank.change !== undefined && (
                        <RankBadge change={rank.change} />
                      )}
                    </p>
                  )}
                </div>
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