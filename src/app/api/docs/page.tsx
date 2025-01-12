'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card'; 
import { ChevronDown, ChevronRight } from 'lucide-react';

interface Endpoint {
  method: string;
  path: string;
  description: string;
  parameters?: {
    [key: string]: string | undefined;
  };
  example: string;
  response: Record<string, any>;
}

interface Category {
  title: string;
  description: string;
  endpoints: Endpoint[];
}

const endpointCategories = {
  analytics: {
    title: 'Analytics Endpoints',
    description: 'Endpoints for retrieving analytics and statistics',
    endpoints: [
      {
        method: 'GET',
        path: '/api/analytics',
        description: 'Get detailed analytics data with various filters including daily stats, monthly trends, and content type distribution',
        parameters: {
          period: 'Optional. Filter by period (72h, 7d, 30d, all)',
          startDate: 'Optional. Start date for custom range (YYYY-MM-DD)',
          endDate: 'Optional. End date for custom range (YYYY-MM-DD)',
          year: 'Optional. Filter by specific year',
          month: 'Optional. Filter by specific month (1-12)'
        },
        example: '/api/analytics?period=30d',
        response: {
          dailyDownloads: [/* daily download counts */],
          monthlyDownloads: [/* monthly download counts */],
          periodStats: [
            {
              period: '30d',
              content_type: 'base',
              total_downloads: 500000,
              data_transferred: 750000000000,
              unique_items: 1000,
              growth_rate: 25
            }
          ],
          gameTypeStats: {
            base_downloads: 500000,
            update_downloads: 300000,
            dlc_downloads: 200000,
            base_data_size: '750 GB',
            update_data_size: '500 GB',
            dlc_data_size: '250 GB',
            unique_base_games: 1000,
            unique_updates: 800,
            unique_dlc: 500
          },
          dataTransferTrends: [
            {
              date: '2024-03-20',
              data_transferred: 1500000000
            }
          ],
          availableYears: [2024]
        }
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
          all_time: 100000,
          evolution_72h: 25,
          evolution_7d: 15,
          evolution_30d: 10,
          last_updated: '2024-03-20T12:00:00Z'
        }
      }]
  },
  games: {
    title: 'Games Endpoints',
    description: 'Endpoints for retrieving game information',
    endpoints: [
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
        path: '/api/search',
        description: 'Search games by name or TID',
        example: '/api/search?q=mario',
        parameters: {
          q: 'Required. Search query',
          type: 'Optional. Filter by content type (base, update, dlc, all)',
          page: 'Optional. Page number (default: 1)',
          limit: 'Optional. Results per page (default: 24)'
        },
        response: {
          games: [
            {
              tid: '0100000000000000',
              name: 'Super Mario',
              stats: {
                total_downloads: 1000
              }
            }
          ],
          total: 100
        }
      }]
  },
  rankings: {
    title: 'Rankings Endpoints',
    description: 'Endpoints for retrieving game rankings and leaderboards',
    endpoints: [
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
        method: 'GET',
        path: '/api/rankings',
        description: 'Get rankings for multiple games',
        example: '/api/rankings',
        parameters: {
          tids: 'Required. Array of game TIDs',
          period: 'Required. Period (72h, 7d, 30d, all)',
          type: 'Optional. Filter by content type (base, update, dlc, all)',
          page: 'Optional. Page number (default: 1)',
          limit: 'Optional. Results per page (default: 24)'
        },
        response: {
          '0100000000000000': {
            current: 1,
            previous: 2,
            change: 1
          }
        }
      },
      {
        method: 'GET',
        path: '/api/top/[period]',
        description: 'Get top games for a specific period',
        example: '/api/top/72h',
        parameters: {
          period: 'Required. Period (72h, 7d, 30d, all)',
          type: 'Optional. Filter by content type (base, update, dlc, all)',
          page: 'Optional. Page number (default: 1)',
          limit: 'Optional. Results per page (default: 24)'
        },
        response: [
          {
            tid: '0100000000000000',
            stats: {
              per_date: { '2024-03-20': 100 },
              total_downloads: 1000,
              rank_change: 1
            }
          }
        ]
      }]
  },
  system: {
    title: 'System Endpoints',
    description: 'Endpoints for retrieving system information',
    endpoints: [{
      method: 'GET',
      path: '/api/uptime',
      description: 'Get server uptime information',
      example: '/api/uptime',
      response: {
        status: 'ok',
        uptime: 123.45,
        uptime_formatted: '2m 3s'
      }
    }]
  }
};

function EndpointSection({ endpoint, index }: { endpoint: Endpoint; index: number }) {
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

              <h2 className="mt-8">Database Access</h2>
              <p>
                For personal projects or offline analysis, you can download the complete SQLite database directly:
              </p>
              <pre className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg overflow-x-auto">
                {`${typeof window !== 'undefined' ? window.location.origin : ''}/games.db`}
              </pre>
              <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
                The database is updated hourly and contains all game statistics, rankings, and analytics data.
                You can use any SQLite client to query the database directly.
              </p>

              <h2 className="mt-8">Authentication</h2>
              <p>
                No authentication is required to access the API. All endpoints are publicly available.
              </p>

              <h2 className="mt-8">Rate Limiting</h2>
              <p>
                Please be mindful of our rate limits:
              </p>
              <ul className="list-disc list-inside space-y-2">
                <li>100 requests per minute per IP address</li>
                <li>Analytics data is cached for 5 minutes</li>
                <li>Game data is cached for 1 hour</li>
                <li>Rankings are updated hourly</li>
              </ul>

              <h2 className="mt-8">Endpoints</h2>
              {Object.entries(endpointCategories).map(([key, category]) => (
                <div key={key} className="mb-12">
                  <h3 className="text-xl font-semibold mb-4">{category.title}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                    {category.description}
                  </p>
                  <div className="space-y-4">
                    {category.endpoints.map((endpoint, i) => (
                      <EndpointSection key={i} endpoint={endpoint} index={i} />
                    ))}
                  </div>
                </div>
              ))}

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
                Please note that our data collection has the following characteristics:
              </p>
              <ul className="list-disc list-inside space-y-2">
                <li>Initial tracking: September 28-29, 2024</li>
                <li>Continued tracking until December 14, 2024</li>
                <li>Full system deployment: January 5, 2025 onwards</li>
                <li>Data is updated in real-time</li>
                <li>Analytics are pre-calculated hourly</li>
                <li>Rankings are updated hourly</li>
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