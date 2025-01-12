'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Calendar, ChevronDown } from 'lucide-react';
import { useAnalyticsStore } from '@/lib/analytics-store';

export { AnalyticsFilters };

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function AnalyticsFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setData } = useAnalyticsStore();
  const [isLoading, setIsLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  useEffect(() => {
    const fetchYears = async () => {
      setIsLoading(true);
      const response = await fetch('/api/analytics');
      const data = await response.json();
      if (data.availableYears) {
        setAvailableYears(data.availableYears.map((y: string) => parseInt(y)));
      }
      setIsLoading(false);
    };
    fetchYears();
  }, []);

  const updateFilters = useCallback((params: Record<string, string>) => {
    // Clear existing data to force a fresh fetch
    setData(null);

    const newParams = new URLSearchParams(searchParams.toString());
    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        newParams.set(key, value);
      } else {
        newParams.delete(key);
      }
    });
    router.push(`/analytics?${newParams.toString()}`);
  }, [router, searchParams, setData]);

  return (
    <div className="mb-8 space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        {isLoading && (
          <div className="flex items-center justify-center w-full py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-indigo-500 border-t-transparent" />
          </div>
        )}
        
        {!isLoading && (
        <>
        <div className="grid grid-cols-2 sm:flex gap-2">
          {['72h', '7d', '30d', 'all'].map((period) => (
            <button
              key={period}
              onClick={() => {
                // Clear all other filters when selecting a period
                updateFilters({ 
                  period,
                  startDate: '',
                  endDate: '',
                  year: '',
                  month: '' 
                });
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                (!searchParams.has('startDate') && !searchParams.has('year') && searchParams.get('period') === period)
                  ? 'bg-indigo-500 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {period === 'all' ? 'All Time' : `Last ${period}`}
            </button>
          ))}
        </div>

        {/* Year/Month Filter */}
        <div className="grid grid-cols-2 sm:flex gap-2">
          <select
            value={searchParams.get('year') || ''}
            onChange={(e) => {
              // Clear period and date range when selecting year
              updateFilters({ 
                year: e.target.value,
                period: '',
                startDate: '',
                endDate: ''
              });
            }}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700"
          >
            <option value="">Select Year</option>
            {availableYears.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>

          <select
            value={searchParams.get('month') || ''}
            onChange={(e) => {
              // Clear period and date range when selecting month
              updateFilters({ 
                month: e.target.value,
                period: '',
                startDate: '',
                endDate: ''
              });
            }}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700"
          >
            <option value="">Select Month</option>
            {MONTHS.map((month, index) => (
              <option key={month} value={index + 1}>{month}</option>
            ))}
          </select>
        </div>

        {/* Custom Date Range */}
        <div className="relative w-full sm:w-auto">
          <button
            onClick={() => setShowDatePicker(!showDatePicker)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700"
          >
            <Calendar className="w-4 h-4" />
            Custom Range
            <ChevronDown className="w-4 h-4" />
          </button>

          {showDatePicker && (
            <Card className="absolute top-full mt-2 p-4 z-50">
              <div className="grid gap-4">
                <div>
                  <label className="text-sm font-medium">Start Date</label>
                  <input
                    type="date"
                    value={searchParams.get('startDate') || ''}
                    onChange={(e) => updateFilters({ startDate: e.target.value })}
                    className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">End Date</label>
                  <input
                    type="date"
                    value={searchParams.get('endDate') || ''}
                    onChange={(e) => updateFilters({ endDate: e.target.value })}
                    className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800"
                  />
                </div>
              </div>
            </Card>
          )}
        </div>
        </>
        )}
      </div>
    </div>
  );
}