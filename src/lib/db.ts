import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

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
let db: Database.Database | null = null;
let lastDbCheck = 0;
const DB_CHECK_INTERVAL = 60000; // Vérifier toutes les minutes

const DB_PATH = path.join(process.cwd(), 'public', 'games.db');

export async function getDatabase() {
  const now = Date.now();

  // Vérifier si la base de données a été modifiée
  if (db && (now - lastDbCheck) > DB_CHECK_INTERVAL) {
    try {
      const stats = fs.statSync(DB_PATH);
      if (stats.mtimeMs > lastDbCheck) {
        console.log('[DB] Database file has been modified, reloading...');
        db.close();
        db = null;
      }
    } catch (error) {
      console.error('[DB] Error checking database file:', error);
    }
    lastDbCheck = now;
  }

  if (!db) {
    try {
      // Check if database file exists
      if (!fs.existsSync(DB_PATH)) {
        console.error('[DB] Database file not found:', DB_PATH);
        return null;
      }

      db = new Database(DB_PATH, { 
        readonly: false, 
        fileMustExist: true,
        verbose: (sql) => {
          if (process.env.NODE_ENV === 'development' || process.env.DEBUG) {
            console.log(`[DB Query] ${sql}`);
          }
        },
        timeout: 5000
      });
      
      // Basic query to test connection
      try {
        db.prepare('SELECT 1').get();
      } catch (error) {
        console.error('[DB] Connection test failed:', error instanceof Error ? error.message : 'Unknown error');
        db = null;
        return null;
      }

      // Enable WAL mode for better concurrency
      db.pragma('journal_mode = WAL');
      db.pragma('foreign_keys = ON');
      db.pragma('busy_timeout = 10000');
      db.pragma('cache_size = -8000'); // Use 8MB of cache
      db.pragma('synchronous = NORMAL');
      db.pragma('temp_store = MEMORY');
      
      const lastUpdate = db.prepare('SELECT last_updated FROM global_stats WHERE id = 1').get() as { last_updated: string } | undefined;
      console.log('[DB] Connection established successfully');
      console.log('[DB] Last data update:', lastUpdate?.last_updated || 'Never');

      // Add event listener for process exit to close the connection
      process.on('exit', () => {
        if (db) {
          console.log('[DB] Closing connection on exit');
          db.close();
          db = null;
        }
      });

      process.on('SIGINT', () => {
        if (db) {
          db.close();
          db = null;
        }
        process.exit(0);
      });

    } catch (error) {
      console.error('Error initializing database:', error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  }
  return db;
}