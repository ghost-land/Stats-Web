import { Suspense } from 'react';
import { GameCard } from '@/components/game-card';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/empty-state';
import { SearchBar } from '@/components/search-bar';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { FilterButton } from '@/components/filter-button';
import type { Game } from '@/lib/types';
import { Pagination } from '@/components/pagination';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

const GAMES_PER_PAGE = 24;

async function searchGames(query: string) {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/search?q=${encodeURIComponent(query)}`,
    { next: { revalidate: 3600 } }
  );
  if (!response.ok) throw new Error('Failed to fetch games');
  return response.json();
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { q: string; page?: string; showAll?: string };
}) {
  const query = searchParams.q?.toLowerCase() || '';
  const currentPage = Number(searchParams.page) || 1;
  const showAll = searchParams.showAll === 'true';
  
  const games = await searchGames(query);
  const filteredGames = showAll ? games : games.filter((game: Game) => game.is_base);

  const totalPages = Math.ceil(filteredGames.length / GAMES_PER_PAGE);
  const paginatedGames = filteredGames.slice(
    (currentPage - 1) * GAMES_PER_PAGE,
    currentPage * GAMES_PER_PAGE
  );

  return (
    <div className="space-y-6">
      <SearchBar />
      
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-indigo-500/20 to-indigo-600/20 p-[1px]">
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.03] to-indigo-600/[0.03]" />
          
          <div className="relative p-6 bg-gradient-to-r from-indigo-500 to-indigo-600">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <h2 className="text-xl sm:text-2xl font-bold text-white">
                Search Results for "{query}"
              </h2>
              <div className="text-sm sm:text-base text-white/80 flex items-center gap-2">
                Found {filteredGames.length} {showAll ? 'items' : 'games'}
                {showAll && games.length !== filteredGames.length && (
                  <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full">
                    Including {games.length - games.filter((game: Game) => game.is_base).length} updates & DLC
                  </span>
                )}
              </div>
            </div>
            <div className="flex justify-end">
              <FilterButton showAll={showAll} />
            </div>
          </div>
          
          <div className="relative p-4 sm:p-8">
            <Suspense fallback={<LoadingSpinner />}>
              {paginatedGames.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-8">
                    {paginatedGames.map((game: Game, index: number) => (
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
}