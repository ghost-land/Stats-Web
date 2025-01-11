import type { Metadata } from 'next';
import { Suspense, type ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { AnalyticsFilters } from '@/components/analytics-filters';
import { AnalyticsCharts } from '@/components/analytics-charts';
import { AnalyticsLoading } from '@/components/analytics-loading';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Analytics - Game Stats',
  description: 'Detailed download statistics and trends analysis'
};

interface PageProps {
  searchParams: { 
    period?: string;
    startDate?: string;
    endDate?: string;
    year?: string;
    month?: string;
  }
}

export default function AnalyticsPage({
  searchParams
}: PageProps): ReactNode {
  const hasParams = searchParams.period || searchParams.startDate || searchParams.endDate || searchParams.year || searchParams.month;
  const defaultPeriod = hasParams ? searchParams.period : 'all';

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-indigo-500/20 to-indigo-600/20 p-[1px]">
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.03] to-indigo-600/[0.03]" />
          
          <div className="relative p-6 bg-gradient-to-r from-indigo-500 to-indigo-600">
            <h1 className="text-2xl font-bold text-white">Analytics Dashboard</h1>
            <p className="mt-2 text-white/80">
              Explore detailed download statistics and trends
            </p>
          </div>

          <div className="relative p-6">
            <AnalyticsFilters />
            
            <Suspense fallback={<AnalyticsLoading />}>
              <AnalyticsCharts 
                period={defaultPeriod}
                startDate={searchParams.startDate}
                endDate={searchParams.endDate}
                year={searchParams.year}
                month={searchParams.month}
              />
            </Suspense>
          </div>
        </Card>
      </div>
    </div>
  );
}