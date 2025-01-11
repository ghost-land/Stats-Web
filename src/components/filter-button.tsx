'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Package } from 'lucide-react';

export function FilterButton({ contentType }: { contentType: 'base' | 'update' | 'dlc' | 'all' }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const setContentType = (type: 'base' | 'update' | 'dlc' | 'all') => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('type', type);
    params.delete('page'); // Reset to first page when toggling filter
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap items-center gap-2 overflow-x-auto scrollbar-hide">
      <button
        onClick={() => setContentType('base')}
        className={`
          inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium
          whitespace-nowrap
          transition-colors
          ${contentType === 'base' 
            ? 'bg-white/90 text-indigo-600' 
            : 'bg-white/10 text-white hover:bg-white/20'
          }
        `}
      >
        Base
      </button>
      <button
        onClick={() => setContentType('update')}
        className={`
          inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium
          whitespace-nowrap
          transition-colors
          ${contentType === 'update' 
            ? 'bg-white/90 text-indigo-600' 
            : 'bg-white/10 text-white hover:bg-white/20'
          }
        `}
      >
        Updates
      </button>
      <button
        onClick={() => setContentType('dlc')}
        className={`
          inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium
          whitespace-nowrap
          transition-colors
          ${contentType === 'dlc' 
            ? 'bg-white/90 text-indigo-600' 
            : 'bg-white/10 text-white hover:bg-white/20'
          }
        `}
      >
        DLC
      </button>
      <button
        onClick={() => setContentType('all')}
        className={`
          inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium
          whitespace-nowrap
          transition-colors
          ${contentType === 'all' 
            ? 'bg-white/90 text-indigo-600' 
            : 'bg-white/10 text-white hover:bg-white/20'
          }
        `}
      >
        All
      </button>
    </div>
  );
}