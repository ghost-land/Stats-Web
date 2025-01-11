'use client';

import Link from 'next/link';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  period: string;
}

export function Pagination({ currentPage, totalPages, period }: PaginationProps) {
  const [inputValue, setInputValue] = useState('');
  const [showInput, setShowInput] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const pathname = usePathname() || '';
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (showInput && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showInput]);

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

  const handlePageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pageNumber = parseInt(inputValue);
    if (!isNaN(pageNumber) && pageNumber >= 1 && pageNumber <= totalPages) {
      router.push(createPageURL(pageNumber));
      setShowInput(false);
      setInputValue('');
    }
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
          showInput ? (
            <form key={`input-${i}`} onSubmit={handlePageSubmit} className="inline-block">
              <input
                ref={inputRef}
                type="number"
                min="1"
                max={totalPages}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onBlur={() => {
                  if (!inputValue) setShowInput(false);
                }}
                className="w-16 px-2 py-1 text-center rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder={`1-${totalPages}`}
              />
            </form>
          ) : (
            <button
              key={`dots-${i}`}
              onClick={() => setShowInput(true)}
              className="px-4 py-2 text-gray-400 hover:text-indigo-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              ...
            </button>
          )
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