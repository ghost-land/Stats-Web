const { DB_PATH, getDatabase } = require('./database');
const fsPromises = require('fs').promises;
const path = require('path');

async function initializeDatabase() {
  // Ensure public directory exists
  await fsPromises.mkdir(path.dirname(DB_PATH), { recursive: true });
  
  const db = getDatabase();
  
  // Drop existing rankings tables to recreate with new schema
  const dropStatements = [
    `DROP TABLE IF EXISTS rankings_history`,
    `DROP TABLE IF EXISTS current_rankings`,
    `DROP TABLE IF EXISTS home_page_rankings`
  ];

  // Add analytics cache table
  dropStatements.push(`DROP TABLE IF EXISTS analytics_cache`);

  // Execute drop statements
  for (const sql of dropStatements) {
    db.prepare(sql).run();
  }

  // Create tables and indexes
  const statements = [
    // Games table
    `CREATE TABLE IF NOT EXISTS games (
      tid TEXT PRIMARY KEY,
      name TEXT,
      version TEXT,
      size INTEGER,
      release_date TEXT,
      is_base BOOLEAN,
      is_update BOOLEAN,
      is_dlc BOOLEAN,
      base_tid TEXT,
      total_downloads INTEGER,
      last_updated TEXT
    )`,

    // Downloads table
    `CREATE TABLE IF NOT EXISTS downloads (
      tid TEXT,
      date TEXT,
      count INTEGER,
      PRIMARY KEY (tid, date),
      FOREIGN KEY (tid) REFERENCES games(tid)
    )`,

    // Rankings tables
    `CREATE TABLE IF NOT EXISTS rankings_history (
      tid TEXT NOT NULL,
      period TEXT NOT NULL CHECK (period IN ('72h', '7d', '30d', 'all')),
      content_type TEXT NOT NULL CHECK (content_type IN ('base', 'update', 'dlc')),
      rank INTEGER NOT NULL,
      downloads INTEGER NOT NULL,
      date TEXT NOT NULL,
      PRIMARY KEY (tid, period, content_type, date),
      FOREIGN KEY (tid) REFERENCES games(tid)
    )`,

    `CREATE TABLE IF NOT EXISTS current_rankings (
      tid TEXT NOT NULL,
      period TEXT NOT NULL CHECK (period IN ('72h', '7d', '30d', 'all')),
      content_type TEXT NOT NULL CHECK (content_type IN ('base', 'update', 'dlc')),
      rank INTEGER NOT NULL,
      previous_rank INTEGER,
      rank_change INTEGER,
      downloads INTEGER NOT NULL,
      previous_downloads INTEGER,
      last_updated TEXT NOT NULL,
      PRIMARY KEY (tid, period, content_type),
      FOREIGN KEY (tid) REFERENCES games(tid)
    )`,

    `CREATE TABLE IF NOT EXISTS home_page_rankings (
      tid TEXT NOT NULL,
      period TEXT NOT NULL CHECK (period IN ('72h', '7d', '30d', 'all')),
      rank INTEGER NOT NULL,
      downloads INTEGER NOT NULL,
      last_updated TEXT NOT NULL,
      PRIMARY KEY (tid, period),
      FOREIGN KEY (tid) REFERENCES games(tid)
    )`,

    // Analytics tables
    `CREATE TABLE IF NOT EXISTS global_stats (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      last_72h INTEGER NOT NULL DEFAULT 0,
      last_7d INTEGER NOT NULL DEFAULT 0,
      last_30d INTEGER NOT NULL DEFAULT 0,
      all_time INTEGER NOT NULL DEFAULT 0,
      last_updated TEXT NOT NULL
    )`,

    `CREATE TABLE IF NOT EXISTS analytics_daily (
      date TEXT NOT NULL,
      total_downloads INTEGER NOT NULL DEFAULT 0,
      unique_games INTEGER NOT NULL DEFAULT 0,
      data_transferred INTEGER NOT NULL DEFAULT 0,
      base_downloads INTEGER NOT NULL DEFAULT 0,
      update_downloads INTEGER NOT NULL DEFAULT 0,
      dlc_downloads INTEGER NOT NULL DEFAULT 0,
      base_data INTEGER NOT NULL DEFAULT 0,
      update_data INTEGER NOT NULL DEFAULT 0,
      dlc_data INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (date)
    )`,

    `CREATE TABLE IF NOT EXISTS analytics_weekly (
      year INTEGER NOT NULL,
      week INTEGER NOT NULL CHECK (week >= 1 AND week <= 53),
      total_downloads INTEGER NOT NULL DEFAULT 0,
      data_transferred INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (year, week)
    )`,

    `CREATE TABLE IF NOT EXISTS analytics_monthly (
      year INTEGER NOT NULL,
      month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
      total_downloads INTEGER NOT NULL DEFAULT 0,
      data_transferred INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (year, month)
    )`,

    `CREATE TABLE IF NOT EXISTS analytics_period_stats (
      period TEXT NOT NULL CHECK (period IN ('72h', '7d', '30d', 'all')),
      content_type TEXT NOT NULL CHECK (content_type IN ('base', 'update', 'dlc', 'all')),
      total_downloads INTEGER NOT NULL DEFAULT 0,
      data_transferred INTEGER NOT NULL DEFAULT 0,
      unique_items INTEGER NOT NULL DEFAULT 0,
      growth_rate REAL DEFAULT 0,
      last_updated TEXT NOT NULL,
      PRIMARY KEY (period, content_type)
    )`,

    // Analytics cache table
    `CREATE TABLE IF NOT EXISTS analytics_cache (
      period TEXT NOT NULL,
      data TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (period)
    )`,

    // Initialize global stats
    `INSERT OR IGNORE INTO global_stats (id, last_72h, last_7d, last_30d, all_time, last_updated)
     VALUES (1, 0, 0, 0, 0, datetime('now'))`,

    // Create indexes
    `CREATE INDEX IF NOT EXISTS idx_analytics_daily_date ON analytics_daily(date)`,
    `CREATE INDEX IF NOT EXISTS idx_analytics_weekly_year ON analytics_weekly(year)`,
    `CREATE INDEX IF NOT EXISTS idx_analytics_monthly_year ON analytics_monthly(year)`,
    `CREATE INDEX IF NOT EXISTS idx_analytics_period_stats_period ON analytics_period_stats(period)`,
    `CREATE INDEX IF NOT EXISTS idx_downloads_date ON downloads(date)`,
    `CREATE INDEX IF NOT EXISTS idx_games_base ON games(is_base)`,
    `CREATE INDEX IF NOT EXISTS idx_games_downloads ON games(total_downloads)`,
    `CREATE INDEX IF NOT EXISTS idx_rankings_history_date ON rankings_history(date)`,
    `CREATE INDEX IF NOT EXISTS idx_rankings_history_period ON rankings_history(period)`,
    `CREATE INDEX IF NOT EXISTS idx_rankings_history_type ON rankings_history(content_type)`,
    `CREATE INDEX IF NOT EXISTS idx_current_rankings_period ON current_rankings(period)`,
    `CREATE INDEX IF NOT EXISTS idx_current_rankings_type ON current_rankings(content_type)`,
    `CREATE INDEX IF NOT EXISTS idx_current_rankings_rank ON current_rankings(rank)`,
    `CREATE INDEX IF NOT EXISTS idx_home_page_rankings_period ON home_page_rankings(period)`,
    `CREATE INDEX IF NOT EXISTS idx_home_page_rankings_rank ON home_page_rankings(rank)`
  ];

  // Execute each statement separately
  for (const sql of statements) {
    db.prepare(sql).run();
  }

  return db;
}

module.exports = {
  initializeDatabase
};