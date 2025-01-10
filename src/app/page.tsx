import { Suspense } from 'react';
import { getTopGames } from '@/lib/api';
import { SearchBar } from '@/components/search-bar';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { StatsOverview } from '@/components/stats-overview';
import { TopGamesSection } from '@/components/top-games-section';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = false;

export default function Home() {
  return (
    <div className="space-y-6">
      <SearchBar />
      
      <Suspense fallback={<LoadingSpinner />}>
        <StatsOverview />
      </Suspense>

      <div className="space-y-6">
        <Suspense fallback={<LoadingSpinner />}>
          <TopGamesSection period="72h" />
        </Suspense>

        <Suspense fallback={<LoadingSpinner />}>
          <TopGamesSection period="7d" />
        </Suspense>

        <Suspense fallback={<LoadingSpinner />}>
          <TopGamesSection period="30d" />
        </Suspense>

        <Suspense fallback={<LoadingSpinner />}>
          <TopGamesSection period="all" />
        </Suspense>
      </div>
    </div>
  );
}