import { Suspense } from 'react';
import { getTopGames } from '@/lib/api';
import { GameCard } from '@/components/game-card';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/empty-state';
import { FilterButton } from '@/components/filter-button';
import { getGamesRankings } from '@/lib/api';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Pagination } from '@/components/pagination';
import { notFound } from 'next/navigation';
import { TopGamesHeader } from '@/components/top-games-header';
import { getDbLastModified } from '@/lib/db';
import { Metadata } from 'next';

// Force dynamic rendering for top games
export const dynamic = 'force-dynamic';

const GAMES_PER_PAGE = 24;

const validPeriods = ['72h', '7d', '30d', 'all'] as const;
type Period = typeof validPeriods[number];

const periodTitles = {
  '72h': 'Last 72 Hours',
  '7d': 'Last 7 Days',
  '30d': 'Last 30 Days',
  'all': 'All Time',
} as const;

function isPeriodValid(period: string): period is Period {
  return validPeriods.includes(period as Period);
}

type Props = {
  params: { period: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  if (!isPeriodValid(params.period)) {
    return {
      title: 'Invalid Period - Game Stats',
    };
  }

  const title = `Top Games - ${periodTitles[params.period]}`;
  const description = `Discover the most downloaded games in the ${periodTitles[params.period].toLowerCase()}. View detailed statistics and download trends.`;

  return {
    title: `${title} - Game Stats`,
    description,
    openGraph: {
      title: `${title} - Game Stats`,
      description,
      type: 'website',
      images: ['/favicon.png'],
    },
    twitter: {
      card: 'summary',
      title: `${title} - Game Stats`,
      description,
      images: ['/favicon.png'],
    },
  };
}

export default async function TopGamesPage({ 
  params,
  searchParams 
}: { 
  params: { period: string },
  searchParams: { page?: string; type?: string }
}) {
  if (!isPeriodValid(params.period)) {
    notFound();
  }

  const period = params.period as Period;
  const page = Math.max(1, parseInt(searchParams.page || '1'));
  const contentType = (searchParams.type as 'base' | 'update' | 'dlc' | 'all') || 'base';
  
  try {
    // Get games for the period
    const { games, total } = await getTopGames(period, contentType, page, GAMES_PER_PAGE);
    
    // Get rankings for all displayed games at once
    const rankings = period === 'all' ? new Map() : 
      await getGamesRankings(
        games.map(game => game.tid),
        period
      );
    
    if (!games || total === 0) {
      return (
        <EmptyState 
          title="No Games Found"
          message="No game statistics are available for this time period."
        />
      );
    }

    const totalPages = Math.ceil(total / GAMES_PER_PAGE);

    return (
      <div className="space-y-6">
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-indigo-500/20 to-indigo-600/20 p-[1px]">
          <Card className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.03] to-indigo-600/[0.03]" />
            
            <div className="relative p-6 bg-gradient-to-r from-indigo-500 to-indigo-600">
              <TopGamesHeader 
                title={`${contentType === 'all' ? 'Top Content' : contentType === 'base' ? 'Top Games' : contentType === 'update' ? 'Top Updates' : 'Top DLC'} - ${periodTitles[period]}`}
                total={total}
                contentType={contentType}
                page={page}
              />
            </div>
            
            <div className="relative p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-8">
                {games.map((game, index) => {
                  const globalIndex = ((page - 1) * GAMES_PER_PAGE) + index;
                  const currentRank = globalIndex + 1;
                  const rankChange = period === 'all' ? undefined : game.stats.rank_change;

                  return (
                    <Suspense key={game.tid} fallback={<LoadingSpinner />}>
                      <GameCard 
                        game={game} 
                        rank={currentRank}
                        period={period}
                        rankChange={rankChange}
                      />
                    </Suspense>
                  );
                })}
              </div>

              {totalPages > 1 && (
                <div className="mt-8">
                  <Pagination 
                    currentPage={page} 
                    totalPages={totalPages} 
                    period={period} 
                  />
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error loading top games:', error);
    return (
      <EmptyState 
        title="Error Loading Games"
        message="There was an error loading the game statistics. Please try again later."
      />
    );
  }
}