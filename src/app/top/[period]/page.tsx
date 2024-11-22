import { Suspense } from 'react';
import { getTopGames } from '@/lib/api';
import { GameCard } from '@/components/game-card';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/empty-state';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Pagination } from '@/components/pagination';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
  searchParams: { page?: string }
}) {
  if (!isPeriodValid(params.period)) {
    notFound();
  }

  const currentPage = Number(searchParams.page) || 1;
  const games = await getTopGames(params.period, true);
  
  const totalPages = Math.ceil(games.length / GAMES_PER_PAGE);
  const paginatedGames = games.slice(
    (currentPage - 1) * GAMES_PER_PAGE,
    currentPage * GAMES_PER_PAGE
  );

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-indigo-500/20 to-indigo-600/20 p-[1px]">
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.03] to-indigo-600/[0.03]" />
          
          <div className="relative p-6 bg-gradient-to-r from-indigo-500 to-indigo-600">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">
                Top Games - {periodTitles[params.period]}
              </h2>
              <div className="text-white/80">
                Showing {paginatedGames.length} of {games.length} games
              </div>
            </div>
          </div>
          
          <div className="relative p-8">
            <Suspense fallback={<LoadingSpinner />}>
              {paginatedGames.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-8">
                    {paginatedGames.map((game, index) => (
                      <GameCard
                        key={game.tid}
                        game={game}
                        rank={((currentPage - 1) * GAMES_PER_PAGE) + index + 1}
                        period={params.period as Period}
                      />
                    ))}
                  </div>
                  
                  {totalPages > 1 && (
                    <div className="mt-8">
                      <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        period={params.period}
                      />
                    </div>
                  )}
                </>
              ) : (
                <EmptyState 
                  title="No Games Found"
                  message="No game statistics are available for this time period."
                />
              )}
            </Suspense>
          </div>
        </Card>
      </div>
    </div>
  );
}