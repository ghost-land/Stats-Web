import { parentPort } from 'worker_threads';
import Database from 'better-sqlite3';
import path from 'path';

// Initialize database connection
const DB_PATH = path.join(process.cwd(), 'public', 'games.db');
let db: Database.Database | null = null;

try {
  db = new Database(DB_PATH, {
    readonly: true,
    fileMustExist: true,
    timeout: 30000,
  });

  // Enable optimizations
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('cache_size = -32000');
  db.pragma('temp_store = MEMORY');
  db.pragma('mmap_size = 30000000000');
  db.pragma('page_size = 4096');
  db.pragma('busy_timeout = 30000');
  db.pragma('threads = 4');

  // Handle messages from main thread
  parentPort?.on('message', ({ type, query, params = [] }) => {
    try {
      if (!db) {
        throw new Error('Database not initialized');
      }

      const stmt = db.prepare(query);
      let result;
      
      if (type === 'get') {
        result = stmt.get(...params);
      } else {
        result = stmt.all(...params);
      }
      
      parentPort?.postMessage({ success: true, data: result });
    } catch (error) {
      parentPort?.postMessage({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Handle cleanup
  process.on('exit', () => {
    if (db) {
      db.close();
    }
  });

} catch (error) {
  console.error('Error initializing database in worker:', error);
  process.exit(1);
}