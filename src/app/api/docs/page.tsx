'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card'; 
import { ChevronDown, ChevronRight } from 'lucide-react';

const endpoints = [
  {
    method: 'GET',
    path: '/api/analytics',
    description: 'Get detailed analytics data with various filters',
    example: '/api/analytics?period=30d',
    response: {
      dailyDownloads: [/* daily download counts */],
      monthlyDownloads: [/* monthly download counts */],
      stats: {
        total: 1000000,
        total_data_size: '1.5 TB',
        growthRate: 25
      },
      additionalStats: {
        average_daily_downloads: 50000,
        highest_daily_downloads: 75000,
        lowest_daily_downloads: 25000,
        average_daily_games: 1000,
        max_daily_games: 1500,
        min_daily_games: 500
      },
      gameTypeStats: {
        base_downloads: 500000,
        update_downloads: 300000,
        dlc_downloads: 200000,
        base_data_size: '750 GB',
        update_data_size: '500 GB',
        dlc_data_size: '250 GB'
      }
    }
  },
  {
    method: 'GET',
    path: '/api/rankings/[tid]',
    description: 'Get rankings for a specific game across all periods',
    example: '/api/rankings/0100000000000000',
    response: {
      '72h': {
        current: 1,
        previous: 2,
        change: 1
      },
      '7d': {
        current: 3,
        previous: 5,
        change: 2
      },
      '30d': {
        current: 10,
        previous: 8,
        change: -2
      },
      'all': {
        current: 15,
        previous: 15,
        change: 0
      }
    }
  },
  {
    method: 'POST',
    path: '/api/rankings',
    description: 'Get rankings for multiple games in a specific period',
    example: '/api/rankings',
    body: {
      tids: ['0100000000000000', '0100000000000001'],
      period: '72h'
    },
    response: {
      '0100000000000000': {
        current: 1,
        previous: 2,
        change: 1
      },
      '0100000000000001': {
        current: 5,
        previous: 3,
        change: -2
      }
    }
  },
  {
    method: 'GET',
    path: '/api/revalidate',
    description: 'Check if data needs to be revalidated',
    example: '/api/revalidate',
    response: {
      lastModified: '2024-03-20T12:00:00Z'
    }
  },
  {
    method: 'GET',
    path: '/api/games',
    description: 'Get all games with their statistics',
    example: '/api/games',
    response: {
      tid: '0100000000000000',
      is_base: true,
      is_update: false,
      is_dlc: false,
      base_tid: null,
      stats: {
        per_date: { '2024-03-20': 100 },
        total_downloads: 1000
      },
      info: {
        name: 'Game Name',
        version: '1.0.0',
        size: 1000000,
        releaseDate: '2024-03-20'
      }
    }
  },
  {
    method: 'GET',
    path: '/api/games/[tid]',
    description: 'Get details for a specific game',
    example: '/api/games/0100000000000000',
    response: {
      tid: '0100000000000000',
      is_base: true,
      stats: {
        per_date: { '2024-03-20': 100 },
        total_downloads: 1000,
        period_downloads: {
          last_72h: 100,
          last_7d: 500,
          last_30d: 1000
        }
      }
    }
  },
  {
    method: 'GET',
    path: '/api/top/[period]',
    description: 'Get top games for a specific period (72h, 7d, 30d, all)',
    example: '/api/top/72h',
    response: [
      {
        tid: '0100000000000000',
        stats: {
          per_date: { '2024-03-20': 100 },
          total_downloads: 1000
        }
      }
    ]
  },
  {
    method: 'GET',
    path: '/api/stats',
    description: 'Get global download statistics',
    example: '/api/stats',
    response: {
      last_72h: 1000,
      last_7d: 5000,
      last_30d: 20000,
      all_time: 100000
    }
  },
  {
    method: 'GET',
    path: '/api/search',
    description: 'Search games by name or TID',
    example: '/api/search?q=mario',
    response: [
      {
        tid: '0100000000000000',
        name: 'Super Mario',
        stats: {
          total_downloads: 1000
        }
      }
    ]
  }
];

function EndpointSection({ endpoint, index }: { endpoint: typeof endpoints[0]; index: number }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="px-2 py-1 text-xs font-medium rounded bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300">
            {endpoint.method}
          </span>
          <code className="text-sm">{endpoint.path}</code>
        </div>
        {isOpen ? (
          <ChevronDown className="w-5 h-5 text-slate-400" />
        ) : (
          <ChevronRight className="w-5 h-5 text-slate-400" />
        )}
      </button>
      
      {isOpen && (
        <div className="p-4 space-y-4">
          <div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {endpoint.description}
            </p>
          </div>

          <div>
            <h4 className="text-sm font-medium mb-2">Example Request</h4>
            <pre className="bg-slate-100 dark:bg-slate-800 p-3 rounded text-sm overflow-x-auto">
              {endpoint.example}
            </pre>
          </div>

          <div>
            <h4 className="text-sm font-medium mb-2">Example Response</h4>
            <pre className="bg-slate-100 dark:bg-slate-800 p-3 rounded text-sm overflow-x-auto">
              {JSON.stringify(endpoint.response, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ApiDocsPage() {
  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-indigo-500/20 to-indigo-600/20 p-[1px]">
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.03] to-indigo-600/[0.03]" />
          
          <div className="relative p-6 bg-gradient-to-r from-indigo-500 to-indigo-600">
            <h1 className="text-2xl font-bold text-white">API Documentation</h1>
            <p className="mt-2 text-white/80">
              Access game statistics programmatically through our REST API endpoints.
            </p>
          </div>

          <div className="relative p-6">
            <div className="prose prose-slate dark:prose-invert max-w-none">
              <h2>Base URL</h2>
              <pre className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg overflow-x-auto">
                {typeof window !== 'undefined' ? window.location.origin : ''}
              </pre>

              <h2 className="mt-8">Authentication</h2>
              <p>
                No authentication is required to access the API. All endpoints are publicly available.
              </p>

              <h2 className="mt-8">Rate Limiting</h2>
              <p>
                Please be mindful of our rate limits:
              </p>
              <ul className="list-disc list-inside space-y-2">
                <li>100 requests per minute per IP address (soft limit)</li>
                <li>Data is cached for 1 hour to ensure optimal performance</li>
                <li>Historical data is available from September 28, 2024 onwards</li>
              </ul>

              <h2 className="mt-8">Endpoints</h2>
              <div className="space-y-8">
                {endpoints.map((endpoint, i) => (
                  <EndpointSection key={i} endpoint={endpoint} index={i} />
                ))}
              </div>

              <h2 className="mt-8">Error Handling</h2>
              <p>
                The API uses standard HTTP status codes to indicate the success or failure of requests:
              </p>
              <ul className="list-disc list-inside space-y-2">
                <li><code>200</code> - Success</li>
                <li><code>400</code> - Bad Request</li>
                <li><code>404</code> - Not Found</li>
                <li><code>429</code> - Too Many Requests (Rate limit exceeded)</li>
                <li><code>500</code> - Internal Server Error</li>
              </ul>

              <h2 className="mt-8">Data Availability</h2>
              <p>
                Please note that our data collection started on September 28, 2024. The data has the following characteristics:
              </p>
              <ul className="list-disc list-inside space-y-2">
                <li>Initial tracking: September 28-29, 2024</li>
                <li>Continued tracking until December 14, 2024</li>
                <li>Full system deployment: January 5, 2025 onwards</li>
                <li>Data is updated every hour</li>
              </ul>

              <h2 className="mt-8">Support</h2>
              <p>
                For support or questions, please visit our{' '}
                <a 
                  href="https://github.com/ghost-land/Stats-Web/issues"
                  className="text-indigo-600 dark:text-indigo-400 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  GitHub repository
                </a>.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}