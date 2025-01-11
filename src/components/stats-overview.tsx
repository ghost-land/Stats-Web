import { Suspense } from 'react';
import { getGlobalStats } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/empty-state';
import { Clock, Download, History, TrendingUp } from 'lucide-react';
import pkg from '../../package.json';

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  gradient
}: {
  title: string;
  value: number | undefined;
  subtitle: string;
  icon: typeof Clock;
  gradient: {
    border: string;
    bg: string;
  };
}) {
  return (
    <div className={`group relative overflow-hidden rounded-xl bg-gradient-to-br ${gradient.border} p-[1px] transition-all hover:scale-[1.02]`}>
      <div className="relative h-full rounded-[10px] bg-gradient-to-br from-white to-white/95 dark:from-slate-900 dark:to-slate-900/95 p-6">
        <div className={`absolute inset-0 bg-gradient-to-br ${gradient.bg} opacity-50 group-hover:opacity-100 transition-opacity`} />
        <div className="relative">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400">{title}</h3>
            <Icon className="h-4 w-4 text-slate-600 dark:text-slate-400" />
          </div>
          <div className="mt-4 text-3xl font-bold">
            {value?.toLocaleString() || '0'}
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-500">
            {subtitle}
          </div>
        </div>
      </div>
    </div>
  );
}

export async function StatsOverview() {
  const stats = await getGlobalStats();

  console.log('[StatsOverview] Global stats:', {
    last72h: stats?.last_72h,
    last7d: stats?.last_7d,
    last30d: stats?.last_30d,
    allTime: stats?.all_time,
    lastUpdated: stats?.last_updated
  });

  if (!stats || !stats.last_updated) {
    return <EmptyState />;
  }

  const statCards = [
    {
      title: 'Last 72 Hours',
      value: stats.last_72h,
      subtitle: `${stats.evolution_72h > 0 ? '↑' : stats.evolution_72h < 0 ? '↓' : '→'} ${Math.abs(stats.evolution_72h)}% vs previous 72h`,
      icon: Clock,
      gradient: {
        border: 'from-indigo-500/20 to-indigo-600/20',
        bg: 'from-indigo-500/[0.08] to-indigo-600/[0.08]'
      }
    },
    {
      title: 'Last 7 Days',
      value: stats.last_7d,
      subtitle: `${stats.evolution_7d > 0 ? '↑' : stats.evolution_7d < 0 ? '↓' : '→'} ${Math.abs(stats.evolution_7d)}% vs previous 7 days`,
      icon: TrendingUp,
      gradient: {
        border: 'from-violet-500/20 to-violet-600/20',
        bg: 'from-violet-500/[0.08] to-violet-600/[0.08]'
      }
    },
    {
      title: 'Last 30 Days',
      value: stats.last_30d,
      subtitle: `${stats.evolution_30d > 0 ? '↑' : stats.evolution_30d < 0 ? '↓' : '→'} ${Math.abs(stats.evolution_30d)}% vs previous 30 days`,
      icon: Download,
      gradient: {
        border: 'from-purple-500/20 to-purple-600/20',
        bg: 'from-purple-500/[0.08] to-purple-600/[0.08]'
      }
    },
    {
      title: 'All Time',
      value: stats.all_time,
      subtitle: '📈 Total downloads since tracking began',
      icon: History,
      gradient: {
        border: 'from-fuchsia-500/20 to-fuchsia-600/20',
        bg: 'from-fuchsia-500/[0.08] to-fuchsia-600/[0.08]'
      }
    }
  ];

  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-indigo-500/20 to-indigo-600/20 p-[1px]">
      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.03] to-indigo-600/[0.03]" />
        
        <div className="relative p-8">
          <div className="mb-8">
            <h2 className="text-3xl font-bold bg-gradient-to-br from-indigo-600 to-indigo-500 bg-clip-text text-transparent">
              Global Statistics
            </h2>
            <div className="mt-2 text-sm text-muted-foreground">
              Last updated: {stats.last_updated}
            </div>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {statCards.map((card, index) => (
              <StatCard key={index} {...card} />
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}