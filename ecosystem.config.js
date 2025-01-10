module.exports = {
  apps: [
    {
      name: 'game-stats-web',
      script: 'npm',
      args: 'start',
      node_args: '--trace-warnings --trace-deprecation --trace-sync-io',
      node_args: '--max-old-space-size=4096',
      env: {
        NODE_ENV: 'production',
        DEBUG: '*',
        LOG_LEVEL: 'debug',
        NEXT_TELEMETRY_DEBUG: '1',
        PORT: 3000,
        NEXT_PUBLIC_API_URL: 'http://localhost:3000',
        NEXT_PUBLIC_WORKING_JSON_URL: 'https://raw.githubusercontent.com/ghost-land/NX-Missing/refs/heads/main/data/working.json',
        NEXT_PUBLIC_TITLES_DB_URL: 'https://raw.githubusercontent.com/ghost-land/NX-Missing/refs/heads/main/data/titles_db.txt',
        REINDEX_INTERVAL: '3600000'
      },
      instances: 1,
      exec_mode: 'cluster',
      max_memory_restart: '2G',
      log_type: 'json',
      watch: false,
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss.SSS Z',
      error_file: 'logs/game-stats-web-error.log',
      out_file: 'logs/game-stats-web-out.log',
      merge_logs: true,
      log: true,
      log_level: 'debug',
      max_logs: '10',
      max_size: '10M',
      min_uptime: '5000',
      max_restarts: 10,
      autorestart: true, 
      exp_backoff_restart_delay: 1000,
      wait_ready: true,
      kill_timeout: 3000,
      listen_timeout: 10000,
      trace: true,
      trace_gc: true,
      node_inspector: true,
      deep_monitoring: true,
      event_loop_inspector: true,
      profiling: true,
      output: 'logs/game-stats-web-out.log',
      error: 'logs/game-stats-web-error.log',
      pid: 'logs/game-stats-web.pid',
      timestamp: true
    }
    // Indexer configuration commented out
    // {
    //   name: 'game-stats-indexer',
    //   script: './indexer.js',
    //   env: {
    //     NODE_ENV: 'production',
    //     DATA_DIR: '/path/to/your/data/directory', // Update this path
    //     NEXT_PUBLIC_API_URL: 'http://localhost:3000',
    //     NEXT_PUBLIC_WORKING_JSON_URL: 'https://raw.githubusercontent.com/ghost-land/NX-Missing/refs/heads/main/data/working.json',
    //     NEXT_PUBLIC_TITLES_DB_URL: 'https://raw.githubusercontent.com/ghost-land/NX-Missing/refs/heads/main/data/titles_db.txt'
    //   },
    //   instances: 1,
    //   exec_mode: 'fork',
    //   cron_restart: '0 */1 * * *', // Restart every hour
    //   watch: false,
    //   time: true,
    //   log_date_format: 'YYYY-MM-DD HH:mm:ss',
    //   error_file: 'logs/game-stats-indexer-error.log',
    //   out_file: 'logs/game-stats-indexer-out.log',
    //   merge_logs: true,
    //   autorestart: true
    // }
  ]
};