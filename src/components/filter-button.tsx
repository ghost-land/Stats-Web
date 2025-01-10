'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Package } from 'lucide-react';

export function FilterButton({ showAll }: { showAll: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const toggleFilter = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('showAll', (!showAll).toString());
    params.delete('page'); // Reset to first page when toggling filter
    router.push(`/search?${params.toString()}`);
  };

  return (
    <button
      onClick={toggleFilter}
      className={`
        inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium
        transition-colors
        ${showAll 
          ? 'bg-white/90 text-indigo-600 hover:bg-white' 
          : 'bg-white/10 text-white hover:bg-white/20'
        }
      `}
    >
      <Package className="w-4 h-4" />
      {showAll ? 'Hide Updates & DLC' : 'Show Updates & DLC'}
    </button>
  );
}