'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  period: string;
}

export function Pagination({ currentPage, totalPages, period }: PaginationProps) {
  const pathname = usePathname() || '';
  const searchParams = useSearchParams();

  const createPageURL = (pageNumber: number | string) => {
    const params = new URLSearchParams();
    if (searchParams) {
      searchParams.forEach((value, key) => {
        params.set(key, value);
      });
    }
    params.set('page', pageNumber.toString());
    return `${pathname}?${params.toString()}`;
  };

  // Generate page numbers to show
  const getPageNumbers = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];
    let l;

    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        (i >= currentPage - delta && i <= currentPage + delta)
      ) {
        range.push(i);
      }
    }

    for (let i of range) {
      if (l) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push('...');
        }
      }
      rangeWithDots.push(i);
      l = i;
    }

    return rangeWithDots;
  };

  return (
    <div className="flex items-center justify-center space-x-2">
      <Link
        href={createPageURL(currentPage - 1)}
        className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${
          currentPage === 1 ? 'pointer-events-none opacity-50' : ''
        }`}
        aria-label="Previous page"
      >
        <ChevronLeft className="w-5 h-5" />
      </Link>

      {getPageNumbers().map((pageNumber, i) => (
        pageNumber === '...' ? (
          <span
            key={`dots-${i}`}
            className="px-4 py-2 text-gray-400"
          >
            ...
          </span>
        ) : (
          <Link
            key={pageNumber}
            href={createPageURL(pageNumber)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              currentPage === pageNumber
                ? 'bg-indigo-500 text-white'
                : 'hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            {pageNumber}
          </Link>
        )
      ))}

      <Link
        href={createPageURL(currentPage + 1)}
        className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${
          currentPage === totalPages ? 'pointer-events-none opacity-50' : ''
        }`}
        aria-label="Next page"
      >
        <ChevronRight className="w-5 h-5" />
      </Link>
    </div>
  );
}