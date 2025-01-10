import { Card } from '@/components/ui/card';

const endpoints = [
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
              <pre className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg">
                {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}
              </pre>

              <h2 className="mt-8">Authentication</h2>
              <p>
                No authentication is required to access the API. All endpoints are publicly available.
              </p>

              <h2 className="mt-8">Rate Limiting</h2>
              <p>
                Please be mindful of our rate limits:
              </p>
              <ul>
                <li>100 requests per minute per IP address</li>
                <li>Data is cached for 1 hour</li>
              </ul>

              <h2 className="mt-8">Endpoints</h2>
              <div className="space-y-8">
                {endpoints.map((endpoint, index) => (
                  <div key={index} className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                    <div className="p-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                      <div className="flex items-center gap-3">
                        <span className="px-2 py-1 text-xs font-medium rounded bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300">
                          {endpoint.method}
                        </span>
                        <code className="text-sm">{endpoint.path}</code>
                      </div>
                      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                        {endpoint.description}
                      </p>
                    </div>
                    <div className="p-4">
                      <h4 className="text-sm font-medium mb-2">Example Request</h4>
                      <pre className="bg-slate-100 dark:bg-slate-800 p-3 rounded text-sm overflow-x-auto">
                        {`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}${endpoint.example}`}
                      </pre>

                      <h4 className="text-sm font-medium mt-4 mb-2">Example Response</h4>
                      <pre className="bg-slate-100 dark:bg-slate-800 p-3 rounded text-sm overflow-x-auto">
                        {JSON.stringify(endpoint.response, null, 2)}
                      </pre>
                    </div>
                  </div>
                ))}
              </div>

              <h2 className="mt-8">Error Handling</h2>
              <p>
                The API uses standard HTTP status codes to indicate the success or failure of requests:
              </p>
              <ul>
                <li><code>200</code> - Success</li>
                <li><code>400</code> - Bad Request</li>
                <li><code>404</code> - Not Found</li>
                <li><code>500</code> - Internal Server Error</li>
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