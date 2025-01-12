import path from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';
import { cache } from 'react';

const DB_PATH = path.join(process.cwd(), 'public', 'games.db');
const DB_CHECK_INTERVAL = 5000; // Check every 5 seconds

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

// Cache the database connection
const getDbConnection = cache(async () => {
  try {
    const db = new Database(DB_PATH, {
      readonly: true,
      fileMustExist: true,
      timeout: 30000,
      verbose: process.env.NODE_ENV === 'development' ? console.log : undefined
    });

    // Enable optimizations
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');
    db.pragma('cache_size = -32000');
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
    db.pragma('wal_autocheckpoint = 1000');
    db.pragma('wal_checkpoint(PASSIVE)');

    return db;
  } catch (error) {
    console.error('[DB] Error creating database connection:', error);
    return null;
  }
});

// Get or initialize database connection
export async function getDatabase(): Promise<Database.Database | null> {
  try {
    // Check if database file exists
    if (!fs.existsSync(DB_PATH)) {
      console.error('[DB] Database file not found:', DB_PATH);
      return null;
    }

    // Get cached database connection
    const db = await getDbConnection();
    if (!db) throw new Error('Failed to create database connection');

    // Return database instance
    return db;
  } catch (error) {
    console.error('[DB] Error getting database connection:', error);
    return null;
  }
}