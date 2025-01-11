'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

export function SearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-3xl mx-auto mb-8 hidden md:block">
      <div className="relative group">
        <input
          type="search"
          placeholder="Search games by name or TID..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full px-4 py-3 pl-12 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent shadow-sm group-hover:shadow-md transition-all text-base"
        />
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
        
        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400">
          Press Enter to search
        </div>
      </div>
      
      <div className="mt-2 text-center text-sm text-slate-500 dark:text-slate-400">
        Search by game name (e.g. "Mario Kart") or TID (e.g. "0100152000022000")
      </div>
    </form>
  );
}