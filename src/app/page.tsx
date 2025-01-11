import { Suspense } from 'react';
import { SearchBar } from '@/components/search-bar';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { StatsOverview } from '@/components/stats-overview';
import { TopGamesSection } from '@/components/top-games-section';

export const dynamic = 'force-dynamic';

export default function Home() {
  return (
    <div className="space-y-6">
      <SearchBar />
      
      <Suspense fallback={
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-indigo-500/20 to-indigo-600/20 p-[1px]">
          <div className="relative min-h-[200px] flex items-center justify-center">
            <LoadingSpinner />
          </div>
        </div>
      }>
        <StatsOverview />
      </Suspense>

      <div className="space-y-6">
        <Suspense fallback={
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-indigo-500/20 to-indigo-600/20 p-[1px]">
            <div className="relative min-h-[200px] flex items-center justify-center">
              <LoadingSpinner />
            </div>
          </div>
        }>
          <TopGamesSection period="72h" />
        </Suspense>

        <Suspense fallback={
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-indigo-500/20 to-indigo-600/20 p-[1px]">
            <div className="relative min-h-[200px] flex items-center justify-center">
              <LoadingSpinner />
            </div>
          </div>
        }>
          <TopGamesSection period="7d" />
        </Suspense>

        <Suspense fallback={
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-indigo-500/20 to-indigo-600/20 p-[1px]">
            <div className="relative min-h-[200px] flex items-center justify-center">
              <LoadingSpinner />
            </div>
          </div>
        }>
          <TopGamesSection period="30d" />
        </Suspense>

        <Suspense fallback={
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-indigo-500/20 to-indigo-600/20 p-[1px]">
            <div className="relative min-h-[200px] flex items-center justify-center">
              <LoadingSpinner />
            </div>
          </div>
        }>
          <TopGamesSection period="all" />
        </Suspense>
      </div>
    </div>
  );
}