import { Suspense } from 'react';
import { GameCard } from '@/components/game-card';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/empty-state';
import { SearchBar } from '@/components/search-bar';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { FilterButton } from '@/components/filter-button';
import type { Game } from '@/lib/types';
import { TopGamesHeader } from '@/components/top-games-header';
import { Pagination } from '@/components/pagination';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = false;

const GAMES_PER_PAGE = 24;

async function searchGames(query: string, contentType: 'base' | 'update' | 'dlc' | 'all', currentPage: number, gamesPerPage: number) {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/search?q=${encodeURIComponent(query)}&type=${contentType}&page=${currentPage}&limit=${gamesPerPage}`,
    { next: { revalidate: 3600 } }
  );
  if (!response.ok) throw new Error('Failed to fetch games');
  return response.json();
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { q: string; page?: string; type?: string };
}) {
  const query = searchParams.q?.toLowerCase() || '';
  const currentPage = Number(searchParams.page) || 1;
  const contentType = (searchParams.type as 'base' | 'update' | 'dlc' | 'all') || 'base';
  
  try {
    // Get games for the period
    const { games, total } = await searchGames(query, contentType, currentPage, GAMES_PER_PAGE);

    const totalPages = Math.ceil(total / GAMES_PER_PAGE);

    return (
      <div className="space-y-6">
        <SearchBar />
        
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-indigo-500/20 to-indigo-600/20 p-[1px]">
          <Card className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.03] to-indigo-600/[0.03]" />
            
            <div className="relative p-6 bg-gradient-to-r from-indigo-500 to-indigo-600">
              <TopGamesHeader 
                title={`Search Results for "${query}"`}
                total={total}
                contentType={contentType}
                page={currentPage}
              />
            </div>
            
            <div className="relative p-4 sm:p-8">
              <Suspense fallback={<LoadingSpinner />}>
                {games.length > 0 ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-8">
                      {games.map((game: Game, index: number) => (
                        <GameCard
                          key={game.tid}
                          game={game}
                          rank={((currentPage - 1) * GAMES_PER_PAGE) + index + 1}
                        />
                      ))}
                    </div>

                    {totalPages > 1 && (
                      <div className="mt-8">
                        <Pagination
                          currentPage={currentPage}
                          totalPages={totalPages}
                          period="search"
                        />
                      </div>
                    )}
                  </>
                ) : (
                  <EmptyState 
                    title="No Games Found"
                    message={`No games found matching "${query}". Try a different search term.`}
                  />
                )}
              </Suspense>
            </div>
          </Card>
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error searching games:', error);
    return (
      <EmptyState 
        title="Error"
        message="An error occurred while searching. Please try again later."
      />
    );
  }
}