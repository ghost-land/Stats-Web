import { getHomePageRankings } from '@/lib/api';
import { GameCard } from '@/components/game-card';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/empty-state';
import { Clock, Download, History, ArrowRight } from 'lucide-react';
import { getGamesRankings } from '@/lib/api';
import Link from 'next/link';
import type { Game } from '@/lib/types';

const periodConfig = {
  '72h': {
    title: 'Top Games (Last 72 Hours)',
    icon: Clock,
    gradient: {
      border: 'from-indigo-500/20 to-indigo-600/20',
      header: 'from-indigo-500 to-indigo-600',
      bg: 'from-indigo-500/[0.03] to-indigo-600/[0.03]',
    },
  },
  '7d': {
    title: 'Top Games (Last 7 Days)',
    icon: Download,
    gradient: {
      border: 'from-violet-500/20 to-violet-600/20',
      header: 'from-violet-500 to-violet-600',
      bg: 'from-violet-500/[0.03] to-violet-600/[0.03]',
    },
  },
  '30d': {
    title: 'Top Games (Last 30 Days)',
    icon: Download,
    gradient: {
      border: 'from-purple-500/20 to-purple-600/20',
      header: 'from-purple-500 to-purple-600',
      bg: 'from-purple-500/[0.03] to-purple-600/[0.03]',
    },
  },
  'all': {
    title: 'Top Games (All Time)',
    icon: History,
    gradient: {
      border: 'from-fuchsia-500/20 to-fuchsia-600/20',
      header: 'from-fuchsia-500 to-fuchsia-600',
      bg: 'from-fuchsia-500/[0.03] to-fuchsia-600/[0.03]',
    },
  },
} as const;

export async function TopGamesSection({ 
  period,
}: { 
  period: keyof typeof periodConfig,
}) {
  try {
    const games = await getHomePageRankings(period);
    const { title, icon: Icon, gradient } = periodConfig[period];
    
    console.log('[TopGamesSection] Period:', period);
    console.log('[TopGamesSection] Total games:', games.length);
    console.log('[TopGamesSection] First 5 games:', games.slice(0, 5).map(g => ({
      tid: g.tid,
      name: g.info?.name,
      downloads: g.stats.total_downloads,
      periodDownloads: g.stats.period_downloads,
      rankChange: g.stats.rank_change
    })));

    if (games.length === 0) {
      return (
        <EmptyState 
          title="No Games Found"
          message="There are no games to display for this period."
        />
      );
    }

    // Limit to 12 games for homepage sections
    const displayGames = games.slice(0, 12);

    return (
      <div className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${gradient.border} p-[1px]`}>
        <Card className="relative overflow-hidden">
          <div className={`absolute inset-0 bg-gradient-to-br ${gradient.bg}`} />
          
          <div className={`relative p-6 bg-gradient-to-r ${gradient.header}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Icon className="h-6 w-6 text-white" />
                <h2 className="text-2xl font-bold text-white">{title}</h2>
              </div>
              <Link
                href={`/top/${period}`}
                className="flex items-center space-x-2 text-white/80 hover:text-white transition-colors"
              >
                <span className="text-sm">View All</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
          
          <div className="relative p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-8">
              {displayGames.map((game, index) => {
                const rankChange = period === 'all' ? undefined : game.stats.rank_change;

                return (
                  <GameCard 
                    key={game.tid} 
                    game={game} 
                    rank={index + 1}
                    period={period}
                    rankChange={rankChange}
                  />
                );
              })}
            </div>
          </div>
        </Card>
      </div>
    );
  } catch (error) {
    console.error(`Error loading top games for ${period}:`, error);
    return (
      <EmptyState 
        title="Error Loading Games"
        message="There was an error loading the game statistics. Please try again later."
      />
    );
  }
}