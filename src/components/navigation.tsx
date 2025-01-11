'use client';

import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';
import { BarChart3, Github } from 'lucide-react';
import { usePathname } from 'next/navigation';
import pkg from '../../package.json';

export function Navigation() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (!pathname) return false;
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  };

  return (
    <nav className="border-b bg-gradient-to-r from-background to-background/95 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-8">
          <Link href="/" className="flex items-center space-x-2 group">
            <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white p-2 rounded-lg">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg group-hover:text-indigo-500 transition-colors">
                Game Stats
              </span>
              <span className="text-xs text-muted-foreground">v{pkg.version}</span>
            </div>
          </Link>
          
          <div className="hidden md:flex items-center space-x-6">
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

        <div className="flex items-center space-x-4">
          <Link
            href="/api/docs"
            className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${
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
    </nav>
  );
}