'use client';

import { useState, useRef, useEffect } from 'react';
import { Filter, X } from 'lucide-react';
import { FilterButton } from './filter-button';

interface TopGamesHeaderProps {
  title: string;
  total: number;
  contentType: 'base' | 'update' | 'dlc' | 'all';
  page: number;
}

export function TopGamesHeader({ title, total, contentType, page }: TopGamesHeaderProps) {
  const [showFilters, setShowFilters] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setShowFilters(false);
      }
    };

    if (showFilters) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFilters]);

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-bold text-white">
            {title}
          </h2>
          <button
            onClick={() => setShowFilters(true)}
            className="sm:hidden p-2 -m-2 text-white/80 hover:text-white"
          >
            <Filter className="w-5 h-5" />
          </button>
        </div>
        <div className="hidden sm:flex items-center gap-4">
          <div className="text-white/80">
            <span className="hidden sm:inline">Found </span>
            {total.toLocaleString()} {
              contentType === 'all' ? 'total items' :
              contentType === 'base' ? 'base games' : 
              contentType === 'update' ? 'game updates' : 
              'DLC items'
            } {page > 1 && `(Page ${page})`}
          </div>
          <FilterButton contentType={contentType} />
        </div>
      </div>

      {/* Mobile Filters Modal */}
      {showFilters && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 sm:hidden">
          <div 
            ref={modalRef}
            className="absolute bottom-0 left-0 right-0 bg-white dark:bg-slate-900 rounded-t-2xl p-6 animate-slide-up"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Filter Content</h3>
              <button 
                onClick={() => setShowFilters(false)}
                className="p-2 -m-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="text-sm text-slate-500 dark:text-slate-400">
                {total.toLocaleString()} {
                  contentType === 'all' ? 'total items' :
                  contentType === 'base' ? 'base games' : 
                  contentType === 'update' ? 'game updates' : 
                  'DLC items'
                } {page > 1 && `(Page ${page})`}
              </div>
              <FilterButton contentType={contentType} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}