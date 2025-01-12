import path from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';

const DB_PATH = path.join(process.cwd(), 'public', 'games.db');

// Table for pre-calculated analytics data
const ANALYTICS_TABLES = [
  `CREATE TABLE IF NOT EXISTS analytics_cache (
    period TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    data JSON NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (period, start_date, end_date)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_analytics_cache_dates ON analytics_cache(start_date, end_date)`
];

// Get database last modified time
export function getDbLastModified(): number {
  try {
    const stats = fs.statSync(DB_PATH);
    return stats.mtimeMs;
  } catch (error) {
    console.error('Error getting DB last modified time:', error);
    return 0;
  }
}

// Get database connection
export async function getDatabase(): Promise<Database.Database | null> {
  try {
    // Check if database file exists
    if (!fs.existsSync(DB_PATH)) {
      console.error('[DB] Database file not found:', DB_PATH);
      return null;
    }

    const db = new Database(DB_PATH, {
      readonly: true,
      fileMustExist: true,
      timeout: 30000,
      verbose: process.env.NODE_ENV === 'development' ? console.log : undefined
    });

    // Enable optimizations
    // Set pragmas for optimization
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');
    db.pragma('cache_size = -32000'); // Use 32MB of cache
    db.pragma('temp_store = MEMORY');
    db.pragma('busy_timeout = 30000');
    db.pragma('mmap_size = 30000000000');
    db.pragma('page_size = 4096');
    db.pragma('threads = 4');
    db.pragma('read_uncommitted = 0');
    db.pragma('foreign_keys = ON');
    db.pragma('auto_vacuum = INCREMENTAL');
    db.pragma('secure_delete = OFF');
    db.pragma('locking_mode = NORMAL');
    db.pragma('cache_spill = OFF');
    db.pragma('recursive_triggers = OFF');
    db.pragma('reverse_unordered_selects = OFF');
    db.pragma('checkpoint_fullfsync = OFF');
    db.pragma('trusted_schema = OFF');
    db.pragma('query_only = ON');

    // Run WAL checkpoint
    db.pragma('wal_checkpoint = PASSIVE');

    return db;
  } catch (error) {
    console.error('[DB] Error creating database connection:', error);
    return null;
  }
}