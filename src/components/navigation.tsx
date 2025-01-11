'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { ThemeToggle } from '@/components/theme-toggle';
import { BarChart3, Github, Menu, Search, X } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import pkg from '../../package.json';

export function Navigation() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isMenuOpen &&
        menuRef.current &&
        buttonRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  const isActive = (path: string) => {
    if (!pathname) return false;
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  };

  return (
    <nav className="border-b bg-gradient-to-r from-background to-background/95 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center">
        <div className="flex items-center space-x-6 md:flex-shrink-0">
          <Link href="/" className="flex items-center space-x-2 group">
            <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white p-2 rounded-lg transition-transform group-hover:scale-105">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div className="flex flex-col mr-4">
              <span className="hidden md:block font-bold text-lg group-hover:text-indigo-500 transition-colors">
                Game Stats
              </span>
              <span className="text-xs text-muted-foreground md:text-left text-center">v{pkg.version}</span>
            </div>
          </Link>
          
          <div className="hidden md:flex items-center space-x-8">
            <Link 
              href="/top/72h" 
              className={`text-sm font-medium transition-colors ${
                isActive('/top/72h')
                  ? 'text-indigo-500'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Top 72h
            </Link>
            <Link 
              href="/top/7d" 
              className={`text-sm font-medium transition-colors ${
                isActive('/top/7d')
                  ? 'text-indigo-500'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Top 7d
            </Link>
            <Link 
              href="/top/30d" 
              className={`text-sm font-medium transition-colors ${
                isActive('/top/30d')
                  ? 'text-indigo-500'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Top 30d
            </Link>
            <Link 
              href="/top/all" 
              className={`text-sm font-medium transition-colors ${
                isActive('/top/all')
                  ? 'text-indigo-500'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              All Time
            </Link>
            <Link 
              href="/analytics" 
              className={`text-sm font-medium transition-colors ${
                isActive('/analytics')
                  ? 'text-indigo-500'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Analytics
            </Link>
          </div>
        </div>

        {/* Desktop search bar (non-home pages) */}
        <div className="hidden md:block flex-1 max-w-md mx-12">
          {pathname !== '/' && (
            <form onSubmit={handleSearch} className="w-full">
              <div className="relative group">
                <input
                  type="search"
                  placeholder="Search games by name or TID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-1.5 pl-10 rounded-lg bg-slate-100 dark:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm transition-all"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
              </div>
            </form>
          )}
        </div>

        <div className="flex items-center space-x-3 ml-auto">
          {/* Search bar for mobile */}
          <form onSubmit={handleSearch} className="relative md:hidden">
            <input
              type="search"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-32 px-3 py-1.5 pl-8 text-sm rounded-lg bg-slate-100 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          </form>

          {/* Menu button for mobile */}
          <button
            ref={buttonRef}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all hover:scale-105"
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <Link
            href="/api/docs"
            className={`hidden sm:flex p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${
              isActive('/api/docs') ? 'text-indigo-500' : ''
            }`}
          >
            <div className="flex items-center space-x-1">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-5 h-5"
              >
                <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4" />
                <path d="M4 6v12c0 1.1.9 2 2 2h14v-4" />
                <path d="M18 12a2 2 0 0 0-2 2c0 1.1.9 2 2 2h4v-4h-4z" />
              </svg>
              <span className="text-sm font-medium">API</span>
            </div>
          </Link>
          <a
            href="https://github.com/ghost-land/Stats-Web"
            target="_blank"
            rel="noopener noreferrer" 
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <Github className="w-5 h-5" />
            <span className="sr-only">GitHub</span>
          </a>
          <ThemeToggle />
        </div>
      </div>

      {/* Mobile menu */}
      <div 
        ref={menuRef}
        className={`
          absolute top-full left-0 right-0 
          bg-white/90 dark:bg-slate-900/90 backdrop-blur-md 
          border-b md:hidden shadow-xl
          transform transition-all duration-200 ease-in-out
          ${isMenuOpen ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-4 scale-95 pointer-events-none'}
        `}
      >
        <div className="container mx-auto py-2 max-h-[calc(100vh-4rem)] overflow-y-auto">
          <div className="p-2 space-y-1">
            <Link 
              href="/top/72h" 
              onClick={() => setIsMenuOpen(false)}
              className={`block px-4 py-3 rounded-lg transition-all duration-200 hover:scale-[1.02] ${
                isActive('/top/72h')
                  ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-md'
                  : 'hover:bg-gray-100/80 dark:hover:bg-gray-800/80'
              }`}
            >
              <div className="flex items-center space-x-3">
                <span className="w-1.5 h-1.5 rounded-full bg-current opacity-75" />
                <span className="font-medium">
              Top 72h
                </span>
              </div>
            </Link>
            <Link 
              href="/top/7d"
              onClick={() => setIsMenuOpen(false)}
              className={`block px-4 py-3 rounded-lg transition-all duration-200 hover:scale-[1.02] ${
                isActive('/top/7d')
                  ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-md'
                  : 'hover:bg-gray-100/80 dark:hover:bg-gray-800/80'
              }`}
            >
              <div className="flex items-center space-x-3">
                <span className="w-1.5 h-1.5 rounded-full bg-current opacity-75" />
                <span className="font-medium">
              Top 7d
                </span>
              </div>
            </Link>
            <Link 
              href="/top/30d"
              onClick={() => setIsMenuOpen(false)}
              className={`block px-4 py-3 rounded-lg transition-all duration-200 hover:scale-[1.02] ${
                isActive('/top/30d')
                  ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-md'
                  : 'hover:bg-gray-100/80 dark:hover:bg-gray-800/80'
              }`}
            >
              <div className="flex items-center space-x-3">
                <span className="w-1.5 h-1.5 rounded-full bg-current opacity-75" />
                <span className="font-medium">
              Top 30d
                </span>
              </div>
            </Link>
            <Link 
              href="/top/all"
              onClick={() => setIsMenuOpen(false)}
              className={`block px-4 py-3 rounded-lg transition-all duration-200 hover:scale-[1.02] ${
                isActive('/top/all')
                  ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-md'
                  : 'hover:bg-gray-100/80 dark:hover:bg-gray-800/80'
              }`}
            >
              <div className="flex items-center space-x-3">
                <span className="w-1.5 h-1.5 rounded-full bg-current opacity-75" />
                <span className="font-medium">
              All Time
                </span>
              </div>
            </Link>
            <Link 
              href="/analytics"
              onClick={() => setIsMenuOpen(false)}
              className={`block px-4 py-3 rounded-lg transition-all duration-200 hover:scale-[1.02] ${
                isActive('/analytics')
                  ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-md'
                  : 'hover:bg-gray-100/80 dark:hover:bg-gray-800/80'
              }`}
            >
              <div className="flex items-center space-x-3">
                <span className="w-1.5 h-1.5 rounded-full bg-current opacity-75" />
                <span className="font-medium">
              Analytics
                </span>
              </div>
            </Link>
            <Link 
              href="/api/docs"
              onClick={() => setIsMenuOpen(false)}
              className={`block px-4 py-3 rounded-lg transition-all duration-200 hover:scale-[1.02] sm:hidden ${
                isActive('/api/docs')
                  ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-md'
                  : 'hover:bg-gray-100/80 dark:hover:bg-gray-800/80'
              }`}
            >
              <div className="flex items-center space-x-3">
                <span className="w-1.5 h-1.5 rounded-full bg-current opacity-75" />
                <span className="font-medium">
              API Documentation
                </span>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}