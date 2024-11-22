export const config = {
  api: {
    url: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  },
  gameInfo: {
    workingJsonUrl: process.env.NEXT_PUBLIC_WORKING_JSON_URL || 'https://raw.githubusercontent.com/ghost-land/NX-Missing/refs/heads/main/data/working.json',
    titlesDbUrl: process.env.NEXT_PUBLIC_TITLES_DB_URL || 'https://raw.githubusercontent.com/ghost-land/NX-Missing/refs/heads/main/data/titles_db.txt',
  },
  indexer: {
    reindexInterval: parseInt(process.env.REINDEX_INTERVAL || '3600000', 10), // Default: 1 hour
    dataDir: process.env.DATA_DIR || './data',
  },
} as const;