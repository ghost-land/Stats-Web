import { Suspense } from 'react';
import { Card } from '@/components/ui/card';
import { DownloadChart } from '@/components/download-chart';
import { TrendingDown, TrendingUp, Clock, Download, History, ChevronRight } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import type { Game } from '@/lib/types';
import { getGameRankings } from '@/lib/api';

interface PeriodStats {
  period: '72h' | '7d' | '30d';
  icon: typeof Clock | typeof Download | typeof History;
  label: string;
  gradient: string;
  downloads: number;
  rank?: {
    rank: number | null;
    change: number | null;
  } | null;
  comparison?: {
    value: number;
    label: string;
  };
}

// Rank badge component for showing rank changes
const RankBadge = ({ change }: { change: number | null }) => {
  if (change === null || change === 0) return null;

  const Icon = change > 0 ? TrendingUp : change < 0 ? TrendingDown : ChevronRight;
  const baseClasses = 'inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium rounded border ml-2';
  const colorClasses = change > 0 
    ? 'bg-emerald-500/90 text-white border-emerald-500/90'
    : 'bg-rose-500/90 text-white border-rose-500/90';

  return (
    <span className={`${baseClasses} ${colorClasses}`}>
      <Icon className="w-3 h-3" />
      {change > 0 ? `+${change}` : change}
    </span>
  );
};

export async function GameStats({ game }: { game: Game }) {
  console.log('[GameStats] Rendering stats for game:', game.tid);
  console.log('[GameStats] Period downloads:', game.stats.period_downloads);
  console.log('[GameStats] Per date:', game.stats.per_date);

  const last72h = game.stats.period_downloads?.last_72h || 0;
  const last7d = game.stats.period_downloads?.last_7d || 0;
  const last30d = game.stats.period_downloads?.last_30d || 0;
  const total = game.stats.total_downloads || 0;

  // Get rankings for all periods
  const rankings = await getGameRankings(game.tid);
  console.log('[GameStats] Rankings:', rankings);

  // Calculate period downloads from per_date if period_downloads is not available
  const calculatePeriodDownloads = (days: number) => {
    if (!game.stats.per_date) return 0;
    const now = new Date();
    const startDate = new Date(now.setDate(now.getDate() - days));
    
    return Object.entries(game.stats.per_date)
      .filter(([date]) => new Date(date) >= startDate)
      .reduce((sum, [, count]) => sum + count, 0);
  };

  // Use period_downloads if available, otherwise calculate from per_date
  const downloads72h = last72h || calculatePeriodDownloads(3);
  const downloads7d = last7d || calculatePeriodDownloads(7);
  const downloads30d = last30d || calculatePeriodDownloads(30);

  const periods: PeriodStats[] = [
    {
      period: '72h',
      icon: Clock,
      label: 'Last 72 Hours',
      gradient: 'from-indigo-500 to-indigo-600',
      downloads: downloads72h,
      rank: rankings['72h']?.current ? {
        rank: rankings['72h'].current || null,
        change: rankings['72h'].change || null
      } : undefined,
      comparison: {
        value: downloads72h > 0
          ? ((downloads72h - (downloads7d / 7 * 3)) / (downloads7d / 7 * 3)) * 100
          : 0,
        label: 'vs previous 72h'
      }
    },
    {
      period: '7d',
      icon: Download,
      label: 'Last 7 Days',
      gradient: 'from-violet-500 to-violet-600',
      downloads: downloads7d,
      rank: rankings['7d']?.current ? {
        rank: rankings['7d'].current || null,
        change: rankings['7d'].change || null
      } : undefined,
      comparison: {
        value: downloads7d > 0
          ? ((downloads7d - (downloads30d / 30 * 7)) / (downloads30d / 30 * 7)) * 100
          : 0,
        label: 'vs previous 7 days'
      }
    },
    {
      period: '30d',
      icon: History,
      label: 'Last 30 Days',
      gradient: 'from-purple-500 to-purple-600',
      downloads: downloads30d,
      rank: rankings['30d']?.current ? {
        rank: rankings['30d'].current || null,
        change: rankings['30d'].change || null
      } : undefined,
      comparison: {
        value: downloads30d > 0
          ? ((downloads30d - (downloads30d / 30 * 30)) / (downloads30d / 30 * 30)) * 100
          : 0,
        label: 'vs previous 30 days'
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
                  {rank && (
                    <p className="mt-1 text-sm text-white/90 flex items-center">
                      Rank: #{rank.rank}
                      {rank.change !== null && (
                        <RankBadge change={rank.change} />
                      )}
                    </p>
                  )}
                </div>
                {comparison && (
                  <p className="mt-2 text-xs text-white/75">
                    {comparison.value > 0 ? '+' : ''}{comparison.value.toFixed(1).replace(/\.0$/, '')}
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